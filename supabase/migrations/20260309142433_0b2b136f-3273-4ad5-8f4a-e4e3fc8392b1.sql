
-- Coupons table
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'PERCENT' CHECK (type IN ('PERCENT', 'FIXED')),
  value NUMERIC NOT NULL DEFAULT 0,
  min_order_amount NUMERIC DEFAULT NULL,
  max_uses INTEGER DEFAULT NULL,
  max_uses_per_customer INTEGER NOT NULL DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, code)
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Workspace members can manage coupons
CREATE POLICY "Users can manage coupons of their workspaces"
  ON public.coupons FOR ALL TO authenticated
  USING (workspace_id IN (
    SELECT workspace_members.workspace_id FROM workspace_members
    WHERE workspace_members.user_id = auth.uid()
  ))
  WITH CHECK (workspace_id IN (
    SELECT workspace_members.workspace_id FROM workspace_members
    WHERE workspace_members.user_id = auth.uid()
  ));

-- Public can read active coupons (for checkout validation)
CREATE POLICY "Public can view active coupons"
  ON public.coupons FOR SELECT TO anon
  USING (is_active = true);

-- Coupon usage tracking table
CREATE TABLE public.coupon_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, order_id)
);

ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view coupon usages of their workspaces"
  ON public.coupon_usages FOR SELECT TO authenticated
  USING (coupon_id IN (
    SELECT c.id FROM coupons c
    WHERE c.workspace_id IN (
      SELECT workspace_members.workspace_id FROM workspace_members
      WHERE workspace_members.user_id = auth.uid()
    )
  ));

CREATE POLICY "Service role can manage coupon usages"
  ON public.coupon_usages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Index
CREATE INDEX idx_coupons_workspace ON public.coupons (workspace_id);
CREATE INDEX idx_coupons_code ON public.coupons (code);
CREATE INDEX idx_coupon_usages_email ON public.coupon_usages (customer_email, coupon_id);

-- Updated at trigger
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
