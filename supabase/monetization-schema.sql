-- Monetization schema for ADE platform
-- Run after base schema/enhanced schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.monetize_leads (
  id BIGSERIAL PRIMARY KEY,
  offer_type TEXT NOT NULL CHECK (
    offer_type IN (
      'sponsored_placement',
      'pro_api',
      'data_pack',
      'white_label_embed',
      'concierge_plan'
    )
  ),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  org TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (
    status IN ('new', 'contacted', 'qualified', 'won', 'lost', 'spam')
  ),
  source TEXT NOT NULL DEFAULT 'web',
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.api_plans (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  monthly_price_usd INTEGER NOT NULL,
  daily_quota INTEGER NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT NOT NULL,
  key_prefix TEXT NOT NULL UNIQUE,
  key_hash TEXT NOT NULL UNIQUE,
  plan_id BIGINT REFERENCES public.api_plans(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'revoked')),
  daily_quota_override INTEGER,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.api_usage_daily (
  id BIGSERIAL PRIMARY KEY,
  usage_date DATE NOT NULL,
  endpoint TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('api_key', 'ip')),
  scope_value TEXT NOT NULL,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (usage_date, endpoint, scope_type, scope_value)
);

CREATE TABLE IF NOT EXISTS public.sponsor_campaigns (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  sponsor_name TEXT NOT NULL,
  placement TEXT NOT NULL CHECK (
    placement IN ('home', 'schedule', 'artists', 'spotify_events')
  ),
  target_url TEXT NOT NULL,
  cta_label TEXT,
  image_url TEXT,
  package_tier TEXT NOT NULL DEFAULT 'starter' CHECK (
    package_tier IN ('starter', 'pro', 'headline')
  ),
  package_price_usd INTEGER NOT NULL DEFAULT 250,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'active', 'paused', 'archived')
  ),
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  priority INTEGER NOT NULL DEFAULT 100,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sponsor_metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  campaign_id BIGINT NOT NULL REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
  placement TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click')),
  count INTEGER NOT NULL DEFAULT 1,
  last_event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (metric_date, campaign_id, placement, event_type)
);

CREATE TABLE IF NOT EXISTS public.access_codes (
  id BIGSERIAL PRIMARY KEY,
  code_prefix TEXT NOT NULL,
  code_hash TEXT NOT NULL UNIQUE,
  entitlement_type TEXT NOT NULL CHECK (
    entitlement_type IN (
      'REPORT_BASIC',
      'REPORT_FULL',
      'API_PLAN',
      'WIDGET_PLAN',
      'CONCIERGE_SELF_SERVE',
      'CONCIERGE_CURATED'
    )
  ),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'revoked')),
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.report_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by_email TEXT,
  report_tier TEXT NOT NULL CHECK (report_tier IN ('basic', 'full')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  access_code_id BIGINT REFERENCES public.access_codes(id) ON DELETE SET NULL,
  report_payload JSONB,
  csv_payload TEXT,
  pdf_payload_html TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.widget_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT NOT NULL,
  key_prefix TEXT NOT NULL UNIQUE,
  key_hash TEXT NOT NULL UNIQUE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('basic', 'white_label')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'revoked')),
  allowed_domains TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  daily_quota INTEGER NOT NULL DEFAULT 5000,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.widget_usage_daily (
  id BIGSERIAL PRIMARY KEY,
  usage_date DATE NOT NULL,
  widget TEXT NOT NULL CHECK (widget IN ('lineup', 'artists', 'genres')),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('widget_key', 'ip')),
  scope_value TEXT NOT NULL,
  widget_key_id UUID REFERENCES public.widget_keys(id) ON DELETE CASCADE,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (usage_date, widget, scope_type, scope_value)
);

CREATE TABLE IF NOT EXISTS public.concierge_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('self_serve', 'curated')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'ready', 'delivered', 'cancelled', 'failed')
  ),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  selected_date DATE,
  travel_buffer_minutes INTEGER NOT NULL DEFAULT 30,
  selected_event_ids INTEGER[] NOT NULL DEFAULT '{}'::INTEGER[],
  preferences JSONB NOT NULL DEFAULT '{}'::JSONB,
  itinerary_payload JSONB,
  itinerary_ics TEXT,
  itinerary_pdf_html TEXT,
  notes TEXT,
  price_usd INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monetize_leads_offer_status ON public.monetize_leads(offer_type, status);
CREATE INDEX IF NOT EXISTS idx_monetize_leads_created_at ON public.monetize_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON public.api_keys(status);
CREATE INDEX IF NOT EXISTS idx_api_usage_daily_lookup ON public.api_usage_daily(usage_date, endpoint, scope_type, scope_value);
CREATE INDEX IF NOT EXISTS idx_sponsor_campaigns_active ON public.sponsor_campaigns(status, placement, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_sponsor_metrics_lookup ON public.sponsor_metrics(metric_date, campaign_id, event_type);
CREATE INDEX IF NOT EXISTS idx_access_codes_lookup ON public.access_codes(status, entitlement_type, expires_at);
CREATE INDEX IF NOT EXISTS idx_report_jobs_status ON public.report_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_widget_keys_status ON public.widget_keys(status);
CREATE INDEX IF NOT EXISTS idx_widget_usage_daily_lookup ON public.widget_usage_daily(usage_date, widget, scope_type, scope_value);
CREATE INDEX IF NOT EXISTS idx_concierge_orders_status ON public.concierge_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_concierge_orders_email ON public.concierge_orders(customer_email);

DROP TRIGGER IF EXISTS trg_monetize_leads_updated_at ON public.monetize_leads;
CREATE TRIGGER trg_monetize_leads_updated_at
BEFORE UPDATE ON public.monetize_leads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_api_plans_updated_at ON public.api_plans;
CREATE TRIGGER trg_api_plans_updated_at
BEFORE UPDATE ON public.api_plans
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER trg_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_api_usage_daily_updated_at ON public.api_usage_daily;
CREATE TRIGGER trg_api_usage_daily_updated_at
BEFORE UPDATE ON public.api_usage_daily
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_sponsor_campaigns_updated_at ON public.sponsor_campaigns;
CREATE TRIGGER trg_sponsor_campaigns_updated_at
BEFORE UPDATE ON public.sponsor_campaigns
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_sponsor_metrics_updated_at ON public.sponsor_metrics;
CREATE TRIGGER trg_sponsor_metrics_updated_at
BEFORE UPDATE ON public.sponsor_metrics
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_access_codes_updated_at ON public.access_codes;
CREATE TRIGGER trg_access_codes_updated_at
BEFORE UPDATE ON public.access_codes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_report_jobs_updated_at ON public.report_jobs;
CREATE TRIGGER trg_report_jobs_updated_at
BEFORE UPDATE ON public.report_jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_widget_keys_updated_at ON public.widget_keys;
CREATE TRIGGER trg_widget_keys_updated_at
BEFORE UPDATE ON public.widget_keys
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_widget_usage_daily_updated_at ON public.widget_usage_daily;
CREATE TRIGGER trg_widget_usage_daily_updated_at
BEFORE UPDATE ON public.widget_usage_daily
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_concierge_orders_updated_at ON public.concierge_orders;
CREATE TRIGGER trg_concierge_orders_updated_at
BEFORE UPDATE ON public.concierge_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Default plans
INSERT INTO public.api_plans (code, name, monthly_price_usd, daily_quota)
VALUES
  ('starter', 'Starter', 99, 2500),
  ('pro', 'Pro', 299, 10000),
  ('studio', 'Studio', 799, 50000)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price_usd = EXCLUDED.monthly_price_usd,
  daily_quota = EXCLUDED.daily_quota,
  updated_at = NOW();

-- Keep the monetization stack server-writable with anon key flows
ALTER TABLE public.monetize_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_daily DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_usage_daily DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.concierge_orders DISABLE ROW LEVEL SECURITY;
