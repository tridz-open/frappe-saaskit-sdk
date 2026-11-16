// Model types are derived from the generated contract (src/generated/schema.d.ts, from saas_core/openapi/v1.yaml).
import type { components } from './generated/schema';
type S = components['schemas'];
export type Interval = S['Interval'];
export type TenantStatus = S['TenantStatus'];
export type JobKind = S['JobKind'];
export type JobState = S['JobState'];
export type SubscriptionStatus = S['SubscriptionStatus'];
export type Gateway = S['Gateway'];
export type Plan = S['Plan'];
export type Template = S['Template'];
export type SignupRequest = S['SignupRequest'];
export type LoginRequest = S['LoginRequest'];
export type Me = S['Me'];
export type CheckoutRequest = S['CheckoutRequest'];
export type CheckoutSession = S['CheckoutSession'];
export type Tenant = S['Tenant'];
export type TenantCreateRequest = S['TenantCreateRequest'];
export type TenantCreated = S['TenantCreated'];
export type SuspendStatus = S['SuspendStatus'];
/** Used for login links, backup download links and billing portal links. */
export type Link = S['LoginLink'];
export type Backup = S['Backup'];
export type Subscription = S['Subscription'];
export type Invoice = S['Invoice'];
export type JobStep = S['JobStep'];
export type Job = S['Job'];
export type SupportTicket = S['SupportTicket'];
export type EventType = S['EventType'];
export type SaasEvent = S['Event'];
export type JobUpdatedEvent = S['EventJobUpdated'];
export type TenantUpdatedEvent = S['EventTenantUpdated'];
export type SubscriptionUpdatedEvent = S['EventSubscriptionUpdated'];
export type JobStepEvent = S['EventJobStep'];
export type InvoiceCreatedEvent = S['EventInvoiceCreated'];
export type ResyncEvent = S['EventResync'];
export type ApiToken = S['ApiToken'];
export type ApiTokenCreated = S['ApiTokenCreated'];
export type TeamRole = S['TeamRole'];
export type TeamMember = S['TeamMember'];
export type RestoreApproval = S['RestoreApproval'];
export interface ProfileUpdate { full_name?: string; current_password?: string; new_password?: string; }
export interface CreateTokenInput { label: string; tenant?: string; expires_at?: string | null; }
export type ApiErrorBody = S['Error'];
export type BackupPart = 'database' | 'public' | 'private';
export interface CreateTicketInput { tenant?: string; subject: string; body: string; priority?: string; }
export interface Page<T> { items: T[]; next_cursor: string | null; }
export interface ListParams { cursor?: string; limit?: number; }
export const TERMINAL_JOB_STATES: readonly JobState[] = ['succeeded', 'failed', 'needs_attention', 'outcome_unknown'];
export const STABLE_TENANT_STATUSES: readonly TenantStatus[] = ['active', 'failed', 'suspended'];
