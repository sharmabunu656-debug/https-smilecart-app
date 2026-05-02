-- 1) Server-side recompute of order totals to prevent client price tampering
CREATE OR REPLACE FUNCTION public.enforce_order_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  computed_subtotal NUMERIC := 0;
  computed_delivery NUMERIC := 0;
  computed_total NUMERIC := 0;
BEGIN
  -- Sum subtotal from current cart_items × authoritative product prices
  SELECT COALESCE(SUM(sp.price * ci.qty), 0)
    INTO computed_subtotal
  FROM public.cart_items ci
  JOIN public.shop_products sp ON sp.id = ci.product_id
  WHERE ci.user_id = NEW.user_id
    AND sp.is_active = true;

  -- Free delivery over ₹199 (matches checkout UI rule); no delivery fee for empty carts
  IF computed_subtotal = 0 OR computed_subtotal >= 199 THEN
    computed_delivery := 0;
  ELSE
    computed_delivery := 25;
  END IF;

  computed_total := computed_subtotal + computed_delivery;

  -- Overwrite client-supplied financial fields with server-trusted values
  NEW.subtotal := computed_subtotal;
  NEW.delivery_fee := computed_delivery;
  NEW.total := computed_total;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_order_totals_trg ON public.orders;
CREATE TRIGGER enforce_order_totals_trg
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_order_totals();

-- 2) Restrictive defense-in-depth policy on user_roles:
-- Only admins may write to user_roles, regardless of any other permissive policy.
DROP POLICY IF EXISTS "only admins write roles" ON public.user_roles;
CREATE POLICY "only admins write roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Admin-only UPDATE / DELETE on order_items so admins can correct orders
DROP POLICY IF EXISTS "admins update order items" ON public.order_items;
CREATE POLICY "admins update order items"
ON public.order_items
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admins delete order items" ON public.order_items;
CREATE POLICY "admins delete order items"
ON public.order_items
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));