# Vendored OpenAPI contract

- Source: the saas_core backend (not public yet; the mock package is the way to try the SDK today)
- Path: `openapi/v1.yaml`
- Commit: ef62c82
- `info.version`: 1.4.1
- sha256: d02d7f6e59464d03f3ba16acc094b7aefc1bbfa8bcbec5774343b8466f13f060

Refresh with `pnpm spec:sync <path-to-saas_core-checkout>` (copies the file, rewrites this note), then `pnpm codegen` and commit.
`pnpm codegen:check` fails if the generated types drift from this file.
