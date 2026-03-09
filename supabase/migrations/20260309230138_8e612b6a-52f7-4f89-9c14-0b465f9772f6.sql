
-- Fix the "Buyers can view entitled products" policy that references auth.users directly
DROP POLICY IF EXISTS "Buyers can view entitled products" ON public.products;

CREATE POLICY "Buyers can view entitled products" ON public.products
FOR SELECT
USING (
  id IN (
    SELECT e.product_id
    FROM entitlements e
    JOIN customers c ON e.customer_id = c.id
    WHERE c.email = (auth.jwt() ->> 'email')
      AND e.revoked_at IS NULL
  )
);
