
-- 1) has_any_admin: lets the UI safely check if any admin exists without exposing role rows
CREATE OR REPLACE FUNCTION public.has_any_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin');
$$;

REVOKE ALL ON FUNCTION public.has_any_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_any_admin() TO anon, authenticated;

-- 2) Defense-in-depth: force order_items.unit_price/line_total to authoritative product price
CREATE OR REPLACE FUNCTION public.enforce_order_item_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  authoritative_price NUMERIC;
  product_active BOOLEAN;
  product_name TEXT;
  product_unit TEXT;
  product_image TEXT;
BEGIN
  IF NEW.product_id IS NULL THEN
    RAISE EXCEPTION 'order_items.product_id is required';
  END IF;

  SELECT price, is_active, name, unit, image_url
    INTO authoritative_price, product_active, product_name, product_unit, product_image
  FROM public.shop_products
  WHERE id = NEW.product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown product';
  END IF;

  NEW.unit_price := authoritative_price;
  NEW.line_total := authoritative_price * NEW.qty;
  NEW.product_name := COALESCE(NEW.product_name, product_name);
  NEW.unit := COALESCE(NEW.unit, product_unit);
  NEW.image_url := COALESCE(NEW.image_url, product_image);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_order_item_pricing ON public.order_items;
CREATE TRIGGER trg_enforce_order_item_pricing
BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_item_pricing();

-- 3) Atomic place_order: server-side cart snapshot, stock decrement, order + items
CREATE OR REPLACE FUNCTION public.place_order(
  p_address_id uuid,
  p_payment_method payment_method,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_addr public.addresses%ROWTYPE;
  v_order_id uuid;
  v_item RECORD;
  v_updated INTEGER;
  v_cart_count INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Address must belong to the caller
  SELECT * INTO v_addr FROM public.addresses
  WHERE id = p_address_id AND user_id = v_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery address not found';
  END IF;

  -- Cart must be non-empty
  SELECT COUNT(*) INTO v_cart_count
  FROM public.cart_items ci
  JOIN public.shop_products sp ON sp.id = ci.product_id
  WHERE ci.user_id = v_user AND sp.is_active = true;

  IF v_cart_count = 0 THEN
    RAISE EXCEPTION 'Your cart is empty';
  END IF;

  -- Atomically decrement stock for every cart row; abort on any shortfall
  FOR v_item IN
    SELECT ci.product_id, ci.qty, sp.name
    FROM public.cart_items ci
    JOIN public.shop_products sp ON sp.id = ci.product_id
    WHERE ci.user_id = v_user
  LOOP
    UPDATE public.shop_products
       SET stock = stock - v_item.qty
     WHERE id = v_item.product_id
       AND is_active = true
       AND stock >= v_item.qty;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
      RAISE EXCEPTION 'Not enough stock for %', v_item.name;
    END IF;
  END LOOP;

  -- Create the order (enforce_order_totals trigger recomputes monetary fields)
  INSERT INTO public.orders (
    user_id, status, payment_method, subtotal, delivery_fee, total,
    recipient_name, phone, line1, line2, city, state, pincode, notes
  ) VALUES (
    v_user, 'placed', p_payment_method, 0, 0, 0,
    v_addr.recipient_name, v_addr.phone, v_addr.line1, v_addr.line2,
    v_addr.city, v_addr.state, v_addr.pincode, NULLIF(p_notes, '')
  )
  RETURNING id INTO v_order_id;

  -- Insert order items from server-side cart snapshot (pricing trigger sets prices)
  INSERT INTO public.order_items (order_id, product_id, product_name, unit, image_url, unit_price, qty, line_total)
  SELECT v_order_id, sp.id, sp.name, sp.unit, sp.image_url, sp.price, ci.qty, sp.price * ci.qty
  FROM public.cart_items ci
  JOIN public.shop_products sp ON sp.id = ci.product_id
  WHERE ci.user_id = v_user;

  -- Clear the cart
  DELETE FROM public.cart_items WHERE user_id = v_user;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.place_order(uuid, payment_method, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, payment_method, text) TO authenticated;

-- 4) Block direct customer inserts on orders/order_items; force use of place_order
DROP POLICY IF EXISTS "users create own orders" ON public.orders;
DROP POLICY IF EXISTS "users create own order items" ON public.order_items;
