# frappe-saaskit-sdk (`@frappe-saaskit/*`)

TypeScript SDK for building SaaS front ends (signup, workspaces/tenants, billing, backups, support) on top of the **saas_core** Frappe app. The client's types are generated from saas_core's OpenAPI contract (currently **v1.4.0**), and every call goes to `<site>/api/method/saas_core.api.v1.<operation>`.

> **Status: alpha (0.1.0-alpha.0).** The API can change without notice. Packages are distributed as GitHub release tarballs for now (npm follows once the `@frappe-saaskit` scope is registered). You can use it against a site running [saas_core](https://github.com/tridz-dev/saas_core), or against the bundled in-memory mock. See [Known gaps](#known-gaps-and-limitations) before relying on it.

See also: [Note to the Frappe team](#note-to-the-frappe-team).

## Packages

| Package | What it does | Runtime deps / peers |
|---|---|---|
| [`@frappe-saaskit/client`](packages/client/README.md) | Framework-free typed client: plans, templates, auth, tenants, backups, checkout/billing, jobs, support, API tokens, team, admin. Typed errors, safe retries (idempotent requests only), live updates over SSE. | none at runtime |
| [`@frappe-saaskit/react`](packages/react/README.md) | `SaasProvider`, TanStack Query v5 hooks, and a Razorpay Checkout.js helper (`useRazorpayCheckout`). | peers `react >= 18`, `@tanstack/react-query >= 5` |
| [`@frappe-saaskit/vue`](packages/vue/README.md) | Vue 3 composables (no extra query library). | peer `vue >= 3.4` |
| [`@frappe-saaskit/node`](packages/node/README.md) | Node helpers for scripts and CLIs: `createNodeClient`, `tokenFromEnv`, `loadTokenFile`. | none |
| [`@frappe-saaskit/mock`](packages/mock/README.md) | In-memory saas_core lookalike for tests, demos and UI work without a backend (`fetch` mode, or MSW handlers). | `msw` (only the `./node` and `./browser` entries need it) |

All packages are ESM-only.

## Prerequisites

- **Node.js 20 or newer.** CI runs Node 20 and 22. The client's SSE uses `fetch` streaming, so there is no `EventSource` polyfill to install.
- **pnpm 9 or newer** to consume the packages; **pnpm 10** to build from source (pinned in `package.json` via `packageManager`, so `corepack enable` picks it up).
- **For real use:** a Frappe site with the saas_core app installed, reachable from your front end. For cookie auth from the browser, serve your front end from the same origin as the site (or set up CORS with credentials on the site yourself).
- **ESM only.** There is no CommonJS build.
- **For refreshing the contract only:** a checkout of saas_core. The OpenAPI spec is vendored in `spec/v1.yaml`, so building, testing and codegen need no sibling repo.

## Install (alpha tarballs)

The packages are attached as `.tgz` files to GitHub releases of this repo. Add them with URLs and pin the inner client with an override (the other packages depend on `@frappe-saaskit/client`, which is not on the npm registry yet):

```bash
V=0.1.0-alpha.0; R=https://github.com/tridz-dev/frappe-saaskit-sdk/releases/download/v$V
pnpm add $R/frappe-saaskit-client-$V.tgz $R/frappe-saaskit-react-$V.tgz @tanstack/react-query react react-dom
pnpm add -D $R/frappe-saaskit-mock-$V.tgz
```

Then add this to your `package.json` (npm users: top-level `"overrides"` instead of `"pnpm": { "overrides" }`):

```json
{
  "pnpm": {
    "overrides": {
      "@frappe-saaskit/client": "https://github.com/tridz-dev/frappe-saaskit-sdk/releases/download/v0.1.0-alpha.0/frappe-saaskit-client-0.1.0-alpha.0.tgz"
    }
  }
}
```

If the repository or its releases are private, download the `.tgz` files into your project (for example `vendor/saaskit/`) and use `file:` specs, with the same override:

```json
{
  "dependencies": {
    "@frappe-saaskit/client": "file:./vendor/saaskit/frappe-saaskit-client-0.1.0-alpha.0.tgz",
    "@frappe-saaskit/react": "file:./vendor/saaskit/frappe-saaskit-react-0.1.0-alpha.0.tgz"
  },
  "pnpm": { "overrides": { "@frappe-saaskit/client": "file:./vendor/saaskit/frappe-saaskit-client-0.1.0-alpha.0.tgz" } }
}
```

Release assets: `frappe-saaskit-{client,react,vue,node,mock}-<version>.tgz` and `SHA256SUMS`. Bump the version in every URL (and the override) together; versions are lock-stepped. Once the packages are on npm, delete the override and depend on `"@frappe-saaskit/client": "^0.1.0-alpha.0"`.

## Build from source

```bash
git clone https://github.com/tridz-dev/frappe-saaskit-sdk.git
cd frappe-saaskit-sdk
corepack enable          # provides the pinned pnpm
pnpm install
pnpm build               # tsup -> packages/*/dist
pnpm typecheck
pnpm test                # vitest in every package (no backend needed; uses the mock)
pnpm codegen:check       # generated types match spec/v1.yaml
pnpm lint:internal       # no internal paths or agent markers in tracked files
pnpm pack:all            # one .tgz per package in ./out
pnpm smoke:pack          # install those tarballs into an empty project and import them
```

`pnpm-workspace.yaml` already allows the install scripts of `esbuild` and `msw`. If your pnpm still stops with `ERR_PNPM_IGNORED_BUILDS`, run `pnpm approve-builds`. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Usage

`baseUrl` is the **site origin**, for example `https://app.example.com`, not an `/api` path. Use `''` when the front end is served from the same origin as the site.

### Client (framework-free)

```ts
import { createClient, SaasError, ValidationError, ConflictError } from '@frappe-saaskit/client';

const client = createClient({ baseUrl: 'https://app.example.com', auth: { type: 'cookie' } });

// Cookie auth: Frappe needs a CSRF token on every POST. The client fetches it for you before the
// first mutation (from `window.csrf_token`, a `csrfToken` option, or one `me.get()` call), and
// refreshes it once if Frappe rejects it, so a page reload is not a problem.
const me = await client.me.get().catch(() => client.auth.login({ email: 'me@example.com', password: '...' }));

const plans = await client.plans.list();
const free = await client.tenants.checkSlug('acme'); // { available, reason?, suggestion? }

try {
  const { tenant, job } = await client.tenants.create({ slug: 'acme', plan: plans[0].code });
  const sub = client.subscribe({ jobId: job.name }, (e) => console.log(e.type, e.data));
  // later: sub.close()
} catch (e) {
  if (e instanceof ValidationError) console.log(e.fieldErrors); // 400/422
  else if (e instanceof ConflictError) console.log(e.message);  // 409, e.g. slug taken
  else if (e instanceof SaasError) console.log(e.status, e.code, e.requestId);
  else throw e;
}
```

Every method rejects with a `SaasError` subclass: `AuthError` 401 (`CsrfError` for a rejected CSRF token), `ForbiddenError` 403, `NotFoundError` 404, `ConflictError` 409, `ValidationError` 400/417/422, `RateLimitError` 429 (with `retryAfterMs`), `ServerError` 5xx, `NetworkError`. Both saas_core error bodies (`{ error: { code, message, ... } }`) and Frappe-native ones (`exc_type`, `_server_messages`) are mapped. A 2xx response that is not JSON (for example an HTML login page) becomes `SaasError` with `code: 'non_json_response'`, never a raw `SyntaxError`.

**Retries.** GETs are retried up to 3 times on network errors, 429 and 5xx. A mutating request is retried only when saas_core honours its `Idempotency-Key` (signup, tenant create/duplicate/delete/change-plan, backups create/restore, team invite, checkout, subscription cancel, API token create, support ticket create); the same key is reused across attempts. Everything else (login, logout, password reset, `admin.tenants.create`, ...) is sent once, and a 429 there throws `RateLimitError` with `retryAfterMs` for you to act on. Set `retry: { retries: 0 }` to turn retries off.

### React

```tsx
import { createClient } from '@frappe-saaskit/client';
import { SaasProvider, useMe, usePlans, useCheckout, useRazorpayCheckout } from '@frappe-saaskit/react';

const client = createClient({ baseUrl: '', auth: { type: 'cookie' } }); // same origin as the saas_core site

function Pricing() {
  useMe(); // loads the session and the CSRF token needed for the mutations below
  const plans = usePlans();
  const checkout = useCheckout();
  const rzp = useRazorpayCheckout();

  const buy = async (plan: string) => {
    const session = await checkout.mutateAsync({
      plan, interval: 'month', slug: 'acme',
      success_url: location.origin + '/done', cancel_url: location.href,
    });
    if (session.client_payload) await rzp.open(session); // Razorpay Checkout.js, then checkout.verifyPayment
    else if (session.url) location.href = session.url;   // hosted gateways
  };

  if (plans.isLoading) return <p>Loading...</p>;
  return <ul>{plans.data?.map((p) => <li key={p.code}><button onClick={() => buy(p.code)}>{p.title ?? p.code}</button></li>)}</ul>;
}

export const App = () => <SaasProvider client={client}><Pricing /></SaasProvider>;
```

`SaasProvider` mounts its own `QueryClientProvider` unless you pass `queryClient`. `useJob(jobId)` and `useTenantLive(tenantId)` follow provisioning live. The full hook list is in [packages/react/README.md](packages/react/README.md).

### Vue

```ts
import { createApp } from 'vue';
import { createClient } from '@frappe-saaskit/client';
import { SAAS_CLIENT_KEY } from '@frappe-saaskit/vue';

const app = createApp(App);
app.provide(SAAS_CLIENT_KEY, createClient({ baseUrl: '', auth: { type: 'cookie' } }));
// in a component: const { data: plans, loading } = usePlans(); const { mutate } = useCheckout();
```

See [packages/vue/README.md](packages/vue/README.md).

### Node scripts and CLIs

```ts
import { createClient } from '@frappe-saaskit/client';
import { createNodeClient, tokenFromEnv } from '@frappe-saaskit/node';

// Frappe user API key + secret (User > API Access), sent as `Authorization: token key:secret`
const client = createClient({ baseUrl: 'https://app.example.com', auth: { type: 'apiKey', key: `${process.env.API_KEY}:${process.env.API_SECRET}` } });

// Or the same `key:secret`, read from SAASKIT_TOKEN
const fromEnv = createNodeClient({ baseUrl: 'https://app.example.com', token: tokenFromEnv() });
```

saas_core's personal access tokens (`apiTokens.create`) are not accepted as bearer tokens yet, see [Known gaps](#known-gaps-and-limitations).

### Mock backend (no saas_core needed)

`@frappe-saaskit/mock` gives you an in-memory backend with seeded data: user `demo@example.com`, plans `free`/`pro`/`business`, tenant `acme`, invoices and jobs. Provisioning jobs advance on a timer and emit SSE events.

```ts
import { createClient } from '@frappe-saaskit/client';
import { createMockFetch } from '@frappe-saaskit/mock';

const fetch = createMockFetch({ stepMs: 0 });          // no network, no MSW
const client = createClient({ baseUrl: 'http://localhost', auth: { type: 'cookie' }, fetch });

await client.me.get();                                 // logged in by default (loggedIn: false to start logged out)
const { job } = await client.tenants.create({ slug: 'newco', plan: 'pro' });
fetch.reset();                                         // back to the seed data between tests
```

The package root is browser-safe (no `msw/node`). For MSW use `createMockServer()` from `@frappe-saaskit/mock/node` in Node tests, or `createMockWorker()` from `@frappe-saaskit/mock/browser` for a browser demo. Options such as `signupMode`, `admin`, `capacityExhausted` and `forceUnauthenticated` simulate the error paths. See [packages/mock/README.md](packages/mock/README.md).

## Codegen: where the types come from

`packages/client/src/generated/schema.d.ts` is generated by [`openapi-typescript`](https://openapi-ts.dev) from `spec/v1.yaml`, a byte-for-byte copy of saas_core's `openapi/v1.yaml` (provenance, commit and sha256 in `spec/SOURCE.md`). The generated file is committed. No sibling checkout is needed.

```bash
pnpm codegen                      # regenerate schema.d.ts from spec/v1.yaml
pnpm codegen:check                # exit 1 if schema.d.ts differs from the spec, or the spec is missing
pnpm spec:sync ../saas_core       # refresh spec/v1.yaml and spec/SOURCE.md from a saas_core checkout
```

`codegen:check` runs in CI on every push. A missing spec is always an error.

## Auth modes

| `auth` | Sends | Use for |
|---|---|---|
| `{ type: 'cookie' }` | the Frappe `sid` cookie (`credentials: 'include'`) plus `X-Frappe-CSRF-Token` on POSTs | browser apps on the same site |
| `{ type: 'apiKey', key, header? }` | `Authorization: token <key>` (use `key:secret` for Frappe user API keys), or `<header>: <key>` | servers and scripts |
| `{ type: 'bearer', getToken }` | `Authorization: Bearer <token>` | **Unsupported.** saas_core v1.x does not validate bearer tokens. Deprecated; logs a warning once. |

`@frappe-saaskit/node`'s `loadTokenFile(path)` warns if the file can be read by group or other users. Never put tokens in front-end code.

## Architecture

The package map, the request lifecycle (CSRF, auth, error envelope), the Razorpay checkout sequence and how the mock is wired in are drawn as SVG diagrams in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Known gaps and limitations

This is an **alpha**. Breaking changes will come without a deprecation period. These gaps depend on saas_core, not on the SDK:

1. **Personal access tokens / Bearer.** saas_core issues API tokens (`apiTokens.create`) but no request hook validates `Authorization: Bearer`. The SDK marks `bearer` unsupported until that ships.
2. **Idempotency on `admin.tenants.create` and `auth.login`.** saas_core does not deduplicate them, so the SDK never retries them. Once the handlers accept `Idempotency-Key`, they join the retry allowlist.
3. **Product-specific names in the spec.** The generated types carry a product-specific signature header and setup-callback operation name taken from the contract (search `schema.d.ts` for the setup callback); they should be renamed to generic names upstream.
4. **Error envelope.** Some Frappe-native exceptions still return `exc_type`/`_server_messages` instead of the v1 `error` schema. The SDK maps both for now.
5. **CSRF for guests.** The SDK's CSRF bootstrap relies on `auth.me` returning a `csrf_token` for guest sessions, which still needs confirming. If `me` fails, the SDK proceeds without a token.
6. **No public contract target.** The opt-in contract test (`SAASCORE_URL=... pnpm test:contract`) needs a reachable saas_core site; there is no public demo yet.
7. **saas_core visibility.** Links to `tridz-dev/saas_core` assume it becomes public with a license.

SDK-side limits:

- **Backend coupling.** It only works against saas_core's v1 API; generated types track contract **1.4.0**.
- **ESM only**, no CommonJS build.
- **The mock is a simulation**, not a contract test. Code that passes against the mock can still fail against a real site.

## Note to the Frappe team

This SDK is an early, opinionated attempt at a typed front-end client for a Frappe-based SaaS control plane (signup, workspaces, billing, backups, support). It is an alpha and we would rather get your feedback now than harden the wrong shape. We would especially like your view on:

- the API shape of the client and the React/Vue bindings;
- running everything over Frappe sessions (cookie + CSRF) and `token key:secret`, and what you would do differently;
- whether parts of this belong upstream, for example in frappe-ui or frappe-js-sdk, instead of a separate package.

Please read [Known gaps](#known-gaps-and-limitations) first. Contact: open an issue on this repository.

## Repo rule: no Frappe Cloud credentials

The SDK talks only to the saas_core API. Frappe Cloud credentials or hosts must never appear in any package, test or config, and `pnpm lint:fc` enforces this. Anything that needs Frappe Cloud runs on the server side, inside saas_core.

## Related

- [tridz-dev/saas_core](https://github.com/tridz-dev/saas_core): the backend Frappe app and the OpenAPI contract
- [tridz-dev/frappe-saaskit-starter](https://github.com/tridz-dev/frappe-saaskit-starter): a starter app built on this SDK

## License

[MIT](LICENSE), Copyright (c) 2026 Tridz Technologies.
