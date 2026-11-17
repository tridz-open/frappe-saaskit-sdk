# @frappe-saaskit/mock

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
