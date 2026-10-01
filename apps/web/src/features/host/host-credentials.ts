import { createContext, useContext } from "react";
import type { HostCredentials } from "../../lib/credentials";

export const HostCredentialsContext = createContext<HostCredentials | null>(null);

export const useHostCredentials = () => {
  const credentials = useContext(HostCredentialsContext);
  if (!credentials) throw new Error("useHostCredentials must be used inside a host session route");
  return credentials;
};
