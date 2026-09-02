"use client";

import { useMemo } from "react";
import { construirPuente } from "@/lib/motor/puenteUtilidad.js";
import { formatCurrency, formatPercent } from "@/lib/motor/calculations.js";
import type { DatosEstudio } from "@/lib/estudioLocal";

/**
 * El puente de utilidad entre el estudio guardado y el borrador: cuánto del
 * cambio de margen viene de cada causa. Sustitución secuencial con el residuo
 * a la vista — un puente que cuadra por construcción miente, así que la
 * interacción se muestra como tramo propio.
 */

const ROTULO: Record<string, string> = {
  precio: "Precio y ventas",
  area: "Áreas y unidades",
  costoDirecto: "Costos directos",
  costoIndirecto: "Costos indirectos",
  interes: "Interés",
};

export function Puente({
  original, editado, tipo,
}: {
  original: DatosEstudio;
  editado: DatosEstudio;
  tipo: "torre" | "casas";
}) {
  const p = useMemo(
    () => construirPuente(original, editado, tipo) as {
      margenA: number; margenB: number; utilidadA: number; utilidadB: number;
      tramos: { id: string; puntos: number; monto: number }[];
      interaccion: { puntos: number; monto: number };
    } | null,
    [original, editado, tipo],
  );

  if (!p) return null;
  const sinCambios = Math.abs(p.utilidadB - p.utilidadA) < 0.5 &&
    p.tramos.every(t => Math.abs(t.monto) < 0.5);
  if (sinCambios) return null;

  const tramos = [
    ...p.tramos.map(t => ({ ...t, rotulo: ROTULO[t.id] ?? t.id })),
    ...(Math.abs(p.interaccion.monto) >= 0.5
      ? [{ id: "interaccion", rotulo: "Interacción entre causas", ...p.interaccion }]
      : []),
  ];
  const tope = Math.max(1, ...tramos.map(t => Math.abs(t.monto)));

  return (
    <div className="rounded-caja border border-trazo-fino bg-hueso-alto p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h4 className="nota">Puente contra el estudio guardado</h4>
        <span className="text-[12.5px] tabular-nums text-tinta-500">
          utilidad {formatCurrency(p.utilidadA)} → <b className="font-medio text-tinta-950">{formatCurrency(p.utilidadB)}</b>
          {" · "}margen {formatPercent(p.margenA)} → <b className="font-medio text-tinta-950">{formatPercent(p.margenB)}</b>
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        {tramos.map(t => {
          const positivo = t.monto >= 0;
          const nulo = Math.abs(t.monto) < 0.5;
          return (
            <div key={t.id} className="grid grid-cols-[150px_minmax(0,1fr)_120px] items-center gap-3">
              <span className="truncate text-[12.5px] text-tinta-700" title={t.rotulo}>{t.rotulo}</span>
              <div className="relative h-[14px] overflow-hidden rounded-[4px] bg-hueso-mesa">
                <span aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-trazo-medio" />
                {!nulo && (
                  <span className="absolute inset-y-[2px] rounded-[3px]"
                    style={{
                      width: `${(Math.abs(t.monto) / tope) * 48}%`,
                      left: positivo ? "50%" : undefined,
                      right: positivo ? undefined : "50%",
                      background: positivo ? "rgb(var(--viable) / .75)" : "rgb(var(--riesgo) / .7)",
                    }} />
                )}
              </div>
              <span className="text-right text-[12.5px] font-medio tabular-nums"
                style={{ color: nulo ? "rgb(var(--tinta-400))" : positivo ? "rgb(var(--viable))" : "rgb(var(--riesgo))" }}>
                {nulo ? "—" : `${positivo ? "+" : ""}${formatCurrency(t.monto)}`}
                {!nulo && (
                  <span className="block text-[10.5px] font-libro text-tinta-400">
                    {t.puntos >= 0 ? "+" : "−"}{(Math.abs(t.puntos) * 100).toFixed(2)} pp
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
