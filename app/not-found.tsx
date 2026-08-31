import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { EDIFICIOS } from "@/lib/data";
import { Pagina } from "@/components/Pagina";

/**
 * Página no encontrada.
 *
 * No había ninguna, así que un enlace roto caía en la de serie de Next: fondo
 * negro, `404` en Helvetica y nada más. Fuera de sitio en cualquier producto, y
 * más aquí, donde el 404 más probable no es un error de quien navega sino un
 * identificador de promoción que ya no existe — un `/proyectos/CDE-99` copiado
 * de un correo viejo.
 *
 * Por eso lleva salidas y no sólo una disculpa: la cartera, el buscador y la
 * portada. Se renderiza dentro del chasis, así que la banda de navegación sigue
 * ahí y no hay que volver atrás para ir a ningún sitio.
 */
export default function NoEncontrada() {
  return (
    <div>
      <Pagina
        titulo="Aquí no hay nada"
        bajada="La dirección no corresponde a ninguna pantalla de la aplicación. Puede que la promoción se haya archivado, o que el enlace venga cortado."
      />

      <div className="seccion rounded-caja p-8">
        <p className="nota">Salidas</p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link href="/proyectos" className="boton boton-tinta">
            <ArrowLeft className="h-4 w-4" /> Volver a la cartera
          </Link>
          <Link href="/graficos" className="boton">
            <Search className="h-4 w-4" /> Buscar en los {EDIFICIOS.length} proyectos
          </Link>
          <Link href="/" className="boton">Portada</Link>
        </div>

        <p className="mt-8 border-t border-trazo-fino pt-6 text-[13px] text-tinta-400">
          Si llegaste desde un enlace de dentro de la aplicación, es un fallo nuestro:
          la bitácora del proyecto guarda quién movió qué.
        </p>
      </div>
    </div>
  );
}
