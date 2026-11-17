# @frappe-saaskit/client

A typed client for the [saas_core](https://github.com/tridz-dev/saas_core) v1 API. It has no framework dependency and no runtime dependencies. It runs in browsers and in Node 20+.

> Alpha. Not published to npm yet. See the [repo README](../../README.md) for setup.

```ts
import { createClient, SaasError } from '@frappe-saaskit/client';

const client = createClient({
  baseUrl: 'https://app.example.com',   // site origin; '' for same-origin
  auth: { type: 'cookie' },             // or { type: 'apiKey', key } / { type: 'bearer', getToken }
  retry: { retries: 3 },                // network errors, 429 and 5xx; POSTs reuse one Idempotency-Key
});

await client.me.get();                  // cookie auth: loads the CSRF token needed for POSTs
const tenants = await client.tenants.list();
```

Namespaces: `plans`, `templates`, `auth`, `me`, `apiTokens`, `team`, `config`, `admin.tenants`, `tenants`, `backups`, `checkout`, `subscription`, `invoices`, `paymentMethods`, `jobs`, `support`, plus `subscribe()` for SSE job and tenant events. Every call rejects with a `SaasError` subclass (`AuthError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `ValidationError`, `RateLimitError`, `ServerError`, `NetworkError`).

Generated OpenAPI types are re-exported as `paths`, `components` and `operations`. The friendly aliases (`Plan`, `Tenant`, `Job`, ...) are in `src/types.ts`.
