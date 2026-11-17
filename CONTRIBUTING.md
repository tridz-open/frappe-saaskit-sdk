# Contributing

## Setup

```bash
corepack enable            # provides the pnpm version pinned in package.json (pnpm 11)
pnpm install
pnpm build && pnpm typecheck && pnpm test
```

Node 20 or newer. No backend is needed: tests use `@frappe-saaskit/mock`. `pnpm-workspace.yaml` already
allows the install scripts of `esbuild` and `msw`; if your pnpm still reports `ERR_PNPM_IGNORED_BUILDS`,
run `pnpm approve-builds`.

## Contract and codegen

Types in `packages/client/src/generated/` come from `spec/v1.yaml`, a vendored copy of saas_core's
OpenAPI contract (see `spec/SOURCE.md`). To update it:

```bash
pnpm spec:sync ../saas_core    # path to a saas_core checkout
pnpm codegen
```

`pnpm codegen:check` (run in CI) fails when generated types and the spec disagree, or when the spec is missing.

## Before opening a PR

- `pnpm build && pnpm typecheck && pnpm test && pnpm lint:internal`
- `pnpm changeset` for any user-facing change.
- Opt-in contract test against a real saas_core: `SAASCORE_URL=https://site pnpm test:contract`.
