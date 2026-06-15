export type OfferType =
  | 'sponsored_placement'
  | 'pro_api'
  | 'data_pack'
  | 'white_label_embed'
  | 'concierge_plan';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'won'
  | 'lost'
  | 'spam';

export type EntitlementType =
  | 'REPORT_BASIC'
  | 'REPORT_FULL'
  | 'API_PLAN'
  | 'WIDGET_PLAN'
  | 'CONCIERGE_SELF_SERVE'
  | 'CONCIERGE_CURATED';

export type ApiPlan = 'free' | 'starter' | 'pro' | 'studio';

export type ReportTier = 'basic' | 'full';

export type WidgetPlan = 'basic' | 'white_label';

export type ConciergeTier = 'self_serve' | 'curated';

export interface MonetizeLeadPayload {
  offerType: OfferType;
  name: string;
  email: string;
  org?: string;
  notes?: string;
}

export interface ApiAccessDecision {
  allowed: boolean;
  plan: ApiPlan;
  limit: number;
  used: number;
  remaining: number;
  statusCode?: number;
  message?: string;
  scopeType: 'api_key' | 'ip';
  scopeValue: string;
  apiKeyId?: string | null;
}

export interface SponsorCampaign {
  id: number;
  title: string;
  description: string | null;
  sponsor_name: string;
  placement: 'home' | 'schedule' | 'artists' | 'spotify_events';
  target_url: string;
  cta_label: string | null;
  image_url: string | null;
  package_tier: 'starter' | 'pro' | 'headline';
  package_price_usd: number;
}
