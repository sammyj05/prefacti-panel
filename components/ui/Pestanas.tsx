"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { cx, MUELLE } from "@/lib/ui";

/**
 * Las pestañas.
 *
 * Había cuatro juegos en el panel —la banda, el detalle de proyecto, las vistas
 * de cartera y las dos caras de la entrada— y cada uno repetía el mismo truco
 * del indicador que viaja con `layoutId`, con una constante de muelle distinta
 * en cada sitio. Se movían los cuatro a velocidades diferentes, que es
 * exactamente lo que hace que una interfaz no parezca de una sola mano.
 *
 * El indicador viaja porque el movimiento dice de dónde vienes: aparecer y
 * desaparecer bajo dos pestañas distintas cuenta la mitad de la historia.
 *
 * Lleva teclado de verdad —flechas para moverse, inicio y fin para los
 * extremos— y sólo la pestaña activa entra en el orden de tabulación, que es lo
 * que el patrón de pestañas exige: el tabulador salta al contenido, no recorre
 * las siete pestañas una a una.
 */

export type Pestana = { k: string; t: React.ReactNode; n?: number; deshabilitada?: boolean };

export function Pestanas({
  pestanas, activa, alElegir, id, forma = "filete", className,
}: {
  pestanas: Pestana[];
  activa: string;
  alElegir: (k: string) => void;
  /** Identifica el indicador. Dos juegos de pestañas en pantalla necesitan dos. */
  id: string;
  /** `filete` subraya; `pastilla` rellena. Lo segundo, para filtros. */
  forma?: "filete" | "pastilla";
  className?: string;
}) {
  const fila = useRef<HTMLDivElement>(null);

  const teclado = (e: React.KeyboardEvent) => {
    const vivas = pestanas.filter(p => !p.deshabilitada);
    const i = vivas.findIndex(p => p.k === activa);
    let s = -1;
    if (e.key === "ArrowRight") s = (i + 1) % vivas.length;
    if (e.key === "ArrowLeft") s = (i - 1 + vivas.length) % vivas.length;
    if (e.key === "Home") s = 0;
    if (e.key === "End") s = vivas.length - 1;
    if (s < 0) return;
    e.preventDefault();
    alElegir(vivas[s].k);
    /* El foco sigue a la selección: sin esto, la flecha cambia la pestaña pero
       el foco se queda en la anterior y la siguiente flecha salta desde el
       sitio equivocado. */
    fila.current?.querySelector<HTMLElement>(`[data-k="${vivas[s].k}"]`)?.focus();
  };

  return (
    <div
      ref={fila}
      role="tablist"
      onKeyDown={teclado}
      /* `min-w-0`: la fila se desplaza dentro de sí misma, pero como casilla de
         flex no baja de su ancho mínimo sin esto, y entonces lo que se desplaza
         es la página. Se vio con las cinco métricas de Gráficos, que dentro de
         la cabecera medían 420 px en un teléfono de 320. */
      className={cx(
        "sin-barra flex min-w-0 max-w-full items-center overflow-x-auto",
        forma === "filete" ? "gap-6 border-b border-trazo-fino" : "gap-1",
        className,
      )}
    >
      {pestanas.map(p => {
        const on = p.k === activa;
        return (
          <button
            key={p.k}
            data-k={p.k}
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            disabled={p.deshabilitada}
            onClick={() => alElegir(p.k)}
            className={cx(
              "relative flex shrink-0 items-center gap-2 whitespace-nowrap transition-colors",
              "disabled:pointer-events-none disabled:opacity-40",
              forma === "filete"
                ? "-mb-px border-b-2 border-transparent pb-2.5 pt-1 text-[14px]"
                : "rounded-full px-3.5 py-1.5 text-[13.5px]",
              on ? "font-medio text-tinta-950" : "font-libro text-tinta-500 hover:text-tinta-950",
            )}
          >
            {on && forma === "filete" && (
              <motion.span
                layoutId={`pestana-${id}`}
                transition={MUELLE}
                className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-tinta-950"
              />
            )}
            {on && forma === "pastilla" && (
              <motion.span
                layoutId={`pestana-${id}`}
                transition={MUELLE}
                className="absolute inset-0 -z-10 rounded-full bg-hueso-mesa
                           shadow-[inset_0_0_0_1px_var(--trazo-fino)]"
              />
            )}
            {p.t}
            {p.n !== undefined && (
              <span className={cx("tabular-nums", on ? "text-tinta-500" : "text-tinta-400")}>
                {p.n}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
