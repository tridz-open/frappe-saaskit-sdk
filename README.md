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
