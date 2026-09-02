"use client";

import { useMemo, useState } from "react";
import { Boton, Lista } from "@/components/ui";
import { EJES_SENSIBILIDAD, matrizSensibilidad } from "@/lib/motor/flujoCaja.js";
import { formatCurrency } from "@/lib/motor/calculations.js";
import { TituloGrupo } from "./campos";

/**
 * La matriz de sensibilidad del flujo: dos variables contra el interés
 * financiado. Cada celda es una corrida completa del motor —7×5 = 35—, así que
 * se calcula al pedirla, nunca en cada tecleo.
 */

const ROTULO_EJE: Record<string, string> = {
  tasaAnual: "Tasa anual",
  plazoObra: "Plazo de obra",
  pctFinanciamiento: "% financiado",
  capitalInicioMonto: "Capital de inicio",
  montoObra: "Monto de obra",
  cajaMesInicio: "Mes de cierre",
};

type Celda = {
  valorFila: number; valorCol: number; interesFinanciado: number;
  exposicionMaxima: number; delta: number; deltaPct: number | null; esBase: boolean;
};

const fmtValor = (clave: string, v: number) => {
  const meta = (EJES_SENSIBILIDAD as Record<string, { formato?: string }>)[clave];
  if (meta?.formato === "pct1") return (v * 100).toFixed(1) + "%";
  if (meta?.formato === "pct0") return (v * 100).toFixed(0) + "%";
  if (meta?.formato === "meses") return `${Math.round(v)} m`;
  return "$" + Math.round(v / 1000).toLocaleString("en-US") + "k";
};

export function SensibilidadFlujo({
  actividades, params,
}: {
  actividades: unknown[];
  params: Record<string, unknown>;
}) {
  const [ejeFilas, setEjeFilas] = useState("tasaAnual");
  const [ejeCols, setEjeCols] = useState("plazoObra");
  const [pedida, setPedida] = useState<{ f: string; c: string } | null>(null);

  const matriz = useMemo(() => {
    if (!pedida) return null;
    return matrizSensibilidad(actividades, params, {
      ejeFilas: pedida.f, ejeCols: pedida.c,
    }) as {
      filas: number[]; cols: number[]; celdas: Celda[][];
      base: { interesFinanciado: number };
      acopleCierre: { desfase: number } | null;
      corridas: number;
    };
  }, [pedida, actividades, params]);

  const topeDelta = matriz
    ? Math.max(1, ...matriz.celdas.flat().map(c => Math.abs(c.delta)))
    : 1;

  return (
    <div>
      <TituloGrupo>Sensibilidad del interés</TituloGrupo>
      <div className="flex flex-wrap items-end gap-2">
        {([["Filas", ejeFilas, setEjeFilas, ejeCols], ["Columnas", ejeCols, setEjeCols, ejeFilas]] as const).map(
          ([rotulo, valor, setter, otro]) => (
            <label key={rotulo} className="block">
              <span className="mb-1 block text-[12px] font-medio text-tinta-700">{rotulo}</span>
              <Lista value={valor} className="h-8 w-[180px] text-[13px]"
                onChange={ev => setter(ev.target.value)}>
                {Object.keys(EJES_SENSIBILIDAD).filter(k => k !== otro).map(k => (
                  <option key={k} value={k}>{ROTULO_EJE[k] ?? k}</option>
                ))}
              </Lista>
            </label>
          ),
        )}
        <Boton talla="sm" tono="solido" onClick={() => setPedida({ f: ejeFilas, c: ejeCols })}>
          Calcular matriz
        </Boton>
        {matriz && (
          <span className="pb-1.5 text-[11.5px] tabular-nums text-tinta-400">
            {matriz.corridas} corridas · base {formatCurrency(matriz.base.interesFinanciado)}
          </span>
        )}
      </div>

      {matriz && (
        <div className="mt-3 overflow-x-auto rounded-[10px] border border-trazo-fino">
          <table className="w-full min-w-[560px] text-[12px]">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left font-libro text-tinta-400">
                  {ROTULO_EJE[pedida!.f]} ↓ · {ROTULO_EJE[pedida!.c]} →
                </th>
                {matriz.cols.map(c => (
                  <th key={c} className="px-2 py-2 text-right font-mono text-[11px] tabular-nums text-tinta-500">
                    {fmtValor(pedida!.c, c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matriz.filas.map((vf, fi) => (
                <tr key={vf} className="border-t border-trazo-fino">
                  <td className="px-3 py-1.5 font-mono text-[11px] tabular-nums text-tinta-500">
                    {fmtValor(pedida!.f, vf)}
                  </td>
                  {matriz.celdas[fi].map((c, ci) => {
                    const intensidad = Math.min(0.55, (Math.abs(c.delta) / topeDelta) * 0.55);
                    const fondo = c.esBase
                      ? "rgb(var(--tinta-950))"
                      : c.delta > 0
                        ? `rgb(var(--riesgo) / ${intensidad})`
                        : `rgb(var(--viable) / ${intensidad})`;
                    return (
                      <td key={ci} className="px-2 py-1.5 text-right tabular-nums"
                        style={{ background: fondo, color: c.esBase ? "rgb(var(--hueso))" : undefined }}
                        title={`Interés ${formatCurrency(c.interesFinanciado)} · exposición ${formatCurrency(c.exposicionMaxima)}`}>
                        <span className="font-medio">
                          {Math.round(c.interesFinanciado / 1000).toLocaleString("en-US")}k
                        </span>
                        {!c.esBase && c.deltaPct != null && (
                          <span className="block text-[10px] opacity-80">
                            {c.delta > 0 ? "+" : ""}{(c.deltaPct * 100).toFixed(0)}%
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {matriz.acopleCierre && (
            <p className="px-3 py-2 text-[11.5px] text-tinta-400">
              El eje del plazo arrastra la escrituración conservando el desfase de{" "}
              {matriz.acopleCierre.desfase} meses sobre el fin de obra.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
