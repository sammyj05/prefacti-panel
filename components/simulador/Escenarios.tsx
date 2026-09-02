"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, Play, Trash2 } from "lucide-react";
import { Boton, Entrada, Marbete } from "@/components/ui";
import { calcularFactibilidad, formatPercent } from "@/lib/motor/calculations.js";
import { aplicarOverrides, VARS_INICIALES } from "@/lib/motor/simuladorVariables.js";
import { ETIQUETA_VAR, overridesActivos } from "@/lib/simuladorUi";
import { leerLista, guardarLista, type DatosEstudio } from "@/lib/estudioLocal";

/**
 * Escenarios guardados del simulador.
 *
 * Se guardan los OVERRIDES, nunca los resultados: si mañana cambia el
 * presupuesto, el escenario se recalcula con los datos nuevos. Guardar
 * resultados congelaría una foto que envejece sin avisar. Hasta cinco por
 * promoción, como en el producto.
 */

const MAX_ESCENARIOS = 5;

type Vars = Record<string, number | string>;
type Escenario = { id: string; nombre: string; fecha: string; overrides: Vars };

const claveDe = (proyectoId: string) => `prefacti:sim:escenarios:${proyectoId}`;

export function Escenarios({
  proyectoId, datos, tipo, vars, margenVigente, alAplicar,
}: {
  proyectoId: string;
  datos: DatosEstudio;
  tipo: "torre" | "casas";
  vars: Vars;
  margenVigente: number;
  alAplicar: (overrides: Vars) => void;
}) {
  const [lista, setLista] = useState<Escenario[]>([]);
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    setLista(leerLista<Escenario>(claveDe(proyectoId)));
    setNombre("");
  }, [proyectoId]);

  const activos = overridesActivos(vars, VARS_INICIALES as Vars);
  const hayCambios = activos.length > 0;

  const persistir = (nueva: Escenario[]) => {
    setLista(nueva);
    guardarLista(claveDe(proyectoId), nueva);
  };

  const guardar = () => {
    const n = nombre.trim();
    if (!n || !hayCambios || lista.length >= MAX_ESCENARIOS) return;
    persistir([
      {
        id: `esc_${Math.random().toString(36).slice(2, 9)}`,
        nombre: n,
        fecha: new Date().toISOString(),
        overrides: Object.fromEntries(activos),
      },
      ...lista,
    ]);
    setNombre("");
  };

  /* El margen de cada escenario, recalculado en vivo contra el estudio actual. */
  const margenes = useMemo(() => {
    const out: Record<string, number> = {};
    for (const e of lista) {
      const r = calcularFactibilidad(aplicarOverrides(datos, tipo, e.overrides), tipo);
      out[e.id] = Number(r?.margen ?? 0);
    }
    return out;
  }, [lista, datos, tipo]);

  const resumen = (o: Vars) =>
    overridesActivos(o, VARS_INICIALES as Vars)
      .map(([k, v]) => {
        const rel = (VARS_INICIALES as Vars)[k] !== "";
        const rotulo = (ETIQUETA_VAR[k] ?? k).replace(" (%)", "");
        return rel ? `${rotulo} ${Number(v) > 0 ? "+" : ""}${v}%` : `${rotulo} → ${v}%`;
      })
      .join(" · ");

  return (
    <section className="seccion rounded-caja p-5 sm:p-6">
      <h3 className="nota">Escenarios guardados</h3>
      <p className="mt-1.5 text-[12.5px] leading-snug text-tinta-500">
        Se guardan las hipótesis, no las cifras: cada escenario se recalcula contra el estudio de hoy.
      </p>

      <div className="mt-4 flex gap-2">
        <Entrada
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          onKeyDown={e => e.key === "Enter" && guardar()}
          placeholder={hayCambios ? "Nombre del escenario…" : "Mueve una variable para poder guardar"}
          disabled={!hayCambios || lista.length >= MAX_ESCENARIOS}
          aria-label="Nombre del escenario"
        />
        <Boton onClick={guardar} disabled={!hayCambios || !nombre.trim() || lista.length >= MAX_ESCENARIOS}>
          <Bookmark className="h-4 w-4" aria-hidden /> Guardar
        </Boton>
      </div>
      {lista.length >= MAX_ESCENARIOS && (
        <p className="mt-1.5 text-[12px] text-tinta-400">
          Máximo {MAX_ESCENARIOS} escenarios: elimina uno para guardar otro.
        </p>
      )}

      {lista.length === 0 ? (
        <p className="py-8 text-center text-[13.5px] text-tinta-400">
          Todavía no hay escenarios guardados en esta promoción.
        </p>
      ) : (
        <div className="mt-4 grid gap-2">
          {lista.map(e => {
            const m = margenes[e.id] ?? 0;
            const d = m - margenVigente;
            return (
              <div key={e.id}
                className="rounded-[10px] border border-trazo-fino p-3 transition hover:border-trazo-medio">
                <div className="flex items-center gap-2.5">
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medio text-tinta-950">
                    {e.nombre}
                  </span>
                  <Marbete tono={d >= 0 ? "bien" : "mal"} punto>
                    margen {formatPercent(m)}
                  </Marbete>
                  <span className="text-[12px] font-medio tabular-nums"
                        style={{ color: Math.abs(d) < 5e-5 ? "rgb(var(--tinta-400))" : d > 0 ? "rgb(var(--viable))" : "rgb(var(--riesgo))" }}>
                    {Math.abs(d) < 5e-5 ? "=" : `${d > 0 ? "+" : "−"}${(Math.abs(d) * 100).toFixed(1)} pp`}
                  </span>
                  <button onClick={() => alAplicar(e.overrides)} title="Aplicar al simulador"
                    className="grid h-7 w-7 place-items-center rounded-[7px] text-tinta-500 hover:bg-hueso-mesa hover:text-tinta-950">
                    <Play className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button onClick={() => persistir(lista.filter(x => x.id !== e.id))} title="Eliminar escenario"
                    className="grid h-7 w-7 place-items-center rounded-[7px] text-tinta-500 hover:bg-riesgo/10 hover:text-riesgo">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                <p className="mt-1 truncate text-[12px] text-tinta-500" title={resumen(e.overrides)}>
                  {resumen(e.overrides) || "Sin cambios"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
