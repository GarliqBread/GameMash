import type { QuizProof } from "@gamemash/games/config";
import { useEffect, useState } from "react";
import { usePreloadImages, useSessionImages } from "./useQuestionImages";

type Preload = { controller: AbortController; objectUrl: string | null };

const RELEASE_DELAY_MS = 1000;

const preloads = new Map<string, Preload>();
const inUse = new Map<string, number>();

const release = (assetId: string) => {
  const preload = preloads.get(assetId);
  if (!preload) return;
  preloads.delete(assetId);
  preload.controller.abort();
  if (preload.objectUrl) URL.revokeObjectURL(preload.objectUrl);
};

const preloadVideo = (assetId: string, url: string) => {
  for (const other of [...preloads.keys()]) if (other !== assetId) release(other);
  if (preloads.has(assetId)) return;
  const preload: Preload = { controller: new AbortController(), objectUrl: null };
  preloads.set(assetId, preload);
  fetch(url, { signal: preload.controller.signal })
    .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(`video ${response.status}`))))
    .then((blob) => {
      if (preloads.get(assetId) === preload) preload.objectUrl = URL.createObjectURL(blob);
    })
    .catch(() => {
      if (preloads.get(assetId) === preload) preloads.delete(assetId);
    });
};

const takeSource = (assetId: string, url: string) => {
  const objectUrl = preloads.get(assetId)?.objectUrl;
  if (objectUrl) return objectUrl;
  release(assetId);
  return url;
};

export const proofImageIds = (proof: QuizProof | null) => {
  if (!proof) return [];
  return proof.kind === "video" ? [proof.posterAssetId] : proof.photos.map((photo) => photo.assetId);
};

export const useStageMediaUrls = (proof: QuizProof | null) => {
  const { data: urls } = useSessionImages(proof !== null);
  return (id: string) => urls?.get(id);
};

export const useProofPreload = (proof: QuizProof | null) => {
  const urlOf = useStageMediaUrls(proof);
  usePreloadImages(proofImageIds(proof));
  const assetId = proof?.kind === "video" ? proof.assetId : undefined;
  const videoUrl = assetId ? urlOf(assetId) : undefined;
  useEffect(() => {
    if (assetId && videoUrl) preloadVideo(assetId, videoUrl);
  }, [assetId, videoUrl]);
};

export const useRevealVideo = (assetId: string | undefined, url: string | undefined) => {
  const [source, setSource] = useState(() => (assetId && url ? takeSource(assetId, url) : undefined));

  useEffect(() => {
    if (source === undefined && assetId && url) setSource(takeSource(assetId, url));
  }, [source, assetId, url]);

  useEffect(() => {
    if (!assetId) return;
    inUse.set(assetId, (inUse.get(assetId) ?? 0) + 1);
    return () => {
      inUse.set(assetId, (inUse.get(assetId) ?? 1) - 1);
      setTimeout(() => {
        if ((inUse.get(assetId) ?? 0) > 0) return;
        inUse.delete(assetId);
        release(assetId);
      }, RELEASE_DELAY_MS);
    };
  }, [assetId]);

  return source;
};
