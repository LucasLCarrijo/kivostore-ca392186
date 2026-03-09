
-- Subscription plans
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  trial_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_product_plan UNIQUE (product_id)
);

-- Subscriptions
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subscription_plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  dunning_attempts INTEGER NOT NULL DEFAULT 0,
  last_dunning_at TIMESTAMPTZ,
  card_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'PENDING',
  due_date TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  payment_id UUID REFERENCES public.payments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- subscription_plans: workspace members can manage via product
CREATE POLICY "Users can manage subscription plans via product"
ON public.subscription_plans FOR ALL TO authenticated
USING (product_id IN (SELECT id FROM products WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())))
WITH CHECK (product_id IN (SELECT id FROM products WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));

-- subscription_plans: public can view
CREATE POLICY "Public can view subscription plans"
ON public.subscription_plans FOR SELECT TO anon
USING (true);

-- subscriptions: workspace members can view
CREATE POLICY "Workspace members can view subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- subscriptions: customers can view own
CREATE POLICY "Customers can view own subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING (customer_id IN (SELECT id FROM customers WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())::text));

-- subscriptions: customers can update own (for cancel)
CREATE POLICY "Customers can cancel own subscriptions"
ON public.subscriptions FOR UPDATE TO authenticated
USING (customer_id IN (SELECT id FROM customers WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())::text));

-- subscriptions: service role full access
CREATE POLICY "Service role manages subscriptions"
ON public.subscriptions FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- invoices: workspace members can view
CREATE POLICY "Workspace members can view invoices"
ON public.invoices FOR SELECT TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- invoices: customers can view own
CREATE POLICY "Customers can view own invoices"
ON public.invoices FOR SELECT TO authenticated
USING (subscription_id IN (SELECT id FROM subscriptions WHERE customer_id IN (SELECT id FROM customers WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())::text)));

-- invoices: service role full access
CREATE POLICY "Service role manages invoices"
ON public.invoices FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- updated_at triggers
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
