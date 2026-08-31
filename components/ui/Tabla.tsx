"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { cx } from "@/lib/ui";

/**
 * La tabla.
 *
 * Lo que le faltaba a las seis del panel no era estilo sino comportamiento:
 * ninguna ordenaba, ninguna fijaba la cabecera al desplazar, y todas repetían
 * a mano la misma sarta de clases —`whitespace-nowrap px-4 py-3 text-right
 * tabular-nums`— celda por celda, de modo que cualquier columna a la que se le
 * olvidara `tabular-nums` bailaba respecto a las de al lado.
 *
 * Tres decisiones la sostienen:
 *
 * 1. Las cifras a la derecha y en cifra tabular; el texto a la izquierda. No es
 *    gusto: las cantidades se comparan por la unidad, y alineadas a la izquierda
 *    hay que leerlas enteras para saber cuál es mayor.
 * 2. La cabecera se queda pegada arriba. Una tabla de dieciocho filas cabe en
 *    pantalla; una de doscientas partidas de presupuesto, no, y sin cabecera fija
 *    a la fila noventa ya no se sabe qué columna es cuál.
 * 3. Ordenar es un botón en la propia cabecera, con la flecha del sentido. Un
 *    desplegable de ordenación aparte obliga a mirar a otro sitio para cambiar
 *    algo que se decide mirando la columna.
 *
 * La ordenación se queda dentro: `useOrden` devuelve la lista ya ordenada y el
 * estado que la cabecera necesita. Quien la usa sólo declara de qué columna sale
 * cada valor.
 */

export type Columna<T> = {
  k: string;
  t: string;
  /** Sin esto la columna no ordena. Devuelve el valor bruto, no el formateado. */
  valor?: (f: T) => string | number;
  /** Alineación. Por omisión, las que ordenan por número van a la derecha. */
  fin?: boolean;
  /** Ancho fijo, para que la tabla no se recomponga al filtrar. */
  ancho?: number;
  celda: (f: T) => React.ReactNode;
};

/**
 * El estado de ordenación.
 *
 * Tres pasos y no dos: ascendente, descendente y sin ordenar. El tercero es el
 * que casi nunca se pone y el que hace falta — volver al orden natural de la
 * lista sin recargar la página.
 */
export function useOrden<T>(filas: T[], columnas: Columna<T>[], inicial?: string) {
  const [clave, setClave] = useState<string | null>(inicial ?? null);
  const [desc, setDesc] = useState(true);

  const ordenadas = useMemo(() => {
    const c = columnas.find(x => x.k === clave);
    if (!c?.valor) return filas;
    const v = c.valor;
    return [...filas].sort((a, b) => {
      const x = v(a), y = v(b);
      const s = typeof x === "number" && typeof y === "number"
        ? x - y
        : String(x).localeCompare(String(y), "es");
      return desc ? -s : s;
    });
  }, [filas, columnas, clave, desc]);

  const pulsar = (k: string) => {
    if (k !== clave) { setClave(k); setDesc(true); return; }
    /* Segunda pulsación invierte; tercera quita la ordenación. */
    if (desc) setDesc(false);
    else { setClave(null); setDesc(true); }
  };

  return { filas: ordenadas, clave, desc, pulsar };
}

export function Tabla<T>({
  filas, columnas, clave, desc, pulsar, claveFila, alto,
}: {
  filas: T[];
  columnas: Columna<T>[];
  clave?: string | null;
  desc?: boolean;
  pulsar?: (k: string) => void;
  claveFila: (f: T) => string;
  /** Alto máximo. Con él la cabecera se fija y el cuerpo se desplaza dentro. */
  alto?: number | string;
}) {
  return (
    <div
      className="overflow-auto rounded-pieza border border-trazo-fino bg-hueso-alto"
      style={{ maxHeight: alto }}
    >
      <table className="w-full border-collapse text-[13.5px]">
        <thead className="sticky top-0 z-10">
          <tr>
            {columnas.map(c => {
              const ordena = Boolean(c.valor && pulsar);
              const on = clave === c.k;
              const Flecha = !on ? ChevronsUpDown : desc ? ChevronDown : ChevronUp;
              return (
                <th
                  key={c.k}
                  scope="col"
                  style={{ width: c.ancho }}
                  aria-sort={!ordena ? undefined : on ? (desc ? "descending" : "ascending") : "none"}
                  className={cx(
                    "whitespace-nowrap border-b border-trazo-fino bg-hueso-alto px-4",
                    "py-[var(--fila-y)] nota font-semibold",
                    c.fin ? "text-right" : "text-left",
                  )}
                >
                  {ordena ? (
                    <button
                      onClick={() => pulsar!(c.k)}
                      className={cx(
                        "group inline-flex items-center gap-1 transition-colors",
                        c.fin && "flex-row-reverse",
                        on ? "text-tinta-950" : "hover:text-tinta-900",
                      )}
                    >
                      {c.t}
                      <Flecha
                        className={cx(
                          "h-3 w-3 shrink-0 transition-opacity",
                          on ? "opacity-100" : "opacity-0 group-hover:opacity-60",
                        )}
                        aria-hidden
                      />
                    </button>
                  ) : c.t}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {filas.map(f => (
            <tr
              key={claveFila(f)}
              className="border-b border-trazo-fino transition-colors last:border-0
                         hover:bg-hueso-mesa/60"
            >
              {columnas.map(c => (
                <td
                  key={c.k}
                  /* El relleno vertical sale del eje de densidad, no de una
                     clase fija: es lo que hace que la preferencia «Compacta»
                     de Configuración cambie algo de verdad. */
                  className={cx(
                    "whitespace-nowrap px-4 py-[var(--fila-y)]",
                    c.fin ? "text-right tabular-nums" : "text-left",
                  )}
                >
                  {c.celda(f)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
