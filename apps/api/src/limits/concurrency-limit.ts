export type Slot<T> = { ok: true; value: T } | { ok: false };

export const createConcurrencyLimit = (max: number) => {
  let active = 0;

  const run = async <T>(task: () => Promise<T>): Promise<Slot<T>> => {
    if (active >= max) return { ok: false };
    active += 1;
    try {
      return { ok: true, value: await task() };
    } finally {
      active -= 1;
    }
  };

  return { run };
};
