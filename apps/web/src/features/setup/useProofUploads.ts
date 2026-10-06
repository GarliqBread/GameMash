import type { ApiError } from "@gamemash/shared";
import { useEffect, useRef } from "react";
import { create } from "zustand";
import { ApiRequestError } from "../../lib/api";
import { toApiError } from "../../lib/errors";
import { uploadProofMedia } from "../../lib/images";
import { compressProof } from "../../lib/proof-media/compress-proof";
import { ProofMediaCanceledError, ProofMediaError, type ProofMediaErrorCode } from "../../lib/proof-media/errors";
import type { CompressedProof, VideoSourceInfo } from "../../lib/proof-media/types";
import { useHostCredentials } from "../host/host-credentials";
import { useRememberImage } from "./useImageUploads";

const RATE_LIMITED_STATUS = 429;
const RETRY_DELAYS_MS = [2000, 5000, 10_000];
const PROGRESS_STEP = 0.01;

export type UploadedProof =
  | { kind: "image"; assetId: string; width: number; height: number }
  | {
      kind: "video";
      assetId: string;
      posterAssetId: string;
      width: number;
      height: number;
      durationMs: number;
      hasAudio: boolean;
      loop: boolean;
    };

export type ProofFailure = { kind: "media"; code: ProofMediaErrorCode } | { kind: "api"; error: ApiError };

export type ActiveProofJob = {
  phase: "compressing" | "uploading";
  isSecondPhoto: boolean;
  fileName: string;
  sourceBytes: number;
  isVideo: boolean;
  source: VideoSourceInfo | null;
  progress: number;
};

export type ProofJob = ActiveProofJob | { phase: "failed"; failure: ProofFailure; isSecondPhoto: boolean };

export type ProofResult = { sourceBytes: number; bytes: number; height: number; wasReencoded: boolean };

type Running = { cancel: () => void };

type ProofUploadStore = {
  jobs: Record<string, ProofJob | undefined>;
  results: Record<string, ProofResult | undefined>;
};

const EMPTY_STORE: ProofUploadStore = { jobs: {}, results: {} };

const useProofUploadStore = create<ProofUploadStore>(() => EMPTY_STORE);

const isActive = (job: ProofJob | undefined) => job !== undefined && job.phase !== "failed";

export const useProofJob = (questionId: string) => useProofUploadStore((store) => store.jobs[questionId]);

export const useProofResult = (questionId: string) => useProofUploadStore((store) => store.results[questionId]);

export const useIsProofUploading = () =>
  useProofUploadStore((store) => Object.values(store.jobs).some((job) => isActive(job)));

const setJob = (questionId: string, job: ProofJob | undefined) =>
  useProofUploadStore.setState((store) => ({ jobs: { ...store.jobs, [questionId]: job } }));

const setResult = (questionId: string, result: ProofResult | undefined) =>
  useProofUploadStore.setState((store) => ({ results: { ...store.results, [questionId]: result } }));

const patchJob = (questionId: string, patch: Partial<ActiveProofJob>) =>
  useProofUploadStore.setState((store) => {
    const job = store.jobs[questionId];
    if (!job || job.phase === "failed") return store;
    const isSame =
      (patch.phase === undefined || patch.phase === job.phase) &&
      (patch.source === undefined || patch.source === job.source) &&
      (patch.progress === undefined || Math.abs(patch.progress - job.progress) < PROGRESS_STEP);
    return isSame ? store : { jobs: { ...store.jobs, [questionId]: { ...job, ...patch } } };
  });

const isCanceled = (error: unknown) =>
  error instanceof ProofMediaCanceledError || (error instanceof DOMException && error.name === "AbortError");

const toFailure = (error: unknown): ProofFailure =>
  error instanceof ProofMediaError ? { kind: "media", code: error.code } : { kind: "api", error: toApiError(error) };

const isRateLimited = (error: unknown) => error instanceof ApiRequestError && error.status === RATE_LIMITED_STATUS;

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });

const isVideoFile = (file: File) => file.type.startsWith("video/") || file.type === "";

const toResult = (file: File, compressed: CompressedProof): ProofResult => ({
  sourceBytes: file.size,
  bytes: compressed.file.size,
  height: Math.min(compressed.width, compressed.height),
  wasReencoded: compressed.kind === "video" ? compressed.reencoded : compressed.file !== file,
});

export const useProofUploads = () => {
  const credentials = useHostCredentials();
  const remember = useRememberImage();
  const running = useRef(new Map<string, Running>());

  useEffect(() => {
    const current = running.current;
    return () => {
      for (const job of current.values()) job.cancel();
      current.clear();
      useProofUploadStore.setState(EMPTY_STORE);
    };
  }, []);

  const uploadWithRetry = async (media: Blob, onProgress: (progress: number) => void, signal: AbortSignal) => {
    for (const delay of [0, ...RETRY_DELAYS_MS]) {
      if (delay > 0) await wait(delay, signal);
      try {
        return await uploadProofMedia(credentials, media, onProgress, signal);
      } catch (error) {
        if (!isRateLimited(error) || delay === RETRY_DELAYS_MS.at(-1)) throw error;
      }
    }
    throw new ApiRequestError({ code: "rate_limited" }, RATE_LIMITED_STATUS);
  };

  const uploadOne = async (media: Blob, onProgress: (progress: number) => void, signal: AbortSignal) => {
    const { imageId, url } = await uploadWithRetry(media, onProgress, signal);
    signal.throwIfAborted();
    await remember({ id: imageId, url });
    signal.throwIfAborted();
    return imageId;
  };

  const start = async (
    questionId: string,
    file: File,
    isSecondPhoto: boolean,
    onUploaded: (proof: UploadedProof) => void,
  ) => {
    running.current.get(questionId)?.cancel();
    const controller = new AbortController();
    const { signal } = controller;
    let cancelTask = () => {};
    const entry: Running = {
      cancel: () => {
        cancelTask();
        controller.abort();
      },
    };
    const isCurrent = () => running.current.get(questionId) === entry;
    const report = (patch: Partial<ActiveProofJob>) => {
      if (isCurrent()) patchJob(questionId, patch);
    };
    running.current.set(questionId, entry);
    setJob(questionId, {
      phase: "compressing",
      isSecondPhoto,
      fileName: file.name,
      sourceBytes: file.size,
      isVideo: isVideoFile(file),
      source: null,
      progress: 0,
    });
    const task = compressProof(file, {
      onProgress: (progress) => report({ progress }),
      onSource: (source) => report({ source }),
    });
    cancelTask = task.cancel;

    const upload = async (compressed: CompressedProof): Promise<UploadedProof> => {
      signal.throwIfAborted();
      report({ phase: "uploading", progress: 0 });
      const onProgress = (progress: number) => report({ progress });
      if (compressed.kind === "image") {
        const assetId = await uploadOne(compressed.file, onProgress, signal);
        return { kind: "image", assetId, width: compressed.width, height: compressed.height };
      }
      const posterAssetId = await uploadOne(compressed.poster, () => {}, signal);
      const assetId = await uploadOne(compressed.file, onProgress, signal);
      const { width, height, durationMs, hasAudio, loop } = compressed;
      return { kind: "video", assetId, posterAssetId, width, height, durationMs, hasAudio, loop };
    };

    try {
      const compressed = await task.result;
      const uploaded = await upload(compressed);
      if (!isCurrent() || signal.aborted) return;
      onUploaded(uploaded);
      if (compressed.kind === "video") setResult(questionId, toResult(file, compressed));
      setJob(questionId, undefined);
    } catch (error) {
      if (isCurrent())
        setJob(
          questionId,
          isCanceled(error) ? undefined : { phase: "failed", failure: toFailure(error), isSecondPhoto },
        );
    } finally {
      if (isCurrent()) running.current.delete(questionId);
    }
  };

  const cancel = (questionId: string) => {
    running.current.get(questionId)?.cancel();
    running.current.delete(questionId);
    setJob(questionId, undefined);
  };

  return {
    start,
    cancel,
    cancelAll: (questionIds: string[]) => {
      for (const questionId of questionIds) {
        cancel(questionId);
        setResult(questionId, undefined);
      }
    },
    dismiss: (questionId: string) => setJob(questionId, undefined),
    forget: (questionId: string) => setResult(questionId, undefined),
  };
};

export type ProofUploads = ReturnType<typeof useProofUploads>;
