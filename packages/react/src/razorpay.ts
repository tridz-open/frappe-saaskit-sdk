import { useCallback, useState } from 'react';
import type { CheckoutSession, RazorpayClientPayload, VerifyPaymentResult } from '@frappe-saaskit/client';
import { useSaasClient } from './provider';

export const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

type RzpWindow = Window & { Razorpay?: new (opts: Record<string, unknown>) => { open(): void; on(ev: string, cb: (r: any) => void): void } };

let scriptPromise: Promise<void> | null = null;

/** Load checkout.js once per page; resolves immediately if window.Razorpay already exists. */
export function loadRazorpayScript(): Promise<void> {
  if ((window as RzpWindow).Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = RAZORPAY_SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; s.remove(); reject(new Error('Failed to load Razorpay checkout')); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function useRazorpayCheckout() {
  const client = useSaasClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const open = useCallback(async (session: CheckoutSession): Promise<VerifyPaymentResult> => {
    const p = session.client_payload as RazorpayClientPayload | undefined;
    if (!p || p.provider !== 'razorpay') throw new Error('Not a Razorpay checkout session');
    setLoading(true); setError(null);
    try {
      await loadRazorpayScript();
      const Rzp = (window as RzpWindow).Razorpay;
      if (!Rzp) throw new Error('Razorpay checkout unavailable');
      return await new Promise<VerifyPaymentResult>((resolve, reject) => {
        const options: Record<string, unknown> = {
          key: p.key, name: p.name, description: p.description, prefill: p.prefill, notes: p.notes,
          ...(p.mode === 'subscription' ? { subscription_id: p.subscription_id } : { order_id: p.order_id, amount: p.amount, currency: p.currency }),
          handler: (resp: Record<string, string>) => {
            client.checkout.verifyPayment('razorpay', resp).then(resolve, reject);
          },
          modal: { ondismiss: () => reject(new Error('dismissed')) },
        };
        const rzp = new Rzp(options);
        rzp.on('payment.failed', (r: any) => reject(new Error(r?.error?.description || 'Payment failed')));
        rzp.open();
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client]);

  return { open, loading, error };
}
