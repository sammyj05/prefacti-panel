"use client";

import { useMemo, useState } from "react";
import { calcularTornado, RANGOS } from "@/lib/motor/tornado.js";
import { ETIQUETA_VAR } from "@/lib/simuladorUi";
import type { DatosEstudio } from "@/lib/estudioLocal";

/**
 * El tornado de sensibilidad: mueve cada variable ±rango% y ordena por cuánto
 * mueven el margen. Contesta «¿dónde tengo que poner la atención?».
 *
 * Cada corrida pasa por `calcularFactibilidad` —el tornado del motor no tiene
 * una segunda copia de la aritmética—, así que una barra de aquí y un
 * deslizador del panel de al lado siempre cuentan la misma historia.
 */
export function Tornado({
  datos, tipo, resultadoBase,
}: {
  datos: DatosEstudio;
  tipo: "torre" | "casas";
  resultadoBase: Record<string, number> | null;
}) {
  const [rango, setRango] = useState(10);

  const filas = useMemo(
    () => calcularTornado(datos, tipo, rango, resultadoBase as never) as {
      id: string; baja: number; alta: number; amplitud: number;
      margenBaja: number; margenAlta: number; mejor: string;
    }[],
    [datos, tipo, rango, resultadoBase],
  );

  /* La escala común: la mayor desviación de cualquier barra, a cada lado. */
  const tope = Math.max(1e-9, ...filas.flatMap(f => [Math.abs(f.baja), Math.abs(f.alta)]));
  const pp = (v: number) => `${v >= 0 ? "+" : "−"}${(Math.abs(v) * 100).toFixed(1)}`;

  return (
    <section className="seccion rounded-caja p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="nota">Tornado de sensibilidad</h3>
          <p className="mt-1.5 text-[12.5px] leading-snug text-tinta-500">
            Cada variable se mueve ±{rango} % y la barra mide cuántos puntos de margen arrastra.
          </p>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Rango de variación">
          {RANGOS.map((r: number) => (
            <button
              key={r}
              onClick={() => setRango(r)}
              aria-pressed={rango === r}
              className={`rounded-full px-3 py-1 text-[12.5px] tabular-nums transition
                ${rango === r
                  ? "bg-tinta-950 font-medio text-hueso"
                  : "text-tinta-500 hover:bg-hueso-mesa hover:text-tinta-950"}`}
            >
              ±{r}%
            </button>
          ))}
        </div>
      </div>

      {filas.length === 0 ? (
        <p className="py-8 text-center text-[13.5px] text-tinta-400">
          Ninguna variable con referencia que variar en este proyecto.
        </p>
      ) : (
        <div className="mt-5 space-y-2.5">
          {filas.map(f => (
            <div key={f.id}>
              <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
                <span className="min-w-0 truncate text-tinta-700">{ETIQUETA_VAR[f.id] ?? f.id}</span>
                <span className="shrink-0 tabular-nums text-tinta-400">
                  {(f.amplitud * 100).toFixed(1)} pp de amplitud
                </span>
              </div>
              {/* La barra parte del margen base, al centro: a la izquierda lo
                  que pasa al bajar la variable, a la derecha al subirla. */}
              <div className="relative mt-1 h-[18px] overflow-hidden rounded-[5px] bg-hueso-mesa">
                <span aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-trazo-grueso" />
                {([["baja", f.baja], ["alta", f.alta]] as const).map(([lado, v]) => {
                  const anchoPct = (Math.abs(v) / tope) * 50;
                  const positivo = v >= 0;
                  return (
                    <span
                      key={lado}
                      title={`${lado === "baja" ? `−${rango}%` : `+${rango}%`} → margen ${((lado === "baja" ? f.margenBaja : f.margenAlta) * 100).toFixed(2)}%`}
                      className="absolute inset-y-[3px] rounded-[3px]"
                      style={{
                        width: `${anchoPct}%`,
                        left: positivo ? "50%" : undefined,
                        right: positivo ? undefined : "50%",
                        background: positivo ? "rgb(var(--viable) / .75)" : "rgb(var(--riesgo) / .7)",
                      }}
                    />
                  );
                })}
              </div>
              <div className="mt-0.5 flex justify-between font-mono text-[10.5px] tabular-nums text-tinta-400">
                <span>−{rango}% → {pp(f.baja)} pp</span>
                <span>+{rango}% → {pp(f.alta)} pp</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
