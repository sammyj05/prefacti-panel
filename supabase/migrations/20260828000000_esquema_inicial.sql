-- ============================================================================
-- Prefacti — esquema inicial.
--
-- Sale de las entidades que ya tiene el producto en Base44
-- (`base44/entities/*.jsonc`), no de un modelo inventado aquí: si algún día
-- hay que traer los datos de allá, las columnas ya se llaman igual.
--
-- La pieza que ordena todo es la empresa. Cada fila de cada tabla lleva su
-- `empresa_id` y nadie ve una fila de una empresa a la que no pertenece — eso
-- lo garantiza RLS, no la aplicación. Es la misma regla que Base44 escribe como
-- `data.empresa_id = {{user.data.active_empresa_id}}`, sólo que aquí vive en la
-- base y no en el cliente.
--
-- El estudio de factibilidad NO se normaliza: vive en `version.datos` como
-- jsonb, igual que en Base44. Son cuadro de áreas, presupuesto por partidas,
-- flujo mes a mes y parámetros — un árbol que cambia con cada tipo de proyecto
-- y que la aplicación lee entero de una vez. Partirlo en veinte tablas daría
-- veinte joins para pintar una ficha y ninguna consulta que aproveche el corte.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enumerados
create type rol_miembro   as enum ('admin', 'editor', 'analista', 'visualizador');
create type tipo_proyecto as enum ('torre', 'casas');
create type estado_proyecto as enum ('En estudio', 'Aprobado', 'Activo', 'Finalizado', 'Archivado');
create type categoria_recurso as enum ('plano', 'documento', 'referencia', 'contrato', 'estudio', 'otro');
create type recurrencia_hito as enum ('ninguna', 'mensual', 'trimestral');

-- ------------------------------------------------------------------ empresas
create table empresa (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  descripcion      text,
  industria        text check (industria in
                     ('desarrollo_inmobiliario','construccion','inversiones',
                      'correduria','arquitectura','otros')),
  telefono         text,
  email_contacto   text,
  sitio_web        text,
  direccion        text,
  ciudad           text,
  pais             text default 'PA',
  ruc              text,
  logo_url         text,
  activo           boolean not null default true,
  creada_en        timestamptz not null default now()
);

-- Quién pertenece a qué empresa y con qué rol.
create table empresa_miembro (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references empresa(id) on delete cascade,
  usuario_id            uuid references auth.users(id) on delete cascade,
  usuario_email         text not null,
  usuario_nombre        text,
  rol                   rol_miembro not null default 'visualizador',
  is_owner              boolean not null default false,
  activo                boolean not null default true,
  invitado_por          text,
  invitada_en           timestamptz,
  reenvio_solicitado_en timestamptz,
  creado_en             timestamptz not null default now(),
  -- Una persona entra una vez por empresa. Sin esto, dos invitaciones al mismo
  -- correo dejan a alguien con dos roles y gana el que lea primero la consulta.
  unique (empresa_id, usuario_email)
);

create index on empresa_miembro (usuario_id);
create index on empresa_miembro (empresa_id);

-- La empresa en la que está trabajando cada persona ahora mismo, y sus
-- preferencias de interfaz. Una fila por usuario.
create table perfil (
  usuario_id         uuid primary key references auth.users(id) on delete cascade,
  nombre             text,
  telefono           text,
  avatar_url         text,
  empresa_activa_id  uuid references empresa(id) on delete set null,
  preferencias       jsonb not null default '{}'::jsonb,
  creado_en          timestamptz not null default now()
);

-- ----------------------------------------------------------------- proyectos
create table proyecto (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresa(id) on delete cascade,
  nombre      text not null,
  tipo        tipo_proyecto not null default 'torre',
  estado      estado_proyecto not null default 'En estudio',
  ubicacion   text,
  responsable text,
  creado_en   timestamptz not null default now(),
  creado_por  uuid references auth.users(id) on delete set null
);

create index on proyecto (empresa_id);

-- El estudio, versionado.
--
-- `publicada` es lo que hace comparable una cartera: una versión publicada ya
-- no cambia, así que dos promociones se comparan sabiendo que ninguna de las
-- dos se movió por debajo mientras se miraba.
create table version (
  id           uuid primary key default gen_random_uuid(),
  proyecto_id  uuid not null references proyecto(id) on delete cascade,
  empresa_id   uuid not null references empresa(id) on delete cascade,
  fecha        date not null default current_date,
  notas        text,
  datos        jsonb not null,
  editado_por  text,
  publicada    boolean not null default false,
  creada_en    timestamptz not null default now()
);

create index on version (proyecto_id, creada_en desc);
create index on version (empresa_id);

create table escenario_simulador (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresa(id) on delete cascade,
  proyecto_id uuid not null references proyecto(id) on delete cascade,
  nombre      text not null,
  nota        text,
  overrides   jsonb not null default '{}'::jsonb,
  creado_en   timestamptz not null default now()
);

create index on escenario_simulador (proyecto_id);

-- -------------------------------------------------------------------- hitos
create table tipo_hito (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete cascade,
  nombre     text not null,
  color      text check (color in
               ('ambar','azul','esmeralda','violeta','rosa','cian','naranja','gris'))
             default 'azul'
);

create table hito (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references empresa(id) on delete cascade,
  proyecto_id       uuid references proyecto(id) on delete cascade,
  titulo            text not null,
  fecha             date not null,
  tipo              text not null,
  responsable       text,
  notas             text,
  recurrencia       recurrencia_hito not null default 'ninguna',
  recurrencia_hasta date,
  cumplidas         jsonb not null default '[]'::jsonb,
  recordatorios     jsonb not null default '[]'::jsonb,
  creado_en         timestamptz not null default now()
);

create index on hito (empresa_id, fecha);
create index on hito (proyecto_id);

-- ---------------------------------------------------------------- recursos
create table carpeta (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresa(id) on delete cascade,
  nombre      text not null,
  proyecto_id uuid references proyecto(id) on delete cascade,
  parent_id   uuid references carpeta(id) on delete cascade,
  creada_en   timestamptz not null default now()
);

create table recurso (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references empresa(id) on delete cascade,
  proyecto_id  uuid references proyecto(id) on delete cascade,
  carpeta_id   uuid references carpeta(id) on delete set null,
  nombre       text not null,
  descripcion  text,
  categoria    categoria_recurso not null default 'documento',
  tipo_archivo text,
  file_url     text not null,
  preview_url  text,
  tamano       bigint,
  subido_por   text,
  subido_en    timestamptz not null default now()
);

create index on recurso (empresa_id);
create index on recurso (proyecto_id);

-- --------------------------------------------------------------- actividad
create table bitacora (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresa(id) on delete cascade,
  proyecto_id uuid references proyecto(id) on delete set null,
  usuario     text not null,
  rol         text,
  accion      text not null,
  detalle     text,
  ocurrio_en  timestamptz not null default now()
);

create index on bitacora (empresa_id, ocurrio_en desc);

create table notificacion (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresa(id) on delete cascade,
  usuario_id  uuid references auth.users(id) on delete cascade,
  titulo      text not null,
  cuerpo      text,
  severidad   text not null default 'media',
  proyecto_id uuid references proyecto(id) on delete cascade,
  leida_en    timestamptz,
  creada_en   timestamptz not null default now()
);

create index on notificacion (usuario_id, creada_en desc);

-- ============================================================================
-- Quién ve qué.
--
-- Dos funciones y una regla. `es_miembro` decide la lectura y `puede_editar`
-- la escritura, que es exactamente el corte que hace Base44: leer va con
-- pertenecer, escribir va con el rol.
--
-- Van con `security definer` y `search_path` fijo. Lo primero porque la propia
-- consulta a `empresa_miembro` está bajo RLS y, sin ello, la política se
-- llamaría a sí misma; lo segundo porque una función `security definer` con el
-- `search_path` de quien la invoca es la forma clásica de que alguien cuele su
-- propia tabla `empresa_miembro` delante de la de verdad.
-- ============================================================================

create or replace function es_miembro(p_empresa uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from empresa_miembro m
    where m.empresa_id = p_empresa
      and m.usuario_id = auth.uid()
      and m.activo
  );
$$;

create or replace function puede_editar(p_empresa uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from empresa_miembro m
    where m.empresa_id = p_empresa
      and m.usuario_id = auth.uid()
      and m.activo
      and m.rol in ('admin', 'editor')
  );
$$;

create or replace function es_admin(p_empresa uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from empresa_miembro m
    where m.empresa_id = p_empresa
      and m.usuario_id = auth.uid()
      and m.activo
      and m.rol = 'admin'
  );
$$;

alter table empresa            enable row level security;
alter table empresa_miembro    enable row level security;
alter table perfil             enable row level security;
alter table proyecto           enable row level security;
alter table version            enable row level security;
alter table escenario_simulador enable row level security;
alter table tipo_hito          enable row level security;
alter table hito               enable row level security;
alter table carpeta            enable row level security;
alter table recurso            enable row level security;
alter table bitacora           enable row level security;
alter table notificacion       enable row level security;

-- La empresa: la ven sus miembros; la cambian sus administradores.
create policy empresa_lee    on empresa for select using (es_miembro(id));
create policy empresa_cambia on empresa for update using (es_admin(id)) with check (es_admin(id));

-- El alta de empresa la hace una función, no un `insert` suelto: crear la
-- empresa y meterse dentro como propietario tiene que pasar entero o no pasar.
create policy empresa_crea on empresa for insert with check (false);

-- Los miembros: cada quien ve el equipo de sus empresas; sólo el administrador
-- da de alta, cambia el rol o saca a alguien.
create policy miembro_lee on empresa_miembro for select
  using (usuario_id = auth.uid() or es_miembro(empresa_id));
create policy miembro_alta on empresa_miembro for insert with check (es_admin(empresa_id));
create policy miembro_cambia on empresa_miembro for update
  using (es_admin(empresa_id)) with check (es_admin(empresa_id));
create policy miembro_baja on empresa_miembro for delete using (es_admin(empresa_id));

-- El perfil es de cada quien.
create policy perfil_lee    on perfil for select using (usuario_id = auth.uid());
create policy perfil_crea   on perfil for insert with check (usuario_id = auth.uid());
create policy perfil_cambia on perfil for update
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- Y el resto, todas iguales: leer con pertenecer, escribir con el rol.
do $$
declare t text;
begin
  foreach t in array array[
    'proyecto','version','escenario_simulador','tipo_hito','hito',
    'carpeta','recurso','bitacora'
  ] loop
    execute format(
      'create policy %1$s_lee on %1$s for select using (es_miembro(empresa_id))', t);
    execute format(
      'create policy %1$s_crea on %1$s for insert with check (puede_editar(empresa_id))', t);
    execute format(
      'create policy %1$s_cambia on %1$s for update using (puede_editar(empresa_id)) '
      'with check (puede_editar(empresa_id))', t);
    execute format(
      'create policy %1$s_borra on %1$s for delete using (es_admin(empresa_id))', t);
  end loop;
end $$;

-- El aviso es de quien lo recibe.
create policy notificacion_lee on notificacion for select
  using (usuario_id = auth.uid() and es_miembro(empresa_id));
create policy notificacion_cambia on notificacion for update
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- ============================================================================
-- El alta.
--
-- Crear la empresa, meter a quien la crea como administrador y propietario, y
-- dejársela como empresa activa. Las tres cosas o ninguna: una empresa sin
-- miembros no la ve nadie —ni quien la acaba de crear— y hay que ir a la base a
-- rescatarla.
-- ============================================================================

create or replace function crear_empresa(p_nombre text, p_industria text default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa uuid;
  v_email   text;
begin
  if auth.uid() is null then
    raise exception 'hay que haber entrado para crear una empresa';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  insert into empresa (nombre, industria)
  values (p_nombre, p_industria)
  returning id into v_empresa;

  insert into empresa_miembro (empresa_id, usuario_id, usuario_email, rol, is_owner)
  values (v_empresa, auth.uid(), v_email, 'admin', true);

  insert into perfil (usuario_id, empresa_activa_id)
  values (auth.uid(), v_empresa)
  on conflict (usuario_id) do update set empresa_activa_id = excluded.empresa_activa_id;

  insert into bitacora (empresa_id, usuario, rol, accion, detalle)
  values (v_empresa, v_email, 'admin', 'Creó la empresa', p_nombre);

  return v_empresa;
end $$;

-- Cuando alguien se registra, se le abre el perfil y se le enlaza cualquier
-- invitación pendiente que hubiera a su correo. Sin esto, invitar a alguien que
-- todavía no tiene cuenta deja una fila con `usuario_id` nulo que no le sirve
-- de nada cuando por fin entra.
create or replace function al_crear_usuario()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into perfil (usuario_id, nombre)
  values (new.id, new.raw_user_meta_data ->> 'nombre')
  on conflict (usuario_id) do nothing;

  update empresa_miembro
     set usuario_id = new.id
   where usuario_email = new.email
     and usuario_id is null;

  update perfil
     set empresa_activa_id = (
       select empresa_id from empresa_miembro
        where usuario_id = new.id and activo
        order by creado_en limit 1)
   where usuario_id = new.id
     and empresa_activa_id is null;

  return new;
end $$;

create trigger crear_perfil_al_registrarse
  after insert on auth.users
  for each row execute function al_crear_usuario();
