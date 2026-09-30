import type { ImageListResponse } from "@gamemash/shared";
import type { QuestionImage } from "@gamemash/ui";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useIntl } from "react-intl";
import { fetchImages } from "../../lib/images";
import { useHostCredentials } from "../host/host-credentials";

const URL_REFRESH_MS = 30 * 60 * 1000;

export const sessionImagesKey = (sessionId: string) => ["session-images", sessionId];

const toUrls = (data: ImageListResponse) => new Map(data.images.map((image) => [image.id, image.url]));

export const useSessionImages = (isEnabled = true) => {
  const credentials = useHostCredentials();
  return useQuery({
    queryKey: sessionImagesKey(credentials.sessionId),
    queryFn: () => fetchImages(credentials),
    select: toUrls,
    staleTime: URL_REFRESH_MS,
    refetchInterval: URL_REFRESH_MS,
    enabled: isEnabled,
    retry: false,
  });
};

export const useQuestionImages = (ids: string[]): QuestionImage[] => {
  const intl = useIntl();
  const { data: urls } = useSessionImages(ids.length > 0);
  return ids.flatMap((id, index) => {
    const url = urls?.get(id);
    if (!url) return [];
    return [{ id, url, alt: intl.formatMessage({ id: "quiz.imageAlt" }, { position: index + 1, count: ids.length }) }];
  });
};

export const usePreloadImages = (ids: string[]) => {
  const { data: urls } = useSessionImages(ids.length > 0);
  const key = ids.flatMap((id) => urls?.get(id) ?? []).join(" ");

  useEffect(() => {
    if (!key) return;
    for (const url of key.split(" ")) new Image().src = url;
  }, [key]);
};
