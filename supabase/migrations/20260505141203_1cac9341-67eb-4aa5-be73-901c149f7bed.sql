
-- Trigger functions: only the trigger system needs to call these
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_order_totals() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_stock_limits() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_cart_qty_limits() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_order_item_pricing() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- has_any_admin is only used after sign-in to gate the bootstrap UI
REVOKE EXECUTE ON FUNCTION public.has_any_admin() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_any_admin() TO authenticated;
