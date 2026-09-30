type Window = {
  count: number;
  resetAt: number;
};

export type RateLimiterOptions = {
  max: number;
  windowMs: number;
  maxKeys?: number | undefined;
  now?: (() => number) | undefined;
};

const DEFAULT_MAX_KEYS = 10_000;

export const createRateLimiter = ({
  max,
  windowMs,
  maxKeys = DEFAULT_MAX_KEYS,
  now = Date.now,
}: RateLimiterOptions) => {
  const windows = new Map<string, Window>();

  const current = (key: string) => {
    const window = windows.get(key);
    return window && window.resetAt > now() ? window : undefined;
  };

  const evictOldest = () => {
    const oldest = windows.keys().next();
    if (!oldest.done) windows.delete(oldest.value);
  };

  return {
    isLimited: (key: string) => (current(key)?.count ?? 0) >= max,
    hit: (key: string) => {
      const window = current(key);
      if (window && window.count >= max) return false;
      if (!window && windows.size >= maxKeys) evictOldest();
      windows.set(key, window ? { ...window, count: window.count + 1 } : { count: 1, resetAt: now() + windowMs });
      return true;
    },
  };
};

export type RateLimiter = ReturnType<typeof createRateLimiter>;
