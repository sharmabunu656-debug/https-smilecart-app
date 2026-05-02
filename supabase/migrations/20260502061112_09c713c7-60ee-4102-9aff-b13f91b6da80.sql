-- Enforce stock limits at order placement to prevent overselling
CREATE OR REPLACE FUNCTION public.enforce_stock_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.cart_items ci
    JOIN public.shop_products sp ON sp.id = ci.product_id
    WHERE ci.user_id = NEW.user_id
      AND (sp.is_active = false OR ci.qty > sp.stock)
  ) THEN
    RAISE EXCEPTION 'One or more items in your cart exceed available stock';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_stock_limits_trigger ON public.orders;
CREATE TRIGGER enforce_stock_limits_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_stock_limits();

-- Also guard cart_items writes against requesting more than current stock
CREATE OR REPLACE FUNCTION public.enforce_cart_qty_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available INTEGER;
  active BOOLEAN;
BEGIN
  SELECT stock, is_active INTO available, active
  FROM public.shop_products
  WHERE id = NEW.product_id;

  IF NOT FOUND OR active = false THEN
    RAISE EXCEPTION 'Product is not available';
  END IF;

  IF NEW.qty > available THEN
    RAISE EXCEPTION 'Requested quantity exceeds available stock';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_cart_qty_limits_trigger ON public.cart_items;
CREATE TRIGGER enforce_cart_qty_limits_trigger
BEFORE INSERT OR UPDATE ON public.cart_items
FOR EACH ROW
EXECUTE FUNCTION public.enforce_cart_qty_limits();