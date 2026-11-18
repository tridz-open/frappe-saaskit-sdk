# Vendored OpenAPI contract

- Source: the saas_core backend (not public yet; the mock package is the way to try the SDK today)
- Path: `openapi/v1.yaml`
- Commit: dbb4bfd
- `info.version`: 1.4.1
- sha256: 6229295178926460fb932bed22b4f6c3a4f3d699f3a93b1a71406f27df1376c9

Refresh with `pnpm spec:sync <path-to-saas_core-checkout>` (copies the file, rewrites this note), then `pnpm codegen` and commit.
`pnpm codegen:check` fails if the generated types drift from this file.
