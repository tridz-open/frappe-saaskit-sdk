import { AuthError, ConflictError, ForbiddenError, NetworkError, NotFoundError, RateLimitError, SaasError, ServerError, ValidationError } from './errors';
import type { AuthStrategy, RetryOptions } from './client';

export interface HttpOptions {
  baseUrl: string;
  auth?: AuthStrategy;
  fetch?: typeof fetch;
  retry?: RetryOptions;
}
export interface RequestOptions { body?: unknown; query?: Record<string, string | undefined>; signal?: AbortSignal; }

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function backoff(attempt: number, r: RetryOptions | undefined): number {
  const base = r?.baseDelayMs ?? 250;
  const max = r?.maxDelayMs ?? 5000;
  const exp = Math.min(max, base * 2 ** attempt);
  return Math.round(exp / 2 + Math.random() * (exp / 2));
}

export function newKey(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function mapError(status: number, body: unknown, headers: Headers): SaasError {
  // Frappe wraps whitelisted-method responses as {message: <payload>}; unwrap before reading `error`.
  let root: unknown = body;
  if (root && typeof root === 'object' && !('error' in root) && 'message' in root) {
    const m = (root as { message?: unknown }).message;
    if (m && typeof m === 'object') root = m;
  }
  const eb = ((root && typeof root === 'object' ? (root as { error?: unknown }).error : undefined) ?? {}) as { code?: string; message?: string; field_errors?: Record<string, string>; request_id?: string; retry_after?: number };
  const args = [eb.message ?? `HTTP ${status}`, status, eb.code, eb.field_errors, eb.request_id] as const;
  if (status === 401) return new AuthError(...args);
  if (status === 403) return new ForbiddenError(...args);
  if (status === 404) return new NotFoundError(...args);
  if (status === 409) return new ConflictError(...args);
  if (status === 422 || status === 400) return new ValidationError(...args);
  if (status === 429) {
    const e = new RateLimitError(...args);
    const ra = headers.get('Retry-After');
    if (ra) {
      const secs = Number(ra);
      if (Number.isFinite(secs)) e.retryAfterMs = secs * 1000;
      else { const d = Date.parse(ra); if (!Number.isNaN(d)) e.retryAfterMs = Math.max(0, d - Date.now()); }
    } else if (typeof eb.retry_after === 'number') e.retryAfterMs = eb.retry_after * 1000;
    return e;
  }
  if (status >= 500) return new ServerError(...args);
  return new SaasError(...args);
}

export function createHttp(o: HttpOptions) {
  const f = o.fetch ?? ((...a: Parameters<typeof fetch>) => globalThis.fetch(...a));
  const root = `${o.baseUrl.replace(/\/+$/, '')}/api/method/saas_core.api.v1.`;
  let csrf: string | undefined;
  const retries = o.retry?.retries ?? 3;

  async function authHeaders(h: Headers): Promise<void> {
    const a = o.auth;
    if (!a || a.type === 'cookie') return;
    if (a.type === 'apiKey') {
      if (a.header) h.set(a.header, a.key); else h.set('Authorization', `token ${a.key}`);
    } else {
      const t = await a.getToken();
      if (t) h.set('Authorization', `Bearer ${t}`);
    }
  }

  async function raw(method: string, path: string, opts: RequestOptions, key?: string, extra?: Record<string, string>): Promise<Response> {
    const h = new Headers({ Accept: 'application/json', ...extra });
    await authHeaders(h);
    if (key) h.set('Idempotency-Key', key);
    let body: string | undefined;
    if (opts.body !== undefined) { h.set('Content-Type', 'application/json'); body = JSON.stringify(opts.body); }
    let url = root + path;
    if (method !== 'GET' && csrf && o.auth?.type === 'cookie') h.set('X-Frappe-CSRF-Token', csrf);
    const q = Object.entries(opts.query ?? {}).filter(([, v]) => v !== undefined) as [string, string][];
    if (q.length) url += `?${new URLSearchParams(q).toString()}`;
    const init: RequestInit = { method, headers: h, body, signal: opts.signal };
    if (o.auth?.type === 'cookie') init.credentials = 'include';
    try {
      return await f(url, init);
    } catch (e) {
      if (opts.signal?.aborted) throw e;
      throw new NetworkError(e instanceof Error ? e.message : 'Network error');
    }
  }

  /** Authenticated raw fetch for streaming (no retry). */
  async function stream(path: string, query: Record<string, string>, signal: AbortSignal, lastEventId?: string): Promise<Response> {
    const res = await raw('GET', path, { query, signal }, undefined, { Accept: 'text/event-stream', ...(lastEventId ? { 'Last-Event-ID': lastEventId } : {}) });
    if (!res.ok) throw mapError(res.status, await res.json().catch(() => undefined), res.headers);
    return res;
  }

  async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const mutating = method !== 'GET';
    const key = mutating ? newKey() : undefined; // reused across retries
    for (let attempt = 0; ; attempt++) {
      let err: SaasError;
      try {
        const res = await raw(method, path, opts, key);
        if (res.ok) {
          if (res.status === 204) return undefined as T;
          const text = await res.text();
          if (!text) return undefined as T;
          const parsed = JSON.parse(text) as { message?: T };
          return (parsed && typeof parsed === 'object' && 'message' in parsed ? parsed.message : parsed) as T;
        }
        err = mapError(res.status, await res.json().catch(() => undefined), res.headers);
      } catch (e) {
        if (!(e instanceof NetworkError)) throw e;
        err = e;
      }
      const retryable = err instanceof NetworkError || err instanceof ServerError || err instanceof RateLimitError;
      if (!retryable || attempt >= retries) throw err;
      const wait = err instanceof RateLimitError && err.retryAfterMs !== undefined ? err.retryAfterMs : backoff(attempt, o.retry);
      await sleep(wait);
    }
  }

  /** Binary/redirect-free GET returning the raw response (e.g. invoice PDF). */
  async function download(path: string, query: Record<string, string>): Promise<Blob> {
    const res = await raw('GET', path, { query });
    if (!res.ok) throw mapError(res.status, await res.json().catch(() => undefined), res.headers);
    return res.blob();
  }
  return { request, stream, download, setCsrf: (t: string | undefined) => { csrf = t; } };
}
export type Http = ReturnType<typeof createHttp>;
