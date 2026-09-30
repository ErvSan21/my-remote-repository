-- Sistema Pollo — 012: datos detallados de clientes y proveedores
-- Nombre y apellido por separado, empresa y si se muestra la empresa en vez de la persona.
-- `name` sigue siendo el nombre que se ve en toda la app (persona o empresa).

alter table public.clients
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists company_name text,
  add column if not exists show_company boolean not null default false;

-- Proveedores: persona y empresa por separado (`name` sigue siendo lo que se ve).
alter table public.suppliers
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists company_name text;
