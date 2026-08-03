export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  // Optional structured data merged into the error response body alongside
  // `message` (see errorHandler.middleware.ts) — additive only. Every
  // existing 2-arg/3-arg call site is unaffected: details stays undefined
  // and nothing extra is added to the response.
  public readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    message: string,
    isOperational = true,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
