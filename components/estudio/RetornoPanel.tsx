"use client";

import { useMemo } from "react";
import { calcularMetricasRetorno } from "@/lib/motor/metricasRetorno.js";
import { formatCurrency, formatNumber, formatPercent, formatInt } from "@/lib/motor/calculations.js";
import type { DatosEstudio } from "@/lib/estudioLocal";
import type { Resultado } from "./useEstudio";
import { TituloGrupo } from "./campos";

/**
 * Las métricas del inversionista: TIR, VAN, recuperación, capital propio y
 * múltiplo, con la curva de caja acumulada que las produce y los supuestos
 * declarados uno a uno. Sin flujo configurado no se estima nada: un cero aquí
 * se leería como «rentabilidad cero» y sólo significa «falta el cronograma».
 */

const TEXTO_SUPUESTO: Record<string, (p: Record<string, number | string>) => string> = {
  "ret.sup.egresos": p => `Egresos de obra del cronograma (${p.modo === "estandar" ? "curva estándar" : "actividades"}): ${formatCurrency(Number(p.total))}.`,
  "ret.sup.otros": p => `Otros costos del Master (terreno, indirectos, comisiones…) prorrateados uniforme: ${formatCurrency(Number(p.monto))} en ${p.meses} meses.`,
  "ret.sup.cierreCaja": p => `Cierre de ventas según la capa de caja: ${formatCurrency(Number(p.monto))} desde el mes ${p.mes}, en ${p.meses} meses.`,
  "ret.sup.cierreSupuesto": p => `Cierre supuesto (sin capa de caja): ${formatCurrency(Number(p.monto))} desde el mes ${p.mes}, en ${p.meses} meses.`,
  "ret.sup.enObra": p => `Cobrado en obra (capital de inicio y abonos): ${formatCurrency(Number(p.monto))}.`,
  "ret.sup.capital": () => "El capital propio máximo es lo más hondo del acumulado antes de recuperarse.",
  "ret.sup.tasa": p => `Tasa de descuento del VAN: ${formatPercent(Number(p.tasa))} anual.`,
};

const MOTIVO: Record<string, string> = {
  sin_flujo: "El proyecto no tiene flujo de caja configurado: carga el cronograma arriba y estas métricas aparecen solas.",
  sin_master: "Faltan ingresos o costos en el Master para construir el vector del inversionista.",
};

export function RetornoPanel({
  datos, resultado, tipo,
}: {
  datos: DatosEstudio;
  resultado: Resultado | null;
  tipo: "torre" | "casas";
}) {
  const r = useMemo(
    () => calcularMetricasRetorno({ datos, resultado, tipo }) as unknown as {
      completo: boolean; motivo: string | null;
      metricas: Record<string, number | string | null> | null;
      acumulado: number[]; acumuladoDescontado: number[];
      supuestos: { k: string; p: Record<string, number | string> }[];
      identidad?: { cuadra: boolean; sumaVector: number; utilidad: number };
      horizonte?: number;
    },
    [datos, resultado, tipo],
  );

  if (!r.completo || !r.metricas) {
    return (
      <div>
        <TituloGrupo>Retorno del inversionista</TituloGrupo>
        <p className="rounded-[10px] border border-trazo-fino px-4 py-6 text-center text-[13.5px] text-tinta-400">
          {MOTIVO[r.motivo ?? ""] ?? "Sin datos suficientes para estimar el retorno."}
        </p>
      </div>
    );
  }

  const m = r.metricas;
  const tirTexto = m.tirAnual != null
    ? formatPercent(Number(m.tirAnual))
    : m.tirMotivo === "signos_multiples" ? "ambigua" : "—";

  const filas: [string, string][] = [
    ["TIR anual", tirTexto],
    ["VAN", formatCurrency(Number(m.van))],
    ["Tasa de descuento", formatPercent(Number(m.tasaDescuento))],
    ["Recuperación", m.paybackSimple != null ? `mes ${formatInt(Number(m.paybackSimple))}` : "—"],
    ["Recuperación descontada", m.paybackDescontado != null ? `mes ${formatInt(Number(m.paybackDescontado))}` : "—"],
    ["Capital propio máximo", m.capitalPropioMax != null ? formatCurrency(Number(m.capitalPropioMax)) : "—"],
    ["Mes del pico de capital", m.mesCapitalPropioMax != null ? `mes ${m.mesCapitalPropioMax}` : "—"],
    ["Múltiplo sobre capital", m.multiploCapital != null ? formatNumber(Number(m.multiploCapital), 2) + "×" : "—"],
    ["ROE del proyecto", m.roeProyecto != null ? formatPercent(Number(m.roeProyecto)) : "—"],
  ];

  /* La curva acumulada: lo hondo que llega la caja antes de recuperarse. */
  const ac = r.acumulado;
  const min = Math.min(0, ...ac);
  const max = Math.max(0, ...ac);
  const rango = max - min || 1;

  return (
    <div>
      <TituloGrupo>Retorno del inversionista</TituloGrupo>
      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <dl>
          {filas.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3 border-b border-trazo-fino py-2 last:border-0">
              <dt className="text-[12.5px] text-tinta-500">{k}</dt>
              <dd className="text-[13.5px] font-medio tabular-nums text-tinta-950">{v}</dd>
            </div>
          ))}
          {r.identidad && (
            <p className={`mt-2 text-[11px] leading-snug ${r.identidad.cuadra ? "text-tinta-400" : "text-tenso"}`}>
              {r.identidad.cuadra
                ? "Identidad auditada: el vector mensual suma exactamente la utilidad del Master."
                : `El vector no cuadra con la utilidad del Master por ${formatCurrency(r.identidad.sumaVector - r.identidad.utilidad)}.`}
            </p>
          )}
        </dl>

        <div className="min-w-0">
          <div className="nota mb-2">Caja acumulada del inversionista</div>
          <div className="flex h-[150px] items-stretch gap-[2px]">
            {ac.map((v, i) => {
              const arriba = v >= 0;
              const altoPct = (Math.abs(v) / rango) * 100;
              const cero = (max / rango) * 100;
              return (
                <span key={i} className="relative min-w-[3px] flex-1" title={`Mes ${i}: ${formatCurrency(v)}`}>
                  <span className="absolute left-0 w-full rounded-[1px]"
                    style={{
                      height: `${altoPct}%`,
                      bottom: arriba ? `${100 - cero}%` : undefined,
                      top: arriba ? undefined : `${cero}%`,
                      background: arriba ? "rgb(var(--viable) / .8)" : "rgb(var(--riesgo) / .75)",
                    }} />
                </span>
              );
            })}
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[10.5px] tabular-nums text-tinta-400">
            <span>mes 0</span>
            <span>mes {ac.length - 1}</span>
          </div>

          <details className="mt-3">
            <summary className="cursor-pointer text-[12.5px] text-tinta-500 hover:text-tinta-950">
              Supuestos del cálculo ({r.supuestos.length})
            </summary>
            <ul className="mt-2 grid gap-1 text-[12px] leading-snug text-tinta-500">
              {r.supuestos.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden className="mt-[6px] h-[4px] w-[4px] shrink-0 rounded-full bg-tinta-300" />
                  {TEXTO_SUPUESTO[s.k]?.(s.p) ?? s.k}
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
