import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const createClient = vi.fn((o: unknown) => ({ opts: o }));
vi.mock('@frappe-saaskit/client', () => ({ createClient: (o: unknown) => createClient(o) }));
import { createNodeClient, tokenFromEnv, loadTokenFile } from './index';

describe('node helpers', () => {
  it('createNodeClient wires bearer auth', async () => {
    const c = createNodeClient({ baseUrl: 'http://x', token: 'abc' }) as any;
    expect(c.opts.baseUrl).toBe('http://x'); expect(c.opts.auth.type).toBe('bearer');
    expect(await c.opts.auth.getToken()).toBe('abc');
    expect(() => createNodeClient({ baseUrl: 'x', token: '' })).toThrow();
  });
  it('tokenFromEnv', () => {
    expect(tokenFromEnv('A', { A: ' tok \n' })).toBe('tok');
    expect(() => tokenFromEnv('B', {})).toThrow(/B/);
    process.env.SAASKIT_TOKEN = 'def'; expect(tokenFromEnv()).toBe('def');
  });
  it('loadTokenFile reads, trims, warns on loose perms', () => {
    const d = mkdtempSync(join(tmpdir(), 'tok-')); const f = join(d, 't');
    writeFileSync(f, 'secret\n'); chmodSync(f, 0o644);
    const warn = vi.fn(); expect(loadTokenFile(f, { warn })).toBe('secret'); expect(warn).toHaveBeenCalledOnce();
    chmodSync(f, 0o600); const w2 = vi.fn(); loadTokenFile(f, { warn: w2 }); expect(w2).not.toHaveBeenCalled();
    writeFileSync(f, ' \n'); chmodSync(f, 0o600); expect(() => loadTokenFile(f)).toThrow(/empty/);
  });
});
