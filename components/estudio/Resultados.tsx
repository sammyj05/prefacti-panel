"use client";

import { formatInt, metricasArea, metricasComercial } from "@/lib/motor/calculations.js";
import { formateadores, MODO_DETALLE, MODO_PREFACT } from "@/lib/motor/precision.js";
import type { DatosEstudio } from "@/lib/estudioLocal";
import type { Resultado } from "./useEstudio";

/**
 * Los resultados rápidos del Master: el mismo juego de indicadores del
 * producto —financieros, de área, comerciales y de retorno—, con la precisión
 * honesta: una prefactibilidad no conoce el segundo decimal de su margen, así
 * que en modo aproximado los montos van al millar y los porcentajes a un
 * decimal. El modo detalle cuadra al centavo.
 */

export function Resultados({
  resultado, datos, tipo, retorno, modo, alCambiarModo,
}: {
  resultado: Resultado | null;
  datos: DatosEstudio;
  tipo: "torre" | "casas";
  retorno: { completo: boolean; metricas: Record<string, number | string | null> | null } | null;
  modo: string;
  alCambiarModo: (m: string) => void;
}) {
  if (!resultado) return null;
  const f = formateadores(modo);
  const area = metricasArea(resultado, tipo) as { construccion: number; venta: number; ratio: number };
  const com = metricasComercial(resultado, datos, tipo) as Record<string, number>;
  const ret = retorno?.completo ? retorno.metricas : null;

  const tono = (v: number) =>
    v >= 0.25 ? "rgb(var(--viable))" : v >= 0.10 ? "rgb(var(--tenso))" : "rgb(var(--riesgo))";

  const items: { rotulo: string; valor: string; color?: string }[] = [
    { rotulo: "Total ingresos", valor: f.money(resultado.totalIngresos) },
    { rotulo: "Precio final / m² vendible", valor: f.unit(resultado.precioNetoM2) },
    { rotulo: "m² construcción", valor: formatInt(area.construccion) },
    { rotulo: "Costo total", valor: f.money(resultado.costoTotal) },
    { rotulo: "Costo / m² vendible", valor: f.unit(resultado.ctVendible) },
    { rotulo: "m² venta", valor: formatInt(area.venta) },
    {
      rotulo: "Utilidad", valor: f.money(resultado.utilidad),
      color: resultado.utilidad >= 0 ? "rgb(var(--viable))" : "rgb(var(--riesgo))",
    },
    { rotulo: "Margen", valor: f.pct(resultado.margen), color: tono(resultado.margen) },
    { rotulo: "Ratio eficiencia", valor: f.pct(area.ratio) },
    { rotulo: "Vendido", valor: f.money(com.totalVendido ?? 0) },
    { rotulo: "Por vender", valor: f.money(com.totalPorVender ?? 0) },
    { rotulo: "% vendido", valor: f.pct(com.pctVendido ?? 0) },
    { rotulo: "Unidades vendidas", valor: formatInt(com.unidadesVendidas ?? 0) },
    { rotulo: "Unidades por vender", valor: formatInt(com.unidadesPorVender ?? 0) },
    { rotulo: "Ritmo actual", valor: f.num(com.ritmoActual ?? 0) },
  ];

  if (ret) {
    items.push(
      {
        rotulo: "TIR anual",
        valor: ret.tirAnual == null ? "—" : f.pct(Number(ret.tirAnual)),
        color: ret.tirAnual == null ? undefined : tono(Number(ret.tirAnual)),
      },
      { rotulo: "Recuperación (meses)", valor: ret.paybackSimple == null ? "—" : formatInt(Number(ret.paybackSimple)) },
      {
        rotulo: "Múltiplo sobre capital",
        valor: ret.multiploCapital == null ? "—" : f.num(Number(ret.multiploCapital)) + "×",
      },
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="nota">Resultados rápidos</h4>
        {/* La precisión es SOLO presentación: el motor devuelve lo mismo. */}
        <div className="flex items-center gap-0.5 rounded-full bg-hueso-mesa p-0.5"
             role="group" aria-label="Precisión de presentación">
          {([[MODO_PREFACT, "Aproximado"], [MODO_DETALLE, "Al centavo"]] as const).map(([m, r]) => (
            <button key={m} onClick={() => alCambiarModo(m)} aria-pressed={modo === m}
              className={`rounded-full px-2.5 py-1 text-[11.5px] transition
                ${modo === m ? "bg-hueso-alto font-medio text-tinta-950 shadow-sm" : "text-tinta-500 hover:text-tinta-950"}`}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-3.5">
        {items.map(it => (
          <div key={it.rotulo} className="min-w-0">
            <div className="truncate text-[10.5px] uppercase tracking-[0.07em] text-tinta-400"
                 title={it.rotulo}>
              {it.rotulo}
            </div>
            <div className="mt-0.5 truncate text-[14px] font-medio tabular-nums"
                 style={{ color: it.color ?? "rgb(var(--tinta-950))" }}>
              {it.valor}
            </div>
          </div>
        ))}
      </div>
      {modo === MODO_PREFACT && (
        <p className="mt-2.5 text-[11px] leading-relaxed text-tinta-400">
          Cifras aproximadas al millar: una prefactibilidad no conoce su segundo decimal.
          El modo «al centavo» cuadra exacto con el Master.
        </p>
      )}
    </div>
  );
}
