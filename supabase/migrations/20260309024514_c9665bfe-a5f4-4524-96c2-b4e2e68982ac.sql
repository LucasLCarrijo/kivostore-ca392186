
-- Customers table
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  phone text,
  cpf text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email)
);

-- Checkout sessions table
CREATE TABLE public.checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id),
  status text NOT NULL DEFAULT 'OPEN',
  email text,
  currency text NOT NULL DEFAULT 'BRL',
  subtotal_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  coupon_code text,
  affiliate_link_id uuid,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  ip_address text,
  expires_at timestamptz,
  completed_at timestamptz,
  abandoned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Checkout line items table
CREATE TABLE public.checkout_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id uuid NOT NULL REFERENCES public.checkout_sessions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  price_id uuid NOT NULL REFERENCES public.prices(id),
  quantity int NOT NULL DEFAULT 1,
  unit_amount numeric NOT NULL DEFAULT 0,
  is_order_bump boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies for customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert customers" ON public.customers
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Users can view customers of their workspaces" ON public.customers
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members WHERE workspace_members.user_id = auth.uid())
  );

CREATE POLICY "Users can update customers of their workspaces" ON public.customers
  FOR UPDATE TO authenticated USING (
    workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members WHERE workspace_members.user_id = auth.uid())
  );

-- RLS policies for checkout_sessions
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert checkout sessions" ON public.checkout_sessions
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Public can update checkout sessions" ON public.checkout_sessions
  FOR UPDATE TO anon USING (true);

CREATE POLICY "Public can view checkout sessions" ON public.checkout_sessions
  FOR SELECT TO anon USING (true);

CREATE POLICY "Users can view checkout sessions of their workspaces" ON public.checkout_sessions
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members WHERE workspace_members.user_id = auth.uid())
  );

-- RLS policies for checkout_line_items
ALTER TABLE public.checkout_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert checkout line items" ON public.checkout_line_items
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Public can view checkout line items" ON public.checkout_line_items
  FOR SELECT TO anon USING (true);

CREATE POLICY "Users can view checkout line items of their workspaces" ON public.checkout_line_items
  FOR SELECT TO authenticated USING (
    checkout_session_id IN (
      SELECT cs.id FROM checkout_sessions cs 
      WHERE cs.workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members WHERE workspace_members.user_id = auth.uid())
    )
  );

-- Updated_at triggers
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checkout_sessions_updated_at BEFORE UPDATE ON public.checkout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
