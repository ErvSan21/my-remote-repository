-- MAC / Sistema Pollo — migración 004
-- Número correlativo de venta (Venta 00001, …).
-- Ervin: pegar en Supabase → SQL Editor → Run.

create sequence if not exists public.consignments_sale_number_seq;

alter table public.consignments
  add column if not exists sale_number integer;

-- Backfill ventas existentes por fecha de registro
with numbered as (
  select
    id,
    row_number() over (order by created_at asc, id asc) as n
  from public.consignments
  where sale_number is null
)
update public.consignments c
set sale_number = numbered.n
from numbered
where c.id = numbered.id;

-- Alinear secuencia al máximo actual
select setval(
  'public.consignments_sale_number_seq',
  coalesce((select max(sale_number) from public.consignments), 0)
);

alter table public.consignments
  alter column sale_number set default nextval('public.consignments_sale_number_seq');

-- Not null solo si ya no quedan nulls
do $$
begin
  if not exists (
    select 1 from public.consignments where sale_number is null
  ) then
    alter table public.consignments
      alter column sale_number set not null;
  end if;
end $$;

create unique index if not exists consignments_sale_number_uidx
  on public.consignments (sale_number);
