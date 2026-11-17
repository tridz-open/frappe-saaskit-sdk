# saas-kit PROGRESS (L3)
Note: `pnpm --filter ... test` aborts with ERR_PNPM_IGNORED_BUILDS (esbuild/msw build scripts need `pnpm approve-builds`; policy not changed). Tests run via node_modules/.bin/vitest per package.
React API published: packages/react/README.md (hook list). Starter may link via workspace/file.
| id | status | owner | files | acceptance | evidence |
|---|---|---|---|---|---|
| T0 scaffold | done | L3 | root | install ok | pnpm install ok |
| T1 client runtime | done (interim REST paths) | W1 | packages/client | vitest | 16 pass, tsc, tsup ok |
| T2 react | done | W2 | packages/react | vitest+README | 6 pass |
| T3 vue | done | W3 | packages/vue | vitest | 8 pass |
| T4 node | done | W3 | packages/node | vitest | 3 pass |
| T5 mock | done (interim paths) | W4 | packages/mock | vitest | 7 pass |
| T6 codegen+no-FC lint+CI | done | W5 | scripts, tests, .github | drift check | codegen ran on v1.yaml, --check ok; no-fc 1 pass |
| T7a client src aligned (L3) | done | L3 | packages/client/src | tsc ok, codegen --check ok | types.ts derives from generated schema; http uses /api/method/saas_core.api.v1.*, unwraps {message}, error {error:{...}}, CSRF from Me |
| T7b client tests | done | W6 | packages/client/tests | vitest | |
| T7c mock rewrite | done | W7 | packages/mock/src | vitest | |
| T7d react hooks+README | done | W8 | packages/react | vitest | |
| T7e vue | done | W9 | packages/vue | vitest | |
Renames (T7): client `backups.restore` REMOVED (not in contract); `tenants.delete`->`tenants.requestDelete(id,{confirm_slug})`; `subscription.checkout`->`checkout.createSession`; `subscription.get(tenantId)`; tenant ids = Tenant.name; Plan.id->code, price_cents->prices[]; Job.status->state; Invoice.id->name. Hooks: useDeleteTenant->useRequestDeleteTenant (alias kept), useCheckout kept, useRestoreBackup removed.
## Phase 3 (contract v1.1.0)
| P3a client types+methods+sse typed (L3) | done | L3 | packages/client/src | tsc, 31 vitest | codegen regenerated; me.update, apiTokens.*, team.*, backups.restore |
| P3b client tests | done | W10 | packages/client/tests | | |
| P3c mock | done | W11 | packages/mock/src | | |
| P3d react hooks+README | done | W12 | packages/react | | |
| P3e vue | done | W13 | packages/vue | | |
## Phase 4 (contract v1.2.0)
| P4 verify_email + tickets.close: codegen, client, mock, react, vue, README v0.4 (L3) | done | L3 | all packages | vitest + codegen --check + tsup build | dist built |
| P4b v1.2 tests (verify_email, tickets.close) | done | L3 | client/mock/react/vue tests | vitest: client 41, mock 39, react 21, vue 15, node 3; codegen --check ok | |
## Phase 5 (contract v1.3.0)
| P5 codegen v1.3.0; client `config.get`, `admin.tenants.{list,listPage,create,invite}`; Subscription/Invoice `payment_mocked`; mock (config, signup_disabled 403, admin.* with 403 non-admin, capacity_exhausted 503, options publicSignup/paymentBanner/admin/capacityExhausted); react `usePublicConfig`, `useAdminTenants`, `useAdminCreateTenant`, `useAdminInviteTenant`; vue same names (L3) | done | L3 | all packages | codegen --check ok; vitest: client 47, mock 47, react 25, vue 17, node 3; tsc ok; tsup dist rebuilt | |
