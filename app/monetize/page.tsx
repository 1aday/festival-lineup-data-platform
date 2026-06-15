'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppShell } from '@/components/design/AppShell';
import { CheckoutButton } from '@/components/monetization/checkout-button';
import { LeadForm } from '@/components/monetization/lead-form';
import {
  API_PLAN_PRICES,
  WIDGET_PRICES,
} from '@/lib/monetization-config';
import { STRIPE_CHECKOUT_PRODUCTS, type StripeProductSku } from '@/lib/stripe-products';
import type { OfferType } from '@/lib/monetization-types';

interface OfferCard {
  title: string;
  subtitle: string;
  points: string[];
  offerType: OfferType;
  checkoutSku?: StripeProductSku;
}

const offerCards: OfferCard[] = [
  {
    title: 'Sponsored Placements',
    subtitle: `Stripe checkout from $${STRIPE_CHECKOUT_PRODUCTS.ade_sponsor_week.priceUsd}`,
    points: ['Home/Schedule/Artists slots', 'Impression + click metrics', 'Campaign setup by email'],
    offerType: 'sponsored_placement',
    checkoutSku: 'ade_sponsor_week',
  },
  {
    title: 'Pro Data API',
    subtitle: `From $${API_PLAN_PRICES.starter}/month`,
    points: ['API keys + per-plan quotas', 'Rate-limit headers', 'Starter/Pro/Studio plans'],
    offerType: 'pro_api',
  },
  {
    title: 'Premium Data Packs',
    subtitle: `Stripe checkout from $${STRIPE_CHECKOUT_PRODUCTS.ade_data_export.priceUsd}`,
    points: ['Current artist/event export', 'JSON/CSV delivery', 'One refresh included'],
    offerType: 'data_pack',
    checkoutSku: 'ade_data_export',
  },
  {
    title: 'White-label Embeds',
    subtitle: `$${WIDGET_PRICES.basic} basic · $${WIDGET_PRICES.white_label} white-label`,
    points: ['Embed lineup/artists/genres', 'Domain allowlist', 'Widget usage metering'],
    offerType: 'white_label_embed',
  },
  {
    title: 'Concierge Plan Pro',
    subtitle: `Stripe checkout from $${STRIPE_CHECKOUT_PRODUCTS.ade_concierge_curated.priceUsd}`,
    points: ['Intake + itinerary pipeline', 'Share links', 'JSON/ICS/printable downloads'],
    offerType: 'concierge_plan',
    checkoutSku: 'ade_concierge_curated',
  },
];

export default function MonetizePage() {
  return (
    <AppShell
      title="Monetize LineupBase"
      subtitle="Stripe checkout for fast packages, lead capture for custom account setup"
      actions={<Badge variant="outline">Stripe Checkout</Badge>}
    >

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {offerCards.map((offer) => (
            <Card key={offer.title} className={offer.checkoutSku ? 'border-primary/30' : undefined}>
              <CardHeader>
                <CardTitle>{offer.title}</CardTitle>
                <CardDescription>{offer.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {offer.points.map((point) => (
                    <li key={point}>• {point}</li>
                  ))}
                </ul>
                {offer.checkoutSku ? (
                  <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-2xl font-semibold tracking-tight">
                        ${STRIPE_CHECKOUT_PRODUCTS[offer.checkoutSku].priceUsd}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {STRIPE_CHECKOUT_PRODUCTS[offer.checkoutSku].delivery}
                      </p>
                    </div>
                    <CheckoutButton
                      sku={offer.checkoutSku}
                      label={`Buy ${STRIPE_CHECKOUT_PRODUCTS[offer.checkoutSku].shortName}`}
                      className="w-full sm:w-auto"
                    />
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                    Requires key, domain, or quota provisioning after qualification.
                  </p>
                )}
                <LeadForm
                  offerType={offer.offerType}
                  title={offer.checkoutSku ? `Need custom terms for ${offer.title}?` : `Inquire about ${offer.title}`}
                  submitLabel={offer.checkoutSku ? 'Send Custom Inquiry' : 'Send Inquiry'}
                  compact
                />
              </CardContent>
            </Card>
          ))}
        </div>
    </AppShell>
  );
}
