
-- Affiliate Programs (one per workspace)
CREATE TABLE public.affiliate_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_enabled boolean NOT NULL DEFAULT false,
  attribution_model text NOT NULL DEFAULT 'LAST_CLICK',
  cookie_duration_days integer NOT NULL DEFAULT 30,
  default_commission_percent numeric NOT NULL DEFAULT 20,
  min_payout_amount numeric NOT NULL DEFAULT 50,
  hold_days integer NOT NULL DEFAULT 14,
  auto_approve boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own affiliate program" ON public.affiliate_programs FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('OWNER','ADMIN')));

CREATE POLICY "Public can view enabled programs" ON public.affiliate_programs FOR SELECT
  USING (is_enabled = true);

-- Affiliates
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  name text NOT NULL,
  phone text,
  pix_key text,
  bank_account jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'PENDING',
  application_note text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email)
);

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners can manage affiliates" ON public.affiliates FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('OWNER','ADMIN')));

CREATE POLICY "Affiliates can view own record" ON public.affiliates FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Affiliates can update own record" ON public.affiliates FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Public can insert affiliate applications" ON public.affiliates FOR INSERT
  WITH CHECK (true);

-- Affiliate Links
CREATE TABLE public.affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  click_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners can manage affiliate links" ON public.affiliate_links FOR ALL
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));

CREATE POLICY "Affiliates can view own links" ON public.affiliate_links FOR SELECT
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

CREATE POLICY "Public can view affiliate links by code" ON public.affiliate_links FOR SELECT
  USING (true);

-- Affiliate Attributions
CREATE TABLE public.affiliate_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_link_id uuid REFERENCES public.affiliate_links(id) ON DELETE CASCADE NOT NULL,
  session_id text,
  ip_address text,
  expires_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners can view attributions" ON public.affiliate_attributions FOR SELECT
  USING (affiliate_link_id IN (SELECT id FROM affiliate_links WHERE affiliate_id IN (SELECT id FROM affiliates WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))));

CREATE POLICY "Public can insert attributions" ON public.affiliate_attributions FOR INSERT
  WITH CHECK (true);

-- Commission Rules (per product override)
CREATE TABLE public.commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL UNIQUE,
  percent numeric NOT NULL DEFAULT 20,
  fixed_amount numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners can manage commission rules" ON public.commission_rules FOR ALL
  USING (product_id IN (SELECT id FROM products WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));

-- Commissions
CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  amount numeric NOT NULL DEFAULT 0,
  hold_until timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners can manage commissions" ON public.commissions FOR ALL
  USING (order_id IN (SELECT id FROM orders WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));

CREATE POLICY "Affiliates can view own commissions" ON public.commissions FOR SELECT
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

-- Payouts
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  total_amount numeric NOT NULL DEFAULT 0,
  method text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners can manage payouts" ON public.payouts FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('OWNER','ADMIN')));

CREATE POLICY "Affiliates can view own payouts" ON public.payouts FOR SELECT
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

-- Payout Items
CREATE TABLE public.payout_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid REFERENCES public.payouts(id) ON DELETE CASCADE NOT NULL,
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  commission_id uuid REFERENCES public.commissions(id) ON DELETE CASCADE NOT NULL UNIQUE,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners can manage payout items" ON public.payout_items FOR ALL
  USING (payout_id IN (SELECT id FROM payouts WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));

-- Auto-generate affiliate link code
CREATE OR REPLACE FUNCTION public.generate_affiliate_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := lower(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_generate_affiliate_code
  BEFORE INSERT ON public.affiliate_links
  FOR EACH ROW EXECUTE FUNCTION public.generate_affiliate_code();

-- Updated_at triggers
CREATE TRIGGER tr_affiliate_programs_updated
  BEFORE UPDATE ON public.affiliate_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER tr_affiliates_updated
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER tr_commissions_updated
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER tr_payouts_updated
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
