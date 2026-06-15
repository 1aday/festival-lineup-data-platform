import type { OfferType } from './monetization-types';

export type StripeProductSku =
  | 'ade_sponsor_week'
  | 'ade_data_export'
  | 'ade_concierge_curated';

export interface StripeCheckoutProduct {
  sku: StripeProductSku;
  offerType: OfferType;
  name: string;
  shortName: string;
  description: string;
  priceUsd: number;
  unitAmount: number;
  delivery: string;
  features: string[];
}

export const STRIPE_CHECKOUT_PRODUCTS: Record<StripeProductSku, StripeCheckoutProduct> = {
  ade_sponsor_week: {
    sku: 'ade_sponsor_week',
    offerType: 'sponsored_placement',
    name: 'Featured Festival Sponsor Week',
    shortName: 'Featured Week',
    description: 'Seven-day featured placement across LineupBase sponsor inventory with a basic performance summary.',
    priceUsd: 299,
    unitAmount: 29900,
    delivery: 'Campaign setup by email after checkout',
    features: [
      'One featured slot on home, schedule, or artists pages',
      'Creative review before placement goes live',
      'Impression and click summary after the run',
    ],
  },
  ade_data_export: {
    sku: 'ade_data_export',
    offerType: 'data_pack',
    name: 'European Festival Data Export',
    shortName: 'Data Export',
    description: 'A clean European electronic festival artist and event snapshot for teams that need their own analysis or outreach list.',
    priceUsd: 49,
    unitAmount: 4900,
    delivery: 'CSV and JSON delivery by email',
    features: [
      'Artist and event export from the current featured festival dataset',
      'Included image/source metadata where available',
      'One refresh included within seven days',
    ],
  },
  ade_concierge_curated: {
    sku: 'ade_concierge_curated',
    offerType: 'concierge_plan',
    name: 'Curated Festival Concierge Plan',
    shortName: 'Concierge Plan',
    description: 'A curated itinerary plan for festival visitors, teams, or creators who want a faster event route.',
    priceUsd: 149,
    unitAmount: 14900,
    delivery: 'Curated plan delivered within two business days',
    features: [
      'Intake review for music, timing, and location preferences',
      'Priority artist and event recommendations',
      'Shareable itinerary with export options',
    ],
  },
};

export const STRIPE_CHECKOUT_PRODUCT_LIST = Object.values(STRIPE_CHECKOUT_PRODUCTS);

export function getStripeCheckoutProduct(sku: string | null | undefined) {
  if (!sku) {
    return null;
  }

  return STRIPE_CHECKOUT_PRODUCTS[sku as StripeProductSku] ?? null;
}
