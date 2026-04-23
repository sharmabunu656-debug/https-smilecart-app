
-- ============ ROLES ============
create type public.app_role as enum ('admin', 'customer');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users view own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
create policy "admins view all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins manage roles" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ TIMESTAMP HELPER ============
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "users view own profile" on public.profiles
  for select to authenticated using (auth.uid() = user_id);
create policy "users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = user_id);
create policy "users insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = user_id);
create policy "admins view all profiles" on public.profiles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- Auto create profile + customer role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone');
  insert into public.user_roles (user_id, role) values (new.id, 'customer');
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ ADDRESSES ============
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null default 'Home',
  recipient_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  pincode text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.addresses enable row level security;
create index addresses_user_idx on public.addresses(user_id);

create policy "users manage own addresses" on public.addresses
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger addresses_updated_at before update on public.addresses
  for each row execute function public.update_updated_at_column();

-- ============ CATEGORIES ============
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  emoji text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;

create policy "anyone view active categories" on public.categories
  for select to anon, authenticated using (is_active = true);
create policy "admins view all categories" on public.categories
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins manage categories" on public.categories
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ SHOP PRODUCTS ============
create table public.shop_products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  image_url text,
  unit text not null default '1 pc',
  price numeric(10,2) not null check (price >= 0),
  mrp numeric(10,2) not null check (mrp >= 0),
  stock int not null default 0 check (stock >= 0),
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.shop_products enable row level security;
create index shop_products_category_idx on public.shop_products(category_id);
create index shop_products_active_idx on public.shop_products(is_active);

create policy "anyone view active products" on public.shop_products
  for select to anon, authenticated using (is_active = true);
create policy "admins view all products" on public.shop_products
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins manage products" on public.shop_products
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger shop_products_updated_at before update on public.shop_products
  for each row execute function public.update_updated_at_column();

-- ============ CART ============
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references public.shop_products(id) on delete cascade not null,
  qty int not null default 1 check (qty > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);
alter table public.cart_items enable row level security;
create index cart_user_idx on public.cart_items(user_id);

create policy "users manage own cart" on public.cart_items
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger cart_items_updated_at before update on public.cart_items
  for each row execute function public.update_updated_at_column();

-- ============ WISHLIST ============
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references public.shop_products(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
alter table public.wishlist_items enable row level security;
create index wishlist_user_idx on public.wishlist_items(user_id);

create policy "users manage own wishlist" on public.wishlist_items
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ ORDERS ============
create type public.order_status as enum ('placed','confirmed','packed','out_for_delivery','delivered','cancelled');
create type public.payment_method as enum ('cod','upi','card');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  status order_status not null default 'placed',
  payment_method payment_method not null default 'cod',
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  -- snapshot of address at order time
  recipient_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  pincode text not null,
  notes text,
  placed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create index orders_user_idx on public.orders(user_id);
create index orders_status_idx on public.orders(status);

create policy "users view own orders" on public.orders
  for select to authenticated using (auth.uid() = user_id);
create policy "users create own orders" on public.orders
  for insert to authenticated with check (auth.uid() = user_id);
create policy "users cancel own placed orders" on public.orders
  for update to authenticated
  using (auth.uid() = user_id and status in ('placed','confirmed'))
  with check (auth.uid() = user_id and status = 'cancelled');
create policy "admins view all orders" on public.orders
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins update all orders" on public.orders
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger orders_updated_at before update on public.orders
  for each row execute function public.update_updated_at_column();

-- ============ ORDER ITEMS ============
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.shop_products(id) on delete set null,
  product_name text not null,
  unit text not null,
  image_url text,
  unit_price numeric(10,2) not null,
  qty int not null check (qty > 0),
  line_total numeric(10,2) not null
);
alter table public.order_items enable row level security;
create index order_items_order_idx on public.order_items(order_id);

create policy "users view own order items" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "users create own order items" on public.order_items
  for insert to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "admins view all order items" on public.order_items
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
