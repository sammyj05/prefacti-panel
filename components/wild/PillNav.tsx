"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TemaToggle } from "@/components/TemaToggle";
import { MenuEstilo } from "@/components/SelectorEstilo";

/**
 * Barra flotante.
 *
 * Va suelta sobre el contenido en vez de ocupar una banda propia: la portada
 * es una sola imagen a pantalla completa y una cabecera con fondo la partiría
 * en dos. Flotando, la matriz sigue entera por debajo.
 *
 * El vidrio no es decoración. Sobre un fondo que cambia de color celda a celda
 * ningún tono plano funciona — o se pierde sobre el blanco o tapa el rojo. El
 * desenfoque toma el color de lo que tiene detrás, así que la barra se lee
 * igual sobre cualquier parte de la matriz.
 */

/* Para quien llega de fuera: primero qué es, luego el ejemplo. Los enlaces a
   Mapa y Gráficos, que sólo significan algo con una cartera dentro, se quedan
   en el panel. */
const ENLACES = [
  ["Producto", "/#producto"],
  ["Módulos", "/#modulos"],
  ["Demo", "/proyectos"],
] as const;

export function PillNav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-4 z-50 flex justify-center px-4"
    >
      <div className="cristal flex items-center gap-1 rounded-full p-1.5 pl-2">
        <Link href="/" className="grid h-8 w-8 place-items-center rounded-full bg-vidrio-tope
                                  font-display text-[16px] leading-none text-tinta-950">
          P
        </Link>

        {ENLACES.map(([t, h]) => (
          <Link
            key={h}
            href={h}
            className="rounded-full px-3.5 py-1.5 text-[14px] font-medio text-tinta-700
                       transition hover:bg-vidrio-alto hover:text-tinta-950"
          >
            {t}
          </Link>
        ))}

        <MenuEstilo />
        <TemaToggle className="h-8 w-8 rounded-full" />

        <Link
          href="/entrar"
          className="ml-1 rounded-full bg-tinta-950 px-4 py-1.5 text-[14px] font-medio
                     text-hueso transition hover:bg-tinta-900"
        >
          Entrar
        </Link>
      </div>
    </motion.nav>
  );
}
