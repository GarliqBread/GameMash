type Listener = (sessionId: string) => void;

export const createNotifier = () => {
  const listeners = new Set<Listener>();
  return {
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notify: (sessionId: string) => {
      for (const listener of listeners) listener(sessionId);
    },
  };
};

export type Notifier = ReturnType<typeof createNotifier>;
