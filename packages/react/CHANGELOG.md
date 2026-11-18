# @frappe-saaskit/react

## 0.1.0-alpha.2

### Minor Changes

- a6d8553: Portal v2 API: `Me.email_verified`, `Job.started_at` and the `JobStep.key` / `status` aliases (contract resynced to saas_core). New System Manager `admin.betaAccess` client methods: `list`, `add`, `remove` and `resend`, with typed `BetaAccess*` models.

### Patch Changes

- Updated dependencies [a6d8553]
  - @frappe-saaskit/client@0.1.0-alpha.2

## 0.1.0-alpha.1

### Patch Changes

- Sync vendored OpenAPI contract to saas_core 1.4.1: product-specific wording removed and the setup callback signature header is now `X-Saas-Signature`. Regenerated client types.
- Updated dependencies
  - @frappe-saaskit/client@0.1.0-alpha.1

## 0.1.0-alpha.0

### Minor Changes

- 945b4aa: First alpha. Typed client for saas_core API v1.4.0, React/Vue bindings, Node helpers, in-memory mock.
  Retries only idempotent requests, maps Frappe-native errors, bootstraps CSRF, MIT licensed.

### Patch Changes

- Updated dependencies [945b4aa]
  - @frappe-saaskit/client@0.1.0-alpha.0
