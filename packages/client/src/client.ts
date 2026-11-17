import type * as T from './types';
import { createHttp } from './http';
import { subscribe as subscribeEvents } from './sse';
export type AuthStrategy =
  | { type: 'cookie' }
  | { type: 'apiKey'; key: string; header?: string }
  | { type: 'bearer'; getToken: () => string | Promise<string | null | undefined> };
export interface RetryOptions { retries?: number; baseDelayMs?: number; maxDelayMs?: number; }
export interface ClientOptions { baseUrl: string; auth?: AuthStrategy; fetch?: typeof fetch; retry?: RetryOptions; EventSource?: typeof EventSource; pollIntervalMs?: number; }
export interface Subscription { close(): void; }
/** Public surface. Every method throws SaasError subclasses. Tenant ids are the contract `Tenant.name`. */
export interface SaasClient {
  plans: { list(p?: { currency?: string; interval?: T.Interval }): Promise<T.Plan[]> };
  templates: { list(p?: T.ListParams): Promise<T.Template[]> };
  auth: {
    signup(i: T.SignupRequest): Promise<T.Me>;
    login(i: T.LoginRequest): Promise<T.Me>;
    logout(): Promise<void>;
    requestPasswordReset(email: string): Promise<void>;
    confirmPasswordReset(i: { key: string; new_password: string }): Promise<void>;
    requestEmailVerification(): Promise<void>;
    confirmEmail(key: string): Promise<void>;
  };
  me: { get(): Promise<T.Me>; update(i: T.ProfileUpdate): Promise<T.Me> };
  apiTokens: {
    list(p?: T.ListParams): Promise<T.ApiToken[]>;
    create(i: T.CreateTokenInput): Promise<T.ApiTokenCreated>;
    revoke(token: string): Promise<void>;
  };
  team: {
    list(tenantId: string, p?: T.ListParams): Promise<T.TeamMember[]>;
    invite(tenantId: string, i: { email: string; role: T.TeamRole }): Promise<T.TeamMember>;
    revokeInvite(tenantId: string, invite: string): Promise<void>;
    changeRole(tenantId: string, member: string, role: T.TeamRole): Promise<T.TeamMember>;
    remove(tenantId: string, member: string): Promise<void>;
    acceptInvite(token: string): Promise<T.TeamMember>;
  };
  /** Public site config (no auth): signup toggle and payment-mock banner. */
  config: { get(): Promise<T.PublicConfig> };
  /** SaaS Admin only (403 otherwise). create may fail 503 capacity_exhausted. */
  admin: {
    tenants: {
      list(p?: T.ListParams & { status?: T.TenantStatus; owner_email?: string }): Promise<T.Tenant[]>;
      listPage(p?: T.ListParams & { status?: T.TenantStatus; owner_email?: string }): Promise<T.Page<T.Tenant>>;
      create(i: T.AdminTenantCreateRequest): Promise<T.TenantCreated>;
      invite(i: T.AdminTenantInviteRequest): Promise<T.TeamMember>;
    };
  };
  tenants: {
    list(p?: T.ListParams & { status?: T.TenantStatus }): Promise<T.Tenant[]>;
    listPage(p?: T.ListParams & { status?: T.TenantStatus }): Promise<T.Page<T.Tenant>>;
    get(id: string): Promise<T.Tenant>;
    create(i: T.TenantCreateRequest): Promise<T.TenantCreated>;
    duplicate(id: string, i: { slug: string }): Promise<T.TenantCreated>;
    requestDelete(id: string, i: { confirm_slug: string; reason?: string }): Promise<T.Job>;
    suspendStatus(id: string): Promise<T.SuspendStatus>;
    openLoginLink(id: string): Promise<T.Link>;
    changePlan(id: string, plan: string): Promise<T.Job>;
  };
  backups: {
    list(tenantId: string, p?: T.ListParams): Promise<T.Backup[]>;
    create(tenantId: string): Promise<T.Job>;
    downloadLink(tenantId: string, backup: string, part: T.BackupPart): Promise<T.Link>;
    /** Guarded: returns a pending approval request, never a job. */
    restore(tenantId: string, backup: string): Promise<T.RestoreApproval>;
  };
  checkout: {
    createSession(i: T.CheckoutRequest): Promise<T.CheckoutSession>;
    verifyPayment(gateway: string, payload: T.VerifyPaymentPayload): Promise<T.VerifyPaymentResult>;
  };
  subscription: {
    get(tenantId: string): Promise<T.Subscription>;
    portalLink(tenantId: string, returnUrl?: string): Promise<T.Link>;
    cancel(tenantId: string, i?: { at_period_end?: boolean; reason?: string }): Promise<T.Subscription>;
  };
  invoices: { list(p?: T.ListParams & { tenant?: string }): Promise<T.Invoice[]>; get(id: string): Promise<T.Invoice>; pdf(id: string): Promise<Blob> };
  paymentMethods: { portalLink(i?: { tenant?: string; return_url?: string }): Promise<T.Link> };
  jobs: { get(id: string): Promise<T.Job>; list(p?: T.ListParams & { tenant?: string }): Promise<T.Job[]> };
  support: {
    list(p?: T.ListParams): Promise<T.SupportTicket[]>;
    get(id: string): Promise<T.SupportTicket>;
    create(i: T.CreateTicketInput): Promise<T.SupportTicket>;
    reply(ticket: string, body: string): Promise<T.SupportTicket>;
    close(ticket: string): Promise<T.SupportTicket>;
  };
  events: { stream: SaasClient['subscribe'] };
  /** SSE GET events.stream?job=|tenant= with auto-reconnect (Last-Event-ID), falls back to polling jobs.get/tenants.get. */
  subscribe(target: { jobId: string } | { tenantId: string }, onEvent: (e: T.SaasEvent) => void, onError?: (e: unknown) => void): Subscription;
}

export const createClient = (o: ClientOptions): SaasClient => {
  const http = createHttp(o);
  const get = <X>(p: string, query?: Record<string, string | undefined>) => http.request<X>('GET', p, { query });
  const post = <X>(p: string, body?: unknown) => http.request<X>('POST', p, { body: body ?? {} });
  const q = (r: object | undefined) => Object.fromEntries(Object.entries(r ?? {}).map(([k, v]) => [k, v === undefined ? undefined : String(v)])) as Record<string, string | undefined>;
  const page = <X>(p: string, params?: object) => get<T.Page<X>>(p, q(params));
  const items = async <X>(p: string, params?: object) => (await page<X>(p, params)).items ?? [];
  const remember = async (r: Promise<T.Me>) => { const me = await r; http.setCsrf(me.csrf_token); return me; };
  const subscribe: SaasClient['subscribe'] = (target, onEvent, onError) => subscribeEvents(http, target, onEvent, onError, { retry: o.retry, pollIntervalMs: o.pollIntervalMs });
  return {
    plans: { list: (p) => items('plans.list', p) },
    templates: { list: (p) => items('templates.list', p) },
    auth: {
      signup: (i) => remember(post('signup', i)),
      login: (i) => remember(post('login', i)),
      logout: async () => { await post('logout'); http.setCsrf(undefined); },
      requestPasswordReset: async (email) => { await post('password_reset.request', { email }); },
      confirmPasswordReset: async (i) => { await post('password_reset.confirm', i); },
      requestEmailVerification: async () => { await post('verify_email.request'); },
      confirmEmail: async (key) => { await post('verify_email.confirm', { key }); },
    },
    me: { get: () => remember(get('me')), update: (i) => remember(post('me.update', i)) },
    apiTokens: {
      list: (p) => items('api_tokens.list', p),
      create: (i) => post('api_tokens.create', i),
      revoke: async (token) => { await post('api_tokens.revoke', { token }); },
    },
    team: {
      list: (t, p) => items('tenants.team.list', { ...p, tenant: t }),
      invite: (t, i) => post('tenants.team.invite', { tenant: t, ...i }),
      revokeInvite: async (t, invite) => { await post('tenants.team.revoke_invite', { tenant: t, invite }); },
      changeRole: (t, member, role) => post('tenants.team.change_role', { tenant: t, member, role }),
      remove: async (t, member) => { await post('tenants.team.remove', { tenant: t, member }); },
      acceptInvite: (token) => post('team.accept_invite', { token }),
    },
    tenants: {
      list: (p) => items('tenants.list', p),
      listPage: (p) => page('tenants.list', p),
      get: (id) => get('tenants.get', { tenant: id }),
      create: (i) => post('tenants.create', i),
      duplicate: (id, i) => post('tenants.duplicate', { tenant: id, ...i }),
      requestDelete: (id, i) => post('tenants.request_delete', { tenant: id, ...i }),
      suspendStatus: (id) => get('tenants.suspend_status', { tenant: id }),
      openLoginLink: (id) => post('tenants.open_login_link', { tenant: id }),
      changePlan: (id, plan) => post('tenants.change_plan', { tenant: id, plan }),
    },
    backups: {
      list: (t, p) => items('tenants.backups.list', { ...p, tenant: t }),
      create: (t) => post('tenants.backups.create', { tenant: t }),
      downloadLink: (t, backup, part) => post('tenants.backups.download_link', { tenant: t, backup, part }),
      restore: (t, backup) => post('tenants.backups.restore', { tenant: t, backup }),
    },
    checkout: {
      createSession: (i) => post('checkout.create_session', i),
      verifyPayment: (gateway, payload) => post('checkout.verify_payment', { gateway, payload }),
    },
    subscription: {
      get: (t) => get('subscription.get', { tenant: t }),
      portalLink: (t, return_url) => post('subscription.portal_link', { tenant: t, return_url }),
      cancel: (t, i) => post('subscription.cancel', { tenant: t, ...i }),
    },
    invoices: {
      list: (p) => items('invoices.list', p),
      get: (id) => get('invoices.get', { invoice: id }),
      pdf: (id) => http.download('invoices.pdf', { invoice: id }),
    },
    paymentMethods: { portalLink: (i) => post('payment_methods.portal_link', i) },
    jobs: { get: (id) => get('jobs.get', { job: id }), list: (p) => items('jobs.list', p) },
    support: {
      list: (p) => items('support.tickets.list', p),
      get: (id) => get('support.tickets.get', { ticket: id }),
      create: (i) => post('support.tickets.create', i),
      reply: (ticket, body) => post('support.tickets.reply', { ticket, body }),
      close: (ticket) => post('support.tickets.close', { ticket }),
    },
    config: { get: () => get('config') },
    admin: { tenants: {
      list: (p) => items('admin.tenants.list', p),
      listPage: (p) => page('admin.tenants.list', p),
      create: (i) => post('admin.tenants.create', i),
      invite: (i) => post('admin.tenants.invite', i),
    } },
    events: { stream: subscribe },
    subscribe,
  };
};
