import { useEffect, useRef, useState } from "react";
import { resizeAvatar } from "../../lib/avatar";

export type PhotoState =
  | { status: "empty" }
  | { status: "processing" }
  | { status: "ready"; blob: Blob; previewUrl: string }
  | { status: "failed" };

export const usePhotoPicker = () => {
  const [photo, setPhoto] = useState<PhotoState>({ status: "empty" });
  const latestRequest = useRef(0);

  useEffect(
    () => () => {
      if (photo.status === "ready") URL.revokeObjectURL(photo.previewUrl);
    },
    [photo],
  );

  useEffect(
    () => () => {
      latestRequest.current += 1;
    },
    [],
  );

  const select = async (file: File) => {
    const request = latestRequest.current + 1;
    latestRequest.current = request;
    setPhoto({ status: "processing" });
    try {
      const blob = await resizeAvatar(file);
      if (request === latestRequest.current) setPhoto({ status: "ready", blob, previewUrl: URL.createObjectURL(blob) });
    } catch {
      if (request === latestRequest.current) setPhoto({ status: "failed" });
    }
  };

  return { photo, select };
};
