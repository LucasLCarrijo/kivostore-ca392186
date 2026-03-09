
-- Create certificates table
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  course_name text NOT NULL,
  creator_name text,
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  pdf_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(customer_id, product_id)
);

-- RLS policies
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Students can view their own certificates
CREATE POLICY "Students can view own certificates"
ON public.certificates FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT c.id FROM customers c
    WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  )
);

-- Workspace owners can view certificates
CREATE POLICY "Workspace owners can view certificates"
ON public.certificates FOR SELECT
TO authenticated
USING (
  product_id IN (
    SELECT p.id FROM products p
    WHERE p.workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  )
);

-- Service role can manage certificates
CREATE POLICY "Service role manages certificates"
ON public.certificates FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
