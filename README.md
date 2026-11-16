# saas-kit (`@frappe-saaskit/*`)

TypeScript SDK monorepo for building SaaS front ends on top of the `saas_core` Frappe app. Types and endpoints are generated from the saas_core OpenAPI contract (v1.2.0).

## Packages

| Package | What it does |
|---|---|
| `@frappe-saaskit/client` | Framework-free typed client: plans, templates, auth, tenants, backups, billing, jobs, support, API tokens, team. Typed errors, retries, SSE subscriptions. |
| `@frappe-saaskit/react` | TanStack Query v5 hooks and `SaasProvider` over the client. Hook list: [packages/react/README.md](packages/react/README.md). |
| `@frappe-saaskit/vue` | Vue 3 composables (peer dep `vue` only). See [packages/vue/README.md](packages/vue/README.md). |
| `@frappe-saaskit/node` | Helpers for agents and CLIs (`createNodeClient`, `tokenFromEnv`, `loadTokenFile`). |
| `@frappe-saaskit/mock` | In-memory mock backend for tests and demos. |

## Quickstart

All names below are exported from each package `src/index.ts`. `baseUrl` is the site origin (the client appends `/api/method/saas_core.api.v1.<op>`); use `''` for same-origin.

### Framework-free client

```ts
import { createClient, SaasError, ValidationError } from '@frappe-saaskit/client';

const client = createClient({ baseUrl: 'https://app.example.com', auth: { type: 'cookie' } });

await client.auth.login({ email: 'me@example.com', password: '...' }); // stores the CSRF token
const plans = await client.plans.list();
const tenants = await client.tenants.list();

try {
  await client.tenants.create({ slug: 'acme', plan: 'pro' }); // TenantCreateRequest
} catch (e) {
  if (e instanceof ValidationError) console.log(e.fieldErrors);
  else if (e instanceof SaasError) console.log(e.status, e.code, e.requestId);
}
```

### React

```tsx
import { createClient } from '@frappe-saaskit/client';
import { SaasProvider, usePlans, useCheckout, useRazorpayCheckout, useJob } from '@frappe-saaskit/react';

const client = createClient({ baseUrl: '', auth: { type: 'cookie' } });

function Buy() {
  const plans = usePlans();
  const checkout = useCheckout();
  const rzp = useRazorpayCheckout();
  const buy = async () => {
    const session = await checkout.mutateAsync({
      plan: 'pro', interval: 'month', slug: 'acme',
      success_url: location.origin + '/done', cancel_url: location.href,
    });
    if (session.client_payload) await rzp.open(session); // Checkout.js, then verifyPayment
    else if (session.url) location.href = session.url;   // hosted gateways
  };
  /* render plans.data, call buy() */
}

export const App = () => <SaasProvider client={client}><Buy /></SaasProvider>;
```

`useJob(jobId)` and `useTenantLive(tenantId)` follow provisioning live. Full hook list: [packages/react/README.md](packages/react/README.md).

### Vue

```ts
import { createApp } from 'vue';
import { createClient } from '@frappe-saaskit/client';
import { SAAS_CLIENT_KEY, usePlans, useCheckout } from '@frappe-saaskit/vue';

const app = createApp(App);
app.provide(SAAS_CLIENT_KEY, createClient({ baseUrl: '', auth: { type: 'cookie' } }));
// in a component: const { data: plans, loading } = usePlans(); const { mutate } = useCheckout();
```

### Node agents and CLIs

```ts
import { createNodeClient, tokenFromEnv } from '@frappe-saaskit/node';

const client = createNodeClient({ baseUrl: 'https://app.example.com', token: tokenFromEnv() }); // SAASKIT_TOKEN
const sub = client.subscribe({ jobId: 'PJ-000001' }, (e) => console.log(e.type));
```

### Mock backend (tests and demos)

```ts
import { createClient } from '@frappe-saaskit/client';
import { createMockFetch } from '@frappe-saaskit/mock';

const fetch = createMockFetch({ stepMs: 0 });
const client = createClient({ baseUrl: 'http://localhost', auth: { type: 'cookie' }, fetch });
// msw alternative: createMockServer() (Node) or createMockHandlers() (browser worker)
```

## Architecture

Package map, request lifecycle (CSRF, auth, error envelope), the Razorpay checkout sequence and mock-vs-real wiring, with Mermaid diagrams: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Develop

```bash
pnpm install && pnpm test && pnpm build
```

Note: `pnpm --filter ... test` can abort with `ERR_PNPM_IGNORED_BUILDS` (esbuild/msw build scripts). Run `pnpm approve-builds`, or run `node_modules/.bin/vitest` inside a package.

## Codegen

Types are generated from the saas_core OpenAPI contract (v1.2.0):

```bash
pnpm codegen         # regenerate
pnpm codegen:check   # fail on drift (used in CI)
pnpm lint:fc         # enforce the no-Frappe-Cloud-credentials rule
```

## Auth modes

- `cookie`: session cookie (browser default, CSRF taken from `Me`).
- API key: `token <key>` or a custom header.
- Bearer: async `getToken()` callback.

Node helpers read `SAASKIT_TOKEN` or a token file (warns if group/world readable).

## SSE

`client.subscribe` streams job and tenant events using fetch-based SSE (no EventSource polyfill needed on Node 18+). React/Vue expose `useJob` and `useTenantLive`, which stop at terminal states.

## Rule: no Frappe Cloud credentials

This SDK talks only to the saas_core API. Frappe Cloud credentials must never appear in any package, test or config; `pnpm lint:fc` enforces it. Frappe Cloud access belongs in fcctl on the server side.

## Related repos

- [tridz-dev/saas_core](https://github.com/tridz-dev/saas_core) - backend Frappe app and API contract
- [tridz-dev/fcctl](https://github.com/tridz-dev/fcctl) - Frappe Cloud control library/CLI
- [tridz-dev/frappe-saaskit-starter](https://github.com/tridz-dev/frappe-saaskit-starter) - generic starter app built on this SDK
