"use client";

import { useMemo, useState } from "react";
import { atrasoMaximo, capitalParaExposicion, tasaLimiteInteres } from "@/lib/motor/flujoCaja.js";
import { formatCurrency, formatPercent } from "@/lib/motor/calculations.js";
import { TituloGrupo, CampoNum } from "./campos";

/**
 * Puntos de quiebre del flujo: tres preguntas concretas resueltas por
 * bisección sobre el motor. Cuando el objetivo no cae dentro del rango
 * explorado se dice con palabras — nunca un número raro.
 */

const num = (v: unknown) => {
  const x = typeof v === "number" ? v : parseFloat(String(v));
  return isNaN(x) ? 0 : x;
};

export function QuiebreFlujo({
  actividades, params, flujo,
}: {
  actividades: unknown[];
  params: Record<string, unknown>;
  flujo: { interesFinanciado: number; exposicionMaxima: number };
}) {
  /* Los objetivos parten de un +10 % sobre lo actual: la pregunta habitual es
     «¿cuánto margen de maniobra tengo?», no un número exótico. */
  const [interesTope, setInteresTope] = useState("");
  const [exposicionTope, setExposicionTope] = useState("");

  const objInteres = num(interesTope) > 0 ? num(interesTope) : flujo.interesFinanciado * 1.1;
  const objExposicion = num(exposicionTope) > 0 ? num(exposicionTope) : flujo.exposicionMaxima * 0.8;

  const r = useMemo(() => {
    const tasa = tasaLimiteInteres(actividades, params, objInteres) as
      { ok: boolean; valor?: number };
    const capital = capitalParaExposicion(actividades, params, objExposicion) as
      { ok: boolean; valor?: number };
    const atraso = atrasoMaximo(actividades, params, objInteres) as
      { ok: boolean; meses?: number | null };
    return { tasa, capital, atraso };
  }, [actividades, params, objInteres, objExposicion]);

  return (
    <div>
      <TituloGrupo>Puntos de quiebre</TituloGrupo>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[10px] border border-trazo-fino p-3.5">
          <div className="text-[12.5px] leading-snug text-tinta-500">
            ¿Qué tasa anual lleva el interés financiado a…?
          </div>
          <div className="mt-2">
            <CampoNum rotulo="Interés objetivo" sufijo="$"
              valor={interesTope || Math.round(objInteres)}
              alCambiar={setInteresTope} />
          </div>
          <div className="mt-2.5 text-[19px] font-medio tabular-nums text-tinta-950">
            {r.tasa.ok && r.tasa.valor != null ? formatPercent(r.tasa.valor) : "—"}
          </div>
          {!r.tasa.ok && (
            <p className="mt-1 text-[11px] leading-snug text-tinta-400">
              Fuera del rango explorado (0 % – 20 %).
            </p>
          )}
        </div>

        <div className="rounded-[10px] border border-trazo-fino p-3.5">
          <div className="text-[12.5px] leading-snug text-tinta-500">
            ¿Cuánto capital de inicio deja la exposición máxima en…?
          </div>
          <div className="mt-2">
            <CampoNum rotulo="Exposición objetivo" sufijo="$"
              valor={exposicionTope || Math.round(objExposicion)}
              alCambiar={setExposicionTope} />
          </div>
          <div className="mt-2.5 text-[19px] font-medio tabular-nums text-tinta-950">
            {r.capital.ok && r.capital.valor != null ? formatCurrency(r.capital.valor) : "—"}
          </div>
          {!r.capital.ok && (
            <p className="mt-1 text-[11px] leading-snug text-tinta-400">
              No se alcanza con capital dentro del rango explorado.
            </p>
          )}
        </div>

        <div className="rounded-[10px] border border-trazo-fino p-3.5">
          <div className="text-[12.5px] leading-snug text-tinta-500">
            ¿Cuántos meses de atraso se absorben antes de tocar ese interés?
          </div>
          <div className="mt-2 text-[11px] text-tinta-400">
            Sobre el mismo interés objetivo de la izquierda.
          </div>
          <div className="mt-4 text-[19px] font-medio tabular-nums text-tinta-950">
            {r.atraso.ok && r.atraso.meses != null ? `${r.atraso.meses} meses` : "—"}
          </div>
          {!r.atraso.ok && (
            <p className="mt-1 text-[11px] leading-snug text-tinta-400">
              Ni 24 meses de atraso llegan a ese interés (o ya se supera hoy).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
