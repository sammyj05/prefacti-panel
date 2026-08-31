-- ============================================================================
-- La empresa se crea al registrarse, no al entrar.
--
-- El alta estaba partida en dos llamadas desde el navegador: `signUp` y después
-- `crear_empresa()`. Eso sólo funciona si `signUp` deja sesión abierta, y no la
-- deja cuando el proyecto pide confirmar el correo —que es el ajuste por
-- defecto y el que conviene dejar puesto—. Resultado: la cuenta se creaba, la
-- empresa no, y quien confirmaba su correo entraba a una aplicación que no le
-- dejaba ver nada porque no pertenecía a ninguna empresa.
--
-- Ahora el nombre de la empresa viaja en los metadatos del alta y el disparador
-- —que se ejecuta con permisos de definidor, sin necesitar sesión— crea las
-- tres filas de una vez: empresa, membresía de propietario y perfil con esa
-- empresa abierta. Cuando la persona confirma y entra, ya está todo.
-- ============================================================================

create or replace function al_crear_usuario()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa   uuid;
  v_nombre    text := nullif(trim(new.raw_user_meta_data ->> 'empresa'), '');
  v_industria text := nullif(trim(new.raw_user_meta_data ->> 'industria'), '');
begin
  insert into perfil (usuario_id, nombre)
  values (new.id, new.raw_user_meta_data ->> 'nombre')
  on conflict (usuario_id) do nothing;

  /* Una invitación pendiente manda sobre todo lo demás: si alguien ya fue
     invitado a una empresa, se le engancha a ésa y no se le abre otra. */
  update empresa_miembro
     set usuario_id = new.id
   where usuario_email = new.email
     and usuario_id is null;

  if not exists (select 1 from empresa_miembro where usuario_id = new.id)
     and v_nombre is not null then
    insert into empresa (nombre, industria)
    values (v_nombre,
            case when v_industria in ('desarrollo_inmobiliario','construccion',
                                      'inversiones','correduria','arquitectura','otros')
                 then v_industria else null end)
    returning id into v_empresa;

    insert into empresa_miembro (empresa_id, usuario_id, usuario_email, rol, is_owner)
    values (v_empresa, new.id, new.email, 'admin', true);

    insert into bitacora (empresa_id, usuario, rol, accion, detalle)
    values (v_empresa, new.email, 'admin', 'Creó la empresa', v_nombre);
  end if;

  update perfil
     set empresa_activa_id = (
       select empresa_id from empresa_miembro
        where usuario_id = new.id and activo
        order by creado_en limit 1)
   where usuario_id = new.id
     and empresa_activa_id is null;

  return new;
end $$;

-- Y las que se quedaron a medias: cuentas ya creadas sin empresa ninguna. Sin
-- esto, quien se registró antes de este cambio no puede entrar nunca.
do $$
declare u record;
begin
  for u in
    select id, email, raw_user_meta_data ->> 'empresa' as empresa
      from auth.users
     where not exists (select 1 from empresa_miembro m where m.usuario_id = auth.users.id)
  loop
    if nullif(trim(coalesce(u.empresa, '')), '') is null then continue; end if;

    with nueva as (
      insert into empresa (nombre) values (trim(u.empresa)) returning id
    )
    insert into empresa_miembro (empresa_id, usuario_id, usuario_email, rol, is_owner)
    select id, u.id, u.email, 'admin', true from nueva;

    insert into perfil (usuario_id, empresa_activa_id)
    select u.id, empresa_id from empresa_miembro where usuario_id = u.id
    on conflict (usuario_id) do update set empresa_activa_id = excluded.empresa_activa_id;
  end loop;
end $$;
