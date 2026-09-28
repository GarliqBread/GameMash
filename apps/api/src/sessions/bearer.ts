const BEARER = /^Bearer (\S+)$/i;

export const bearerToken = (header: string | undefined) => (header ? BEARER.exec(header)?.[1] : undefined);
