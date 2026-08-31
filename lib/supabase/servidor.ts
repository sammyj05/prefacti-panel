import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * El cliente del servidor.
 *
 * Lee la sesión de las cookies de la petición, así que sabe quién pregunta y
 * RLS puede hacer su trabajo. Se crea uno por petición —nunca se guarda en un
 * módulo— porque un cliente compartido entre peticiones serviría la cartera de
 * una empresa a quien pidió la de otra, que es el peor fallo posible en una
 * aplicación con varias empresas dentro.
 *
 * El `set` va envuelto en `try`: en un componente de servidor las cookies son
 * de sólo lectura y escribirlas lanza. Ahí no pasa nada por no escribirlas —el
 * `middleware` ya refrescó la sesión antes de llegar—, y tragarse ese error
 * concreto es lo que recomienda la librería.
 */
export async function clienteServidor() {
  const almacen = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => almacen.getAll(),
        setAll: (galletas) => {
          try {
            galletas.forEach(({ name, value, options }) =>
              almacen.set(name, value, options));
          } catch {
            /* Componente de servidor: las escribe el middleware. */
          }
        },
      },
    },
  );
}

/**
 * Quién pregunta y desde qué empresa.
 *
 * Se usa `getUser()` y no `getSession()`: la sesión sale de la cookie y la
 * cookie la manda el navegador, así que un `getSession` en el servidor se cree
 * cualquier cosa que le pongan delante. `getUser` va al servidor de Supabase a
 * validar el testigo, que es lo único que se puede creer.
 */
export async function quienPregunta() {
  const sb = await clienteServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await sb
    .from("perfil")
    .select("nombre, avatar_url, empresa_activa_id, preferencias")
    .eq("usuario_id", user.id)
    .maybeSingle();

  const { data: miembros } = await sb
    .from("empresa_miembro")
    .select("empresa_id, rol, is_owner, empresa:empresa_id (id, nombre)")
    .eq("usuario_id", user.id)
    .eq("activo", true);

  const empresaActiva = perfil?.empresa_activa_id
    ?? miembros?.[0]?.empresa_id
    ?? null;

  return {
    id: user.id,
    email: user.email ?? "",
    nombre: perfil?.nombre ?? user.email ?? "",
    avatarUrl: perfil?.avatar_url ?? null,
    preferencias: perfil?.preferencias ?? {},
    empresaActiva,
    /** El rol en la empresa activa, que es el que manda en cada pantalla. */
    rol: miembros?.find(m => m.empresa_id === empresaActiva)?.rol ?? null,
    empresas: miembros ?? [],
  };
}
