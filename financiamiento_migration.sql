-- Phase 3: Financing module for third-party financed fincas.
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query)
-- before using the new Financiamiento page or the financiada fields on Fincas.
--
-- Uses `IF NOT EXISTS` everywhere so it's safe to re-run.

-- 1. New financing fields on fincas (only meaningful when tipo = 'financiada')
alter table fincas add column if not exists productor_nombre text;
alter table fincas add column if not exists porcentaje_ganancia_productor numeric;
alter table fincas add column if not exists interes_aplica boolean not null default false;
alter table fincas add column if not exists tasa_interes numeric;
-- 'anual' or 'mensual' — added per your clarification that the rate period
-- should be choosable rather than assumed. Simple interest, prorated daily,
-- recalculated after every movement (see calcularSaldoFinanciamiento in
-- src/lib/formulas.js for the exact math).
alter table fincas add column if not exists tasa_interes_periodo text not null default 'anual';

-- 2. New table: financiamientos (the adelanto/abono/aporte ledger)
create table if not exists financiamientos (
  id uuid primary key default gen_random_uuid(),
  finca_id uuid not null references fincas(id) on delete cascade,
  ciclo_id uuid references ciclos(id) on delete set null,
  fecha date not null,
  tipo text not null check (tipo in ('adelanto', 'abono', 'aporte')),
  monto numeric not null default 0,
  concepto text,
  notas text,
  created_at timestamptz not null default now()
);

create index if not exists financiamientos_finca_id_idx on financiamientos(finca_id);
create index if not exists financiamientos_ciclo_id_idx on financiamientos(ciclo_id);

-- 3. Row Level Security — copy whatever policy your other tables
-- (gastos_campo, basculas, etc.) already use if this default doesn't match
-- your project's setup. This mirrors "any authenticated user can do
-- anything," which is what every other table's working behavior implies.
alter table financiamientos enable row level security;

drop policy if exists "financiamientos_authenticated_all" on financiamientos;
create policy "financiamientos_authenticated_all" on financiamientos
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
