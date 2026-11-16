export class SaasError extends Error {
  constructor(message: string, public status?: number, public code?: string, public fieldErrors?: Record<string, string>, public requestId?: string) { super(message); this.name = new.target.name; }
  /** @deprecated alias of fieldErrors */
  get details() { return this.fieldErrors; }
}
export class NetworkError extends SaasError {}
export class AuthError extends SaasError {}
export class ForbiddenError extends SaasError {}
export class NotFoundError extends SaasError {}
export class ValidationError extends SaasError {}
export class ConflictError extends SaasError {}
export class RateLimitError extends SaasError { retryAfterMs?: number }
export class ServerError extends SaasError {}
