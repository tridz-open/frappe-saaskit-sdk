export class SaasError extends Error {
  /** First characters of an unexpected (non-JSON) response body, when available. */
  detail?: string;

  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public fieldErrors?: Record<string, string>,
    public requestId?: string,
  ) {
    super(message);
    this.name = new.target.name;
  }

  /** @deprecated alias of fieldErrors */
  get details() {
    return this.fieldErrors;
  }
}
export class NetworkError extends SaasError {}
export class AuthError extends SaasError {}
/** Frappe rejected the request because the CSRF token was missing or stale. */
export class CsrfError extends AuthError {}
export class ForbiddenError extends SaasError {}
export class NotFoundError extends SaasError {}
export class ValidationError extends SaasError {}
export class ConflictError extends SaasError {}
export class RateLimitError extends SaasError {
  retryAfterMs?: number;
}
export class ServerError extends SaasError {}
