# frappe-saaskit-sdk (`@frappe-saaskit/*`)

TypeScript SDK for building SaaS front ends (signup, workspaces/tenants, billing, backups, support) on top of the **saas_core** Frappe app. The client's types are generated from saas_core's OpenAPI contract (currently **v1.4.0**), and every call goes to `<site>/api/method/saas_core.api.v1.<operation>`.

> **Status: alpha (0.0.x).** The API can change without notice and nothing is published to npm yet. You can only use it against a site running [saas_core](https://github.com/tridz-dev/saas_core), or against the bundled in-memory mock. See [Status and known limitations](#status-and-known-limitations) before relying on it.

## Packages

| Package | What it does | Runtime deps / peers |
|---|---|---|
| [`@frappe-saaskit/client`](packages/client/README.md) | Framework-free typed client: plans, templates, auth, tenants, backups, checkout/billing, jobs, support, API tokens, team, admin. Typed errors, retries with `Idempotency-Key`, live updates over SSE. | none at runtime |
| [`@frappe-saaskit/react`](packages/react/README.md) | `SaasProvider`, TanStack Query v5 hooks, and a Razorpay Checkout.js helper (`useRazorpayCheckout`). | peers `react >= 18`, `@tanstack/react-query >= 5` |
| [`@frappe-saaskit/vue`](packages/vue/README.md) | Vue 3 composables (no extra query library). | peer `vue >= 3.4` |
| [`@frappe-saaskit/node`](packages/node/README.md) | Node helpers for scripts and CLIs: `createNodeClient`, `tokenFromEnv`, `loadTokenFile`. | none |
| [`@frappe-saaskit/mock`](packages/mock/README.md) | In-memory saas_core lookalike for tests, demos and UI work without a backend (`fetch` mode, or MSW handlers). | `msw` |

All packages are ESM-only.

## Prerequisites

- **Node.js 20 or newer.** CI runs Node 22. The client's SSE uses `fetch` streaming, so there is no `EventSource` polyfill to install.
- **pnpm 11.** The exact version is pinned in `package.json` (`packageManager`), so `corepack enable` will pick it up.
- **For real use:** a Frappe site with the saas_core app installed, reachable from your front end. For cookie auth from the browser, serve your front end from the same origin as the site (or set up CORS with credentials on the site yourself).
- **For codegen only:** a checkout of saas_core, which contains `openapi/v1.yaml`. You do not need it to build or test.

## Get started (from source)

```bash
git clone https://github.com/tridz-dev/frappe-saaskit-sdk.git
cd frappe-saaskit-sdk
corepack enable          # provides the pinned pnpm
pnpm install
pnpm build               # tsup -> packages/*/dist
pnpm typecheck
pnpm test                # vitest in every package (no backend needed; uses the mock)
pnpm lint:fc             # repo rule: no Frappe Cloud credentials or hosts in packages
```

The packages are not on npm yet. To use them in another app, build them first and then link one of these ways:

```bash
# from your app, pointing at your local checkout
pnpm add file:../frappe-saaskit-sdk/packages/client file:../frappe-saaskit-sdk/packages/react
```

or add your app to a pnpm workspace with this repo and depend on `workspace:*`. The `react`, `vue`, `node` and `mock` packages depend on `@frappe-saaskit/client` through `workspace:*`, so build all packages, not just one.

If `pnpm --filter <pkg> test` stops with `ERR_PNPM_IGNORED_BUILDS` on your machine, run `pnpm approve-builds` (esbuild and msw have install scripts; `pnpm-workspace.yaml` already allows them), or run `node_modules/.bin/vitest run` inside the package.

## Usage

`baseUrl` is the **site origin**, for example `https://app.example.com`, not an `/api` path. Use `''` when the front end is served from the same origin as the site.

### Client (framework-free)

```ts
import { createClient, SaasError, ValidationError, ConflictError } from '@frappe-saaskit/client';

const client = createClient({ baseUrl: 'https://app.example.com', auth: { type: 'cookie' } });

// Cookie auth: Frappe needs a CSRF token on every POST. The client gets it from the `Me`
// response, so call login/signup or me.get() before your first mutation, and again after a page reload.
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

Every method rejects with a `SaasError` subclass: `AuthError` 401, `ForbiddenError` 403, `NotFoundError` 404, `ConflictError` 409, `ValidationError` 400/422, `RateLimitError` 429 (with `retryAfterMs`), `ServerError` 5xx, `NetworkError`. GETs and POSTs are retried up to 3 times on network errors, 429 and 5xx. POSTs carry one `Idempotency-Key` across retries, and saas_core uses it to deduplicate the request. Set `retry: { retries: 0 }` to turn retries off.

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

// Or an OAuth2 bearer token, read from SAASKIT_TOKEN
const bearer = createNodeClient({ baseUrl: 'https://app.example.com', token: tokenFromEnv() });
```

Read the note on [API tokens](#status-and-known-limitations) before you hand out bearer tokens.

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

You can also use MSW: `createMockServer()` from `@frappe-saaskit/mock` in Node tests, or `createMockWorker()` from `@frappe-saaskit/mock/browser` for a browser demo. Options such as `signupMode`, `admin`, `capacityExhausted` and `forceUnauthenticated` simulate the error paths. See [packages/mock/README.md](packages/mock/README.md).

## Codegen: where the types come from

`packages/client/src/generated/schema.d.ts` is generated by [`openapi-typescript`](https://openapi-ts.dev) from saas_core's `openapi/v1.yaml` and **committed**, so you only need the spec when you change the contract.

```bash
# default spec location is a sibling checkout: ../saas_core/openapi/v1.yaml
git clone https://github.com/tridz-dev/saas_core.git ../saas_core

pnpm codegen                                  # regenerate schema.d.ts
pnpm codegen:check                            # exit 1 if schema.d.ts differs from the spec

# or point at the spec explicitly
OPENAPI_PATH=/path/to/saas_core/openapi/v1.yaml pnpm codegen
node scripts/codegen.mjs /path/to/v1.yaml --check
```

If the spec file is missing, both commands print `contract not present ... skipping` and **exit 0**. Set `CODEGEN_REQUIRE_SPEC=1` to make `--check` fail in that case. Because CI does not check out saas_core, CI does not currently verify drift either.

## Auth modes

| `auth` | Sends | Use for |
|---|---|---|
| `{ type: 'cookie' }` | the Frappe `sid` cookie (`credentials: 'include'`) plus `X-Frappe-CSRF-Token` on POSTs | browser apps on the same site |
| `{ type: 'apiKey', key, header? }` | `Authorization: token <key>` (use `key:secret` for Frappe user API keys), or `<header>: <key>` | servers and scripts |
| `{ type: 'bearer', getToken }` | `Authorization: Bearer <token>`, resolved on every request | OAuth2 access tokens |

`@frappe-saaskit/node`'s `loadTokenFile(path)` warns if the file can be read by group or other users. Never put tokens in front-end code.

## Architecture

The package map, the request lifecycle (CSRF, auth, error envelope), the Razorpay checkout sequence and how the mock is wired in are drawn as SVG diagrams in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Status and known limitations

This is an **alpha**. Before you depend on it, know that:

- **Not on npm.** Install from source as shown above. All packages are `0.0.1`, and breaking changes will come without a deprecation period.
- **Backend coupling.** It only works against saas_core's v1 API, and the generated types track a specific contract version (now 1.4.0). Older saas_core sites may be missing endpoints, for example `tenants.slug_availability`.
- **API tokens.** saas_core's `api_tokens.create` issues personal access tokens. Check that your saas_core version actually accepts them as `Bearer` before you rely on them for scripts. Frappe user API keys (`apiKey` auth) and OAuth2 bearer tokens are the paths Frappe supports out of the box.
- **Cookie auth needs `me.get()` first.** The CSRF token is held in memory, so after a reload the first POST fails until `me.get()` (or `useMe()`) has run.
- **Drift is not checked in CI.** See [Codegen](#codegen-where-the-types-come-from).
- **ESM only**, no CommonJS build.
- **The mock is a simulation**, not a contract test. Code that passes against the mock can still fail against a real site.

Issues and PRs are welcome. Please run `pnpm build && pnpm typecheck && pnpm test` before opening a PR.

## Repo rule: no Frappe Cloud credentials

The SDK talks only to the saas_core API. Frappe Cloud credentials or hosts must never appear in any package, test or config, and `pnpm lint:fc` enforces this. Anything that needs Frappe Cloud runs on the server side, inside saas_core.

## Related

- [tridz-dev/saas_core](https://github.com/tridz-dev/saas_core): the backend Frappe app and the OpenAPI contract
- [tridz-dev/frappe-saaskit-starter](https://github.com/tridz-dev/frappe-saaskit-starter): a starter app built on this SDK

## License

No license file has been added yet. Until one is added, all rights are reserved.
