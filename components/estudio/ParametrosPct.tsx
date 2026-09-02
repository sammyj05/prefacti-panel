"use client";

import { formatCurrency } from "@/lib/motor/calculations.js";
import type { DatosEstudio } from "@/lib/estudioLocal";
import { CampoNum, TituloGrupo } from "./campos";

/**
 * Los parámetros porcentuales del estudio, con su doble modo.
 *
 * Cada concepto se calcula como un % sobre su base —gastos administrativos
 * sobre costos, el resto sobre ingresos— salvo que se capture un monto fijo
 * mayor que cero: entonces el monto manda (la regla `montoOFijo` del motor).
 * Por eso cada uno lleva dos casillas y el efecto calculado a la vista.
 */

const DUALES: [string, string, "costos" | "ingresos"][] = [
  ["gastosAdmin", "Gastos administrativos", "costos"],
  ["comisiones", "Comisiones", "ingresos"],
  ["publicidad", "Publicidad", "ingresos"],
  ["impuestoTerreno", "Impuesto de terreno", "ingresos"],
  ["impuestosVentas", "Impuestos sobre ventas", "ingresos"],
];

const num = (v: unknown) => {
  const x = typeof v === "number" ? v : parseFloat(String(v));
  return isNaN(x) ? 0 : x;
};

export function ParametrosPct({
  datos, alCambiar, baseCostos, baseIngresos, notaBase,
}: {
  datos: DatosEstudio;
  alCambiar: (d: DatosEstudio, opciones?: { suave?: boolean }) => void;
  baseCostos: number;
  baseIngresos: number;
  notaBase: string;
}) {
  const p = (datos.params ?? {}) as Record<string, number>;

  const setParam = (k: string, v: string) => {
    const pct = parseFloat(v);
    alCambiar({ ...datos, params: { ...p, [k]: isNaN(pct) ? 0 : pct / 100 } }, { suave: true });
  };
  const setMonto = (k: string, v: string) => {
    alCambiar({ ...datos, params: { ...p, [`${k}Monto`]: num(v) } }, { suave: true });
  };

  return (
    <div>
      <TituloGrupo>Parámetros (%) — precargados, editables</TituloGrupo>
      <div className="grid gap-3 sm:grid-cols-2">
        {DUALES.map(([k, rotulo, baseTipo]) => {
          const base = baseTipo === "costos" ? baseCostos : baseIngresos;
          const monto = num(p[`${k}Monto`]);
          const efectivo = monto > 0 ? monto : num(p[k]) * base;
          return (
            <div key={k} className="rounded-[10px] border border-trazo-fino p-3">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-[12.5px] font-medio text-tinta-900">{rotulo}</span>
                <span className="shrink-0 text-[12px] tabular-nums text-tinta-500"
                      title={monto > 0 ? "Manda el monto fijo" : "Calculado por porcentaje"}>
                  = {formatCurrency(efectivo)}{monto > 0 ? " · fijo" : ""}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <CampoNum rotulo="Porcentaje" sufijo="%"
                  valor={p[k] != null ? +(num(p[k]) * 100).toFixed(4) : ""}
                  alCambiar={v => setParam(k, v)} />
                <CampoNum rotulo="Monto fijo (0 = usar %)" sufijo="$"
                  valor={p[`${k}Monto`] ?? 0}
                  alCambiar={v => setMonto(k, v)} />
              </div>
            </div>
          );
        })}
        <div className="rounded-[10px] border border-trazo-fino p-3">
          <div className="mb-2 text-[12.5px] font-medio text-tinta-900">Imprevistos</div>
          <div className="grid grid-cols-2 gap-2">
            <CampoNum rotulo="Porcentaje" sufijo="%"
              valor={p.imprevistos != null ? +(num(p.imprevistos) * 100).toFixed(4) : ""}
              alCambiar={v => setParam("imprevistos", v)} />
            <div className="self-end pb-1 text-[11px] leading-snug text-tinta-400">
              Sobre construcción más indirectos; un monto capturado en el campo de imprevistos lo sustituye.
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11.5px] text-tinta-400">{notaBase}</p>
    </div>
  );
}
