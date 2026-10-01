const parseOrigin = (value: string | undefined) => {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const publicOrigin = () => parseOrigin(import.meta.env.VITE_PUBLIC_URL) ?? window.location.origin;

export const joinUrl = (roomCode: string) => `${publicOrigin()}/join/${roomCode}`;

export const displayHost = () => new URL(publicOrigin()).host;
