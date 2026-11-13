-- ============================================================
-- Sistema de Estadias - Esquema inicial
-- Ejecutar en Supabase: SQL Editor > New query
--
-- NOTA: la autenticacion usa Supabase Auth (auth.users).
-- La tabla perfiles se vincula por email con auth.users.
-- password_hash es una columna legacy; el codigo escribe el
-- marcador 'supabase-auth' por compatibilidad.
-- ============================================================

create table if not exists carreras (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  codigo text,
  created_at timestamptz not null default now()
);

create table if not exists perfiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  nombre text not null,
  rol text not null check (rol in ('admin','director','revisor','docente','estudiante')),
  carrera_id uuid references carreras(id) on delete set null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists memorias_documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  resumen text,
  estudiante_nombre text not null,
  estudiante_id uuid references perfiles(id) on delete set null,
  carrera_id uuid references carreras(id) on delete set null,
  docente_id uuid references perfiles(id) on delete set null,
  revisor_id uuid references perfiles(id) on delete set null,
  archivo_url text,
  estado text not null default 'recibido' check (estado in
    ('recibido','en_revision','con_observaciones','aprobado','almacenado')),
  fecha_aprobacion timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists memorias_observaciones (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references memorias_documentos(id) on delete cascade,
  autor_id uuid references perfiles(id) on delete set null,
  texto text not null,
  resuelta boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists memorias_historial (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references memorias_documentos(id) on delete cascade,
  usuario_id uuid references perfiles(id) on delete set null,
  accion text not null,
  comentario text,
  created_at timestamptz not null default now()
);

create index if not exists idx_documentos_estado on memorias_documentos(estado);
create index if not exists idx_documentos_carrera on memorias_documentos(carrera_id);
create index if not exists idx_obs_documento on memorias_observaciones(documento_id);
create index if not exists idx_hist_documento on memorias_historial(documento_id);

-- updated_at automatico
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_documentos_updated on memorias_documentos;
create trigger trg_documentos_updated before update on memorias_documentos
  for each row execute function set_updated_at();
