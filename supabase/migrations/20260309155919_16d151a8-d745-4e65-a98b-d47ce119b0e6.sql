
-- =============================================
-- 1. NEW TABLES: tags, product_tags, sessions, api_keys, audit_logs
-- =============================================

-- TAGS
CREATE TABLE public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, slug)
);

CREATE INDEX idx_tags_workspace ON public.tags(workspace_id);

-- PRODUCT_TAGS (join table)
CREATE TABLE public.product_tags (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

-- SESSIONS
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  ip_address text,
  user_agent text,
  device_fingerprint text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_token ON public.sessions(token);
CREATE INDEX idx_sessions_expires_at ON public.sessions(expires_at);

-- API_KEYS
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  prefix text NOT NULL,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_workspace ON public.api_keys(workspace_id);

-- AUDIT_LOGS
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_workspace_created ON public.audit_logs(workspace_id, created_at);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- =============================================
-- 2. ALTER EXISTING TABLES to match Prisma schema
-- =============================================

-- REFUNDS: add missing columns
ALTER TABLE public.refunds
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS requested_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- UPSELL_OFFERS: add missing columns
ALTER TABLE public.upsell_offers
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- SUBSCRIPTION_PLANS: align with Prisma schema (add workspace_id, price_id, name, description, is_active)
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS price_id uuid REFERENCES public.prices(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_subscription_plans_workspace_active ON public.subscription_plans(workspace_id, is_active);

-- WEBHOOK_EVENTS: add missing columns
ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS headers jsonb,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

-- Make external_event_id NOT NULL and add unique constraint
ALTER TABLE public.webhook_events ALTER COLUMN external_event_id SET NOT NULL;
ALTER TABLE public.webhook_events ALTER COLUMN payload SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'webhook_events_provider_external_event_id_key'
  ) THEN
    ALTER TABLE public.webhook_events ADD CONSTRAINT webhook_events_provider_external_event_id_key UNIQUE(provider, external_event_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_webhook_events_workspace_created ON public.webhook_events(workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_type ON public.webhook_events(provider, event_type);

-- PRODUCT_MEDIA: add size_bytes
ALTER TABLE public.product_media
  ADD COLUMN IF NOT EXISTS size_bytes integer;

-- =============================================
-- 3. RLS POLICIES for new tables
-- =============================================

-- TAGS RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage tags in their workspaces"
  ON public.tags FOR ALL TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ))
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- PRODUCT_TAGS RLS
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage product tags in their workspaces"
  ON public.product_tags FOR ALL TO authenticated
  USING (product_id IN (
    SELECT id FROM public.products WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (product_id IN (
    SELECT id FROM public.products WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ));

-- SESSIONS RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
  ON public.sessions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- API_KEYS RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own API keys"
  ON public.api_keys FOR ALL TO authenticated
  USING (user_id = auth.uid() AND workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
  ))
  WITH CHECK (user_id = auth.uid() AND workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
  ));

-- AUDIT_LOGS RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs in their workspaces"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
  ));

CREATE POLICY "Service role can insert audit logs"
  ON public.audit_logs FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert audit logs for their workspaces"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- =============================================
-- 4. Updated_at triggers for altered tables
-- =============================================

CREATE TRIGGER set_refunds_updated_at
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_upsell_offers_updated_at
  BEFORE UPDATE ON public.upsell_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
