export type ProofMediaErrorCode =
  | "unsupported_type"
  | "unreadable"
  | "too_long"
  | "too_large"
  | "unsupported_browser"
  | "failed";

export class ProofMediaError extends Error {
  code: ProofMediaErrorCode;

  constructor(code: ProofMediaErrorCode) {
    super(`proof media: ${code}`);
    this.code = code;
  }
}

export class ProofMediaCanceledError extends Error {
  constructor() {
    super("proof media: canceled");
  }
}
