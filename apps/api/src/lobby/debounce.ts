export const createDebounce = (
  delayMs: number,
  canSchedule: (key: string) => boolean,
  run: (key: string) => Promise<void>,
) => {
  const pending = new Map<string, NodeJS.Timeout>();

  const fire = (key: string) => {
    pending.delete(key);
    void run(key);
  };

  const schedule = (key: string) => {
    if (!canSchedule(key) || pending.has(key)) return;
    pending.set(
      key,
      setTimeout(() => fire(key), delayMs),
    );
  };

  const cancel = (key: string) => {
    clearTimeout(pending.get(key));
    pending.delete(key);
  };

  const clear = () => {
    for (const timer of pending.values()) clearTimeout(timer);
    pending.clear();
  };

  return { schedule, cancel, clear };
};
