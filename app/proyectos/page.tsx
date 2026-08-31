import { estadoCartera, empresaDeLaSesion } from "@/lib/cartera";
import { Bienvenida } from "@/components/Bienvenida";
import { CarteraReal } from "@/components/CarteraReal";
import { Cartera } from "@/components/Cartera";

/**
 * Cartera, o bienvenida.
 *
 * Esta página era el panel entero y ahora sólo decide cuál de las tres cosas
 * toca. La decisión se toma en el servidor porque depende de una consulta con
 * la sesión de quien pregunta —RLS— y porque enseñar una pantalla y cambiarla
 * un instante después es el parpadeo que hace que una aplicación parezca rota
 * justo cuando alguien la abre por primera vez.
 *
 *   demostracion  no hay proyecto de Supabase configurado; va la cartera fija
 *                 con su consolidado completo, como hasta ahora.
 *   vacia         la empresa se acaba de abrir; va la guía.
 *   cartera       la empresa tiene promociones; van las suyas, de la base.
 */
export default async function Proyectos() {
  const estado = await estadoCartera();

  if (estado.modo === "demostracion") return <Cartera />;
  if (estado.modo === "vacia") return <Bienvenida empresa={estado.empresa} />;

  const empresa = await empresaDeLaSesion();
  return <CarteraReal proyectos={estado.proyectos} empresa={empresa?.nombre ?? null} />;
}
