import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresco de sesión y puerta del panel.
 *
 * Hace dos cosas y las dos hacen falta.
 *
 * La primera es refrescar el testigo. Caduca en una hora, y sin alguien que lo
 * renueve antes de cada petición, quien deja la pestaña abierta se encuentra la
 * pantalla vacía sin haber cerrado sesión. `getUser()` lo renueva de paso, y
 * hay que copiar las cookies que devuelve tanto a la petición como a la
 * respuesta: a la petición para que la página que viene detrás vea la sesión ya
 * fresca, y a la respuesta para que el navegador se quede con ella.
 *
 * La segunda es cerrar el panel. La portada, la entrada y el alta son públicas;
 * el resto no. Sin esto, `/proyectos` se pinta entero antes de que RLS devuelva
 * cero filas, y lo que se ve es una cartera vacía en vez de la entrada — que se
 * lee como que se han perdido los datos.
 *
 * Mientras no haya proyecto configurado el middleware no hace nada: la
 * aplicación sigue funcionando con la cartera local, que es lo que permite
 * traer esto por partes en vez de de golpe.
 */

const PUBLICAS = ["/", "/entrar", "/registro", "/clave", "/auth"];
const ESCAPARATE = ["/clasico", "/moderna", "/movil", "/volumen", "/wild"];

export async function middleware(peticion: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clave) return NextResponse.next();

  let respuesta = NextResponse.next({ request: peticion });

  const sb = createServerClient(url, clave, {
    cookies: {
      getAll: () => peticion.cookies.getAll(),
      setAll: (galletas) => {
        galletas.forEach(({ name, value }) => peticion.cookies.set(name, value));
        respuesta = NextResponse.next({ request: peticion });
        galletas.forEach(({ name, value, options }) =>
          respuesta.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await sb.auth.getUser();

  const ruta = peticion.nextUrl.pathname;
  const abierta = PUBLICAS.some(p => ruta === p || ruta.startsWith(p + "/"))
    || ESCAPARATE.includes(ruta);

  if (!user && !abierta) {
    const destino = peticion.nextUrl.clone();
    destino.pathname = "/entrar";
    /* De dónde venía, para devolverle ahí después de entrar en vez de soltarle
       siempre en la portada de la cartera. */
    destino.searchParams.set("volver", ruta);
    return NextResponse.redirect(destino);
  }

  return respuesta;
}

export const config = {
  matcher: [
    /* Todo menos los estáticos de Next, las fuentes y las imágenes: no tienen
       sesión que refrescar y son la mayoría de las peticiones. */
    "/((?!_next/static|_next/image|favicon.ico|fonts/|mapa/|.*\\.(?:png|jpg|jpeg|svg|webp|woff2|json)$).*)",
  ],
};
