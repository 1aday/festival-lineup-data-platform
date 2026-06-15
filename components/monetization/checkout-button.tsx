'use client';

import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { StripeProductSku } from '@/lib/stripe-products';

interface CheckoutButtonProps {
  sku: StripeProductSku;
  label?: string;
  className?: string;
  wrapperClassName?: string;
}

export function CheckoutButton({ sku, label = 'Buy now', className, wrapperClassName }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Checkout is unavailable');
      }

      window.location.assign(data.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout is unavailable');
      setLoading(false);
    }
  };

  return (
    <div className={wrapperClassName ? wrapperClassName : 'space-y-2'}>
      <Button type="button" onClick={startCheckout} disabled={loading} className={className}>
        {loading ? <Loader2 className="animate-spin" /> : <CreditCard />}
        {loading ? 'Opening checkout...' : label}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
