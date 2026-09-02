"use client";

import { useMemo, useState } from "react";
import { formatPercent } from "@/lib/motor/calculations.js";
import { calcularUmbrales, leerMargenObjetivo, TOLERANCIA } from "@/lib/motor/umbrales.js";
import { formatMoneda } from "@/lib/motor/localizacion.js";
import type { DatosEstudio } from "@/lib/estudioLocal";
import type { Resultado } from "./useEstudio";
import { CampoNum } from "./campos";

/**
 * Umbrales y puntos de quiebre: hasta dónde aguanta el proyecto.
 *
 * Búsqueda binaria sobre el motor de factibilidad —máximo 30 iteraciones,
 * tolerancia de una centésima de punto—. Si el objetivo no se alcanza dentro
 * del rango explorado se dice con palabras: un número inventado aquí es peor
 * que un «—».
 */
export function Umbrales({
  datos, resultado, tipo, alCambiar,
}: {
  datos: DatosEstudio;
  resultado: Resultado | null;
  tipo: "torre" | "casas";
  alCambiar: (d: DatosEstudio) => void;
}) {
  const objetivo = leerMargenObjetivo(datos) as number;
  const [editando, setEditando] = useState(false);

  const u = useMemo(
    () => (resultado
      ? calcularUmbrales(datos, tipo, resultado, objetivo) as {
          margenActual: number;
          precioMargenCero: number | null; precioMargenCeroPct: number | null;
          precioObjetivo: number | null; precioObjetivoPct: number | null;
          holguraCostoObjetivoPct: number | null; holguraCostoCeroPct: number | null;
          puntoEquilibrio: number | null; unidadesTotales: number | null;
          maxIteraciones: number;
        }
      : null),
    [datos, tipo, resultado, objetivo],
  );

  if (!u) return null;

  const filas: { rotulo: string; valor: string | null; detalle?: string }[] = [
    {
      rotulo: "Precio m² con margen 0",
      valor: u.precioMargenCero != null ? formatMoneda(u.precioMargenCero) : null,
      detalle: u.precioMargenCeroPct != null ? `${u.precioMargenCeroPct.toFixed(1)} % sobre el actual` : undefined,
    },
    {
      rotulo: `Precio m² para el objetivo`,
      valor: u.precioObjetivo != null ? formatMoneda(u.precioObjetivo) : null,
      detalle: u.precioObjetivoPct != null ? `${u.precioObjetivoPct.toFixed(1)} % sobre el actual` : undefined,
    },
    {
      rotulo: "Alza de costo hasta el objetivo",
      valor: u.holguraCostoObjetivoPct != null ? `${u.holguraCostoObjetivoPct >= 0 ? "+" : ""}${u.holguraCostoObjetivoPct.toFixed(1)} %` : null,
    },
    {
      rotulo: "Alza de costo hasta margen 0",
      valor: u.holguraCostoCeroPct != null ? `+${u.holguraCostoCeroPct.toFixed(1)} %` : null,
    },
    {
      rotulo: "Unidades para cubrir el costo",
      valor: u.puntoEquilibrio != null ? Math.ceil(u.puntoEquilibrio).toString() : null,
      detalle: u.unidadesTotales != null ? `de ${u.unidadesTotales} unidades` : undefined,
    },
  ];

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h4 className="nota">Umbrales y puntos de quiebre</h4>
        <span className="text-[11.5px] tabular-nums text-tinta-400">
          margen actual {formatPercent(u.margenActual)}
        </span>
      </div>

      <div className="mb-3 flex items-center gap-3 rounded-[9px] bg-hueso-mesa px-3 py-2">
        <span className="text-[12.5px] text-tinta-700">Margen objetivo</span>
        {editando ? (
          <span className="flex items-center gap-2">
            <span className="w-[90px]">
              <CampoNum rotulo="" sufijo="%"
                valor={+(objetivo * 100).toFixed(2)}
                alCambiar={v => {
                  const pct = parseFloat(v);
                  if (!isNaN(pct)) {
                    alCambiar({
                      ...datos,
                      params: { ...((datos.params ?? {}) as object), margenObjetivo: pct / 100 },
                    });
                  }
                }} />
            </span>
            <button onClick={() => setEditando(false)}
              className="text-[12px] font-medio text-tinta-700 underline underline-offset-2">
              Listo
            </button>
          </span>
        ) : (
          <>
            <span className="text-[13px] font-medio tabular-nums text-tinta-950">
              {formatPercent(objetivo)}
            </span>
            <button onClick={() => setEditando(true)}
              className="ml-auto text-[12px] text-tinta-500 underline decoration-trazo-medio underline-offset-2 hover:text-tinta-950">
              Cambiar
            </button>
          </>
        )}
      </div>

      <dl className="grid gap-0">
        {filas.map(f2 => (
          <div key={f2.rotulo}
            className="flex items-baseline justify-between gap-3 border-b border-trazo-fino py-2 last:border-0">
            <dt className="min-w-0 text-[12.5px] leading-snug text-tinta-500">{f2.rotulo}</dt>
            <dd className="shrink-0 text-right">
              <span className="text-[13.5px] font-medio tabular-nums text-tinta-950">
                {f2.valor ?? "—"}
              </span>
              {f2.detalle && (
                <span className="block text-[11px] tabular-nums text-tinta-400">{f2.detalle}</span>
              )}
              {f2.valor == null && (
                <span className="block max-w-[180px] text-[10.5px] leading-snug text-tinta-400">
                  no se alcanza moviendo solo esta variable
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[10.5px] leading-relaxed text-tinta-400">
        Búsqueda binaria sobre el motor: máximo {u.maxIteraciones} iteraciones, tolerancia
        de {(TOLERANCIA * 100).toFixed(2)} puntos. El objetivo es una referencia que fijas tú.
      </p>
    </div>
  );
}
