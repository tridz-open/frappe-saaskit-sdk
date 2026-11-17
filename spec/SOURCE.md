# Vendored OpenAPI contract

- Source repo: https://github.com/tridz-dev/saas_core
- Path: `openapi/v1.yaml`
- Commit: 7335ea3
- `info.version`: 1.4.0
- sha256: f545cdf9b26a68fbf599dccf297245a1fa6488ef5c2be70c28150e3ef22ae8a1

Refresh with `pnpm spec:sync <path-to-saas_core-checkout>` (copies the file, rewrites this note), then `pnpm codegen` and commit.
`pnpm codegen:check` fails if the generated types drift from this file.
