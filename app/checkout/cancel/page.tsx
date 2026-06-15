import Link from 'next/link';
import { RotateCcw } from 'lucide-react';

import { AppShell } from '@/components/design/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getStripeCheckoutProduct } from '@/lib/stripe-products';

interface CheckoutCancelPageProps {
  searchParams: Promise<{
    sku?: string;
  }>;
}

export default async function CheckoutCancelPage({ searchParams }: CheckoutCancelPageProps) {
  const params = await searchParams;
  const product = getStripeCheckoutProduct(params.sku);

  return (
    <AppShell
      title="Checkout Canceled"
      subtitle="No charge was created."
      breadcrumbs={[
        { href: '/', label: 'Festivals' },
        { href: '/monetize', label: 'Monetize' },
      ]}
    >
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <RotateCcw className="size-5" />
          </div>
          <CardTitle>{product ? product.name : 'Festival Checkout'}</CardTitle>
          <CardDescription>You can restart checkout or send a manual inquiry instead.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/monetize">Return to offers</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Open LineupBase</Link>
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
