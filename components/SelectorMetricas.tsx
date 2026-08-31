"use client";

import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { METRICAS, MAXIMO } from "@/lib/metricas";
import { Casilla, Menu } from "@/components/ui";

/** Una entrada del catálogo: la clave, su nombre y qué contesta. */
type Entrada = { k: string; t: string; d: string };

/**
 * Elegir qué cifras lleva cada ficha.
 *
 * Sirve a dos sitios con el mismo control: las cifras de apoyo de cada ficha y
 * las del panel de cartera. Sin catálogo usa el de la ficha; con él, cualquier
 * otro. Dos desplegables idénticos con distinto contenido se habrían separado a
 * la primera corrección.
 *
 * El contador del botón —«3 de 6»— es lo que hace innecesario explicar la
 * regla. Cuando quedan seis marcadas, las demás se apagan en vez de
 * desaparecer: quitar una opción de la vista es peor que enseñarla inerte,
 * porque el lector no sabe si se fue o si nunca estuvo.
 *
 * El cierre lo lleva `Menu`, y con él se va un fallo que este control tenía: el
 * suyo escuchaba `click` en la ventana, así que marcar una casilla cerraba el
 * panel. Entre el `mousedown` y el `click` la lista se reordenaba, el elemento
 * bajo el cursor cambiaba, y el destino del evento ya no estaba dentro del
 * desplegable. Marcar tres cifras exigía abrirlo tres veces.
 */
export function SelectorMetricas({
  claves,
  alternar,
  restablecer,
  catalogo = METRICAS.map(m => ({ k: m.k, t: m.t, d: m.d })),
  maximo = MAXIMO,
  rotulo = "Cifras de la ficha",
  ayuda = `El margen va siempre en el anillo. Elige hasta ${MAXIMO} de apoyo.`,
  boton = "Métricas",
}: {
  claves: string[];
  alternar: (k: never) => void;
  restablecer: () => void;
  /** Sin catálogo, el de la ficha de proyecto. Con él, cualquier otro. */
  catalogo?: Entrada[];
  maximo?: number;
  rotulo?: string;
  ayuda?: string;
  /**
   * Lo que dice el botón. Los dos selectores salían en la misma pantalla
   * llamándose «Métricas» los dos —uno gobierna el panel de arriba y el otro
   * las fichas de abajo— y con el mismo dibujo y el mismo rótulo no había forma
   * de saber cuál tocaba sin probar.
   */
  boton?: string;
}) {
  const lleno = claves.length >= maximo;

  return (
    <Menu
      rotulo={rotulo}
      ancho={340}
      lado="derecha"
      disparador={({ alternar: abrir, aria }) => (
        <button
          onClick={abrir}
          {...aria}
          className="flex h-9 items-center gap-2 rounded-[9px] border border-trazo-medio
                     bg-hueso-alto px-3.5 text-[14px] font-medio text-tinta-900
                     transition hover:bg-hueso-mesa"
        >
          <SlidersHorizontal className="h-4 w-4 text-tinta-400" aria-hidden />
          {boton}
          <span className="tabular-nums font-libro text-tinta-400">{claves.length} de {maximo}</span>
        </button>
      )}
    >
      {() => (
        <div className="p-2">
          <div className="flex items-baseline justify-between gap-3 px-1.5 pb-1.5">
            <p className="nota text-tinta-400">{rotulo}</p>
            <button
              onClick={restablecer}
              className="flex items-center gap-1.5 text-[12.5px] text-tinta-400
                         transition hover:text-tinta-950"
            >
              <RotateCcw className="h-3 w-3" aria-hidden /> Por defecto
            </button>
          </div>

          <p className="px-1.5 pb-2.5 text-[12.5px] leading-snug text-tinta-500">{ayuda}</p>

          <div className="max-h-[46vh] overflow-y-auto pr-0.5">
            {catalogo.map(m => {
              const on = claves.includes(m.k);
              return (
                <Casilla
                  key={m.k}
                  marcada={on}
                  deshabilitada={lleno && !on}
                  alCambiar={() => alternar(m.k as never)}
                  rotulo={m.t}
                  detalle={m.d}
                />
              );
            })}
          </div>
        </div>
      )}
    </Menu>
  );
}
