-- Sistema Pollo — esquema inicial (greenfield)
-- Ejecutar en Supabase SQL Editor o: supabase db push
-- Zona de negocio: America/La_Paz

-- Extensiones
create extension if not exists "pgcrypto";

-- Roles de aplicación
create type public.app_role as enum ('vendedora', 'admin', 'superadmin');
create type public.payment_method as enum ('cash', 'qr', 'on_delivery');
create type public.purchase_status as enum ('pending_price', 'priced', 'partially_paid', 'paid');
create type public.consignment_status as enum ('open', 'partial', 'closed');
create type public.inventory_reason as enum (
  'purchase_in',
  'slaughter_adjust',
  'consignment_out',
  'sale_out',
  'adjustment'
);

-- ---------------------------------------------------------------------------
-- profiles (1:1 con auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  full_name text,
  role public.app_role not null default 'vendedora',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- suppliers
-- ---------------------------------------------------------------------------
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text, -- Santa Cruz | Mairana | Cochabamba | otro
  phone text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index suppliers_name_idx on public.suppliers (name);

-- ---------------------------------------------------------------------------
-- purchases (precio puede ir después)
-- ---------------------------------------------------------------------------
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  purchase_date date not null default (timezone('America/La_Paz', now()))::date,
  quantity_birds integer not null check (quantity_birds > 0),
  unit_price numeric(12, 2), -- null = pendiente de negociar
  total_amount numeric(14, 2), -- null hasta tener precio; idealmente quantity * unit_price
  status public.purchase_status not null default 'pending_price',
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index purchases_supplier_idx on public.purchases (supplier_id);
create index purchases_date_idx on public.purchases (purchase_date);
create index purchases_status_idx on public.purchases (status);

-- ---------------------------------------------------------------------------
-- supplier_payments
-- ---------------------------------------------------------------------------
create table public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  purchase_id uuid references public.purchases (id) on delete set null, -- null = a cuenta
  amount numeric(14, 2) not null check (amount > 0),
  method public.payment_method not null default 'cash',
  paid_at timestamptz not null default now(),
  recorded_by uuid references public.profiles (id),
  notes text,
  created_at timestamptz not null default now()
);

create index supplier_payments_supplier_idx on public.supplier_payments (supplier_id);
create index supplier_payments_purchase_idx on public.supplier_payments (purchase_id);
create index supplier_payments_paid_at_idx on public.supplier_payments (paid_at);

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  zone text, -- La Paz | El Alto | otro
  phone text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_name_idx on public.clients (name);

-- ---------------------------------------------------------------------------
-- consignments
-- ---------------------------------------------------------------------------
create table public.consignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  quantity_birds integer not null check (quantity_birds > 0),
  unit_price numeric(12, 2),
  total_amount numeric(14, 2),
  status public.consignment_status not null default 'open',
  left_at timestamptz not null default now(),
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index consignments_client_idx on public.consignments (client_id);
create index consignments_status_idx on public.consignments (status);

-- ---------------------------------------------------------------------------
-- client_payments + receipts (código único)
-- ---------------------------------------------------------------------------
create table public.client_payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  consignment_id uuid references public.consignments (id) on delete set null,
  amount numeric(14, 2) not null check (amount > 0),
  method public.payment_method not null default 'cash',
  paid_at timestamptz not null default now(),
  recorded_by uuid references public.profiles (id),
  notes text,
  created_at timestamptz not null default now()
);

create index client_payments_client_idx on public.client_payments (client_id);
create index client_payments_consignment_idx on public.client_payments (consignment_id);
create index client_payments_paid_at_idx on public.client_payments (paid_at);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  client_payment_id uuid not null unique references public.client_payments (id) on delete cascade,
  code text not null unique, -- ej. RCP-20260921-A3F9
  issued_at timestamptz not null default now(),
  issued_by uuid references public.profiles (id)
);

create index receipts_code_idx on public.receipts (code);

-- ---------------------------------------------------------------------------
-- inventory
-- ---------------------------------------------------------------------------
create table public.inventory_lots (
  id uuid primary key default gen_random_uuid(),
  label text,
  quantity_birds integer not null default 0 check (quantity_birds >= 0),
  source_purchase_id uuid references public.purchases (id) on delete set null,
  notes text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid references public.inventory_lots (id) on delete set null,
  delta_birds integer not null, -- + entrada / - salida
  reason public.inventory_reason not null,
  ref_purchase_id uuid references public.purchases (id) on delete set null,
  ref_consignment_id uuid references public.consignments (id) on delete set null,
  notes text,
  recorded_by uuid references public.profiles (id),
  moved_at timestamptz not null default now()
);

create index inventory_movements_moved_at_idx on public.inventory_movements (moved_at);

-- Vista simple: pollo disponible
create or replace view public.v_pollo_disponible as
select coalesce(sum(quantity_birds), 0)::integer as quantity_birds
from public.inventory_lots
where closed_at is null;

-- ---------------------------------------------------------------------------
-- Helpers de rol (para RLS)
-- ---------------------------------------------------------------------------
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin_or_above()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and active = true
      and role in ('admin', 'superadmin')
  );
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and active = true
      and role = 'superadmin'
  );
$$;

-- Auto-crear profile al registrar usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'username',
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'vendedora')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Generar código de recibo
create or replace function public.generate_receipt_code()
returns text
language plpgsql
as $$
declare
  stub text;
begin
  stub := to_char(timezone('America/La_Paz', now()), 'YYYYMMDD')
    || '-'
    || upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 4));
  return 'RCP-' || stub;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS (borrador seguro: admins ven todo; vendedora inserta pagos)
-- Ajustar políticas al cablear CRUD real.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchases enable row level security;
alter table public.supplier_payments enable row level security;
alter table public.clients enable row level security;
alter table public.consignments enable row level security;
alter table public.client_payments enable row level security;
alter table public.receipts enable row level security;
alter table public.inventory_lots enable row level security;
alter table public.inventory_movements enable row level security;

-- profiles
create policy profiles_select_own_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin_or_above());

create policy profiles_update_superadmin on public.profiles
  for update using (public.is_superadmin());

-- Lectura/escritura admin+ en catálogos
create policy suppliers_admin_all on public.suppliers
  for all using (public.is_admin_or_above()) with check (public.is_admin_or_above());

create policy purchases_admin_all on public.purchases
  for all using (public.is_admin_or_above()) with check (public.is_admin_or_above());

create policy clients_admin_all on public.clients
  for all using (public.is_admin_or_above()) with check (public.is_admin_or_above());

create policy consignments_admin_all on public.consignments
  for all using (public.is_admin_or_above()) with check (public.is_admin_or_above());

create policy inventory_lots_admin_all on public.inventory_lots
  for all using (public.is_admin_or_above()) with check (public.is_admin_or_above());

create policy inventory_movements_admin_all on public.inventory_movements
  for all using (public.is_admin_or_above()) with check (public.is_admin_or_above());

-- Pagos: admin todo; vendedora solo insert (+ select propio opcional)
create policy supplier_payments_admin_all on public.supplier_payments
  for all using (public.is_admin_or_above()) with check (public.is_admin_or_above());

create policy supplier_payments_vendedora_insert on public.supplier_payments
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and active and role = 'vendedora'
    )
  );

create policy client_payments_admin_all on public.client_payments
  for all using (public.is_admin_or_above()) with check (public.is_admin_or_above());

create policy client_payments_vendedora_insert on public.client_payments
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and active and role = 'vendedora'
    )
  );

create policy receipts_admin_all on public.receipts
  for all using (public.is_admin_or_above()) with check (public.is_admin_or_above());

create policy receipts_vendedora_insert on public.receipts
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and active and role = 'vendedora'
    )
  );

-- Nota: vendedora no tiene SELECT amplio de deudas/totales a propósito.
-- Si necesita elegir a quién cobrar, añadir vistas mínimas o políticas acotadas en un sprint posterior.
