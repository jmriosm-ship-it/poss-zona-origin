-- =====================================================================
-- Zona Originals · Punto de venta — base de datos en Supabase
-- Pega TODO este archivo en Supabase > SQL Editor > New query y dale "Run".
-- Se puede ejecutar más de una vez sin problema.
-- =====================================================================

-- 1) Una sola tabla guarda todo: productos, ventas, compras, clientes, gastos, cierres de caja, etc.
--    Cada fila es un registro de la app (columna "data") y pertenece a la cuenta del negocio.
create table if not exists public.registros (
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  coleccion   text        not null,                      -- 'productos', 'ventas', 'compras', 'clientes', 'gastos', ...
  id          text        not null,                      -- el mismo id que usa la app
  data        jsonb,                                     -- el registro completo (null si fue borrado)
  t           bigint      not null,                      -- cuándo se cambió por última vez (milisegundos, lo pone la app)
  borrado     boolean     not null default false,        -- true = el registro se eliminó (así los demás computadores se enteran)
  actualizado timestamptz not null default now(),        -- lo pone el servidor; sirve para pedir solo lo nuevo
  primary key (user_id, coleccion, id)
);

create index if not exists registros_nuevos_idx on public.registros (user_id, coleccion, actualizado);

-- El servidor marca la hora de cada cambio (así no importa si un computador tiene la hora mal puesta)
create or replace function public.tocar_actualizado() returns trigger
language plpgsql as $$
begin
  new.actualizado = now();
  return new;
end;
$$;

drop trigger if exists registros_tocar on public.registros;
create trigger registros_tocar
  before insert or update on public.registros
  for each row execute function public.tocar_actualizado();

-- 2) Seguridad: cada cuenta solo puede ver y cambiar SUS propios datos.
alter table public.registros enable row level security;

drop policy if exists "cada usuario ve solo lo suyo" on public.registros;
create policy "cada usuario ve solo lo suyo"
  on public.registros
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 2b) Función que usa la app para subir cambios. Si otro computador ya guardó una versión MÁS NUEVA del
--     mismo registro, no la pisa (gana siempre el cambio más reciente).
create or replace function public.subir_registros(filas jsonb) returns integer
language plpgsql
security invoker
as $$
declare
  cantidad integer;
begin
  insert into public.registros as r (user_id, coleccion, id, data, t, borrado)
  select
    auth.uid(),
    f ->> 'coleccion',
    f ->> 'id',
    nullif(f -> 'data', 'null'::jsonb),
    (f ->> 't')::bigint,
    coalesce((f ->> 'borrado')::boolean, false)
  from jsonb_array_elements(filas) as f
  on conflict (user_id, coleccion, id) do update
    set data = excluded.data,
        t = excluded.t,
        borrado = excluded.borrado
    where r.t <= excluded.t;

  get diagnostics cantidad = row_count;
  return cantidad;
end;
$$;

revoke execute on function public.subir_registros(jsonb) from public, anon;
grant execute on function public.subir_registros(jsonb) to authenticated;
