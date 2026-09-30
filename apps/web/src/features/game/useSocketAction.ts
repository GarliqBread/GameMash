import type { ApiError, SocketAck } from "@gamemash/shared";
import { useState } from "react";

export const useSocketAction = <Args extends unknown[]>(action: (...args: Args) => Promise<SocketAck>) => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const run = async (...args: Args) => {
    setIsPending(true);
    setError(null);
    const result = await action(...args);
    setIsPending(false);
    setError(result.ok ? null : result.error);
    return result;
  };

  return { run, isPending, error };
};
