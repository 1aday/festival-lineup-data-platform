import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

import { AppShell } from '@/components/design/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getStripeCheckoutProduct } from '@/lib/stripe-products';

interface CheckoutSuccessPageProps {
  searchParams: Promise<{
    session_id?: string;
    sku?: string;
  }>;
}

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const params = await searchParams;
  const product = getStripeCheckoutProduct(params.sku);

  return (
    <AppShell
      title="Payment Received"
      subtitle="Stripe checkout completed. Fulfillment starts from the paid session details."
      breadcrumbs={[
        { href: '/', label: 'Festivals' },
        { href: '/monetize', label: 'Monetize' },
      ]}
    >
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-5" />
          </div>
          <CardTitle>{product ? product.name : 'LineupBase Purchase'}</CardTitle>
          <CardDescription>
            {product ? product.delivery : 'We will match the paid Stripe session to your order details.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {params.session_id ? (
            <p>
              Stripe session: <span className="font-mono text-foreground">{params.session_id}</span>
            </p>
          ) : null}
          <p>
            Use the email from checkout for delivery and follow-up. If anything needs setup details,
            reply from the Stripe receipt email with the sponsor, export, or itinerary requirements.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/monetize">Back to offers</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Open LineupBase</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
