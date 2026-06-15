import type { ApiPlan, ConciergeTier, OfferType, ReportTier, WidgetPlan } from './monetization-types';

export const MONETIZATION_FLAG = process.env.NEXT_PUBLIC_ENABLE_MONETIZATION !== 'false' && process.env.ENABLE_MONETIZATION !== 'false';

export const API_FREE_DAILY_QUOTA = Number(process.env.FREE_API_DAILY_QUOTA || 5000);
export const API_FALLBACK_PLAN_QUOTA: Record<ApiPlan, number> = {
  free: API_FREE_DAILY_QUOTA,
  starter: 2500,
  pro: 10000,
  studio: 50000,
};

export const OFFER_LABELS: Record<OfferType, string> = {
  sponsored_placement: 'Sponsored Placement',
  pro_api: 'Pro API Access',
  data_pack: 'Premium Data Pack',
  white_label_embed: 'White-label Embed',
  concierge_plan: 'Concierge Plan',
};

export const SPONSOR_PACKAGE_PRICES: Record<'starter' | 'pro' | 'headline', number> = {
  starter: 250,
  pro: 600,
  headline: 1200,
};

export const API_PLAN_PRICES: Record<Exclude<ApiPlan, 'free'>, number> = {
  starter: 99,
  pro: 299,
  studio: 799,
};

export const REPORT_PRICES: Record<ReportTier, number> = {
  basic: 39,
  full: 149,
};

export const WIDGET_PRICES: Record<WidgetPlan, number> = {
  basic: 129,
  white_label: 349,
};

export const CONCIERGE_PRICES: Record<ConciergeTier, number> = {
  self_serve: 29,
  curated: 99,
};
