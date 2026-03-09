
-- Add missing columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS checkout_session_id uuid REFERENCES public.checkout_sessions(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number text UNIQUE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal_amount numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS affiliate_link_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Order items table
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  price_id uuid NOT NULL REFERENCES public.prices(id),
  quantity int NOT NULL DEFAULT 1,
  unit_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  is_order_bump boolean NOT NULL DEFAULT false,
  is_upsell boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Entitlements table
CREATE TABLE public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

-- Upsell offers table
CREATE TABLE public.upsell_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_product_id uuid NOT NULL REFERENCES public.products(id),
  upsell_product_id uuid NOT NULL REFERENCES public.products(id),
  type text NOT NULL DEFAULT 'UPSELL',
  headline text,
  description text,
  special_price numeric NOT NULL DEFAULT 0,
  position int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Order bumps table
CREATE TABLE public.order_bumps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  main_product_id uuid NOT NULL REFERENCES public.products(id),
  bump_product_id uuid NOT NULL REFERENCES public.products(id),
  headline text,
  description text,
  position int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger for upsell type
CREATE OR REPLACE FUNCTION public.validate_upsell_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.type NOT IN ('UPSELL', 'DOWNSELL') THEN
    RAISE EXCEPTION 'Invalid upsell type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_upsell_type_trigger
  BEFORE INSERT OR UPDATE ON public.upsell_offers
  FOR EACH ROW EXECUTE FUNCTION public.validate_upsell_type();

-- RLS for order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view order items" ON public.order_items
  FOR SELECT TO anon USING (
    order_id IN (SELECT id FROM orders)
  );

CREATE POLICY "Users can view order items of their workspaces" ON public.order_items
  FOR SELECT TO authenticated USING (
    order_id IN (
      SELECT o.id FROM orders o
      WHERE o.workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members WHERE workspace_members.user_id = auth.uid())
    )
  );

-- RLS for entitlements
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view entitlements by customer" ON public.entitlements
  FOR SELECT TO anon USING (true);

CREATE POLICY "Users can view entitlements of their workspaces" ON public.entitlements
  FOR SELECT TO authenticated USING (
    order_id IN (
      SELECT o.id FROM orders o
      WHERE o.workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members WHERE workspace_members.user_id = auth.uid())
    )
  );

-- RLS for upsell_offers
ALTER TABLE public.upsell_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active upsell offers" ON public.upsell_offers
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Users can manage upsell offers" ON public.upsell_offers
  FOR ALL TO authenticated USING (
    trigger_product_id IN (
      SELECT p.id FROM products p
      WHERE p.workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members WHERE workspace_members.user_id = auth.uid())
    )
  );

-- RLS for order_bumps
ALTER TABLE public.order_bumps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active order bumps" ON public.order_bumps
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Users can manage order bumps" ON public.order_bumps
  FOR ALL TO authenticated USING (
    main_product_id IN (
      SELECT p.id FROM products p
      WHERE p.workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members WHERE workspace_members.user_id = auth.uid())
    )
  );

-- Generate order number function
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'KOR-' || to_char(now(), 'YYYYMMDD') || '-' || substr(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();
