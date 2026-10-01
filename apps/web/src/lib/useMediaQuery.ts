import { useCallback, useMemo, useSyncExternalStore } from "react";

export const useMediaQuery = (query: string) => {
  const media = useMemo(() => window.matchMedia(query), [query]);
  const subscribe = useCallback(
    (onChange: () => void) => {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [media],
  );
  return useSyncExternalStore(subscribe, () => media.matches);
};

export const DESKTOP_QUERY = "(min-width: 900px)";
