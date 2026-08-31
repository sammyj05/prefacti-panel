"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { EDIFICIOS, ETAPAS, ETAPA_NEON, TOTALES, tinte } from "@/lib/data";
import { UMBRALES } from "@/lib/equipo";
import { moneyC, money, pct, num } from "@/lib/format";
import { Pagina } from "@/components/Pagina";
import { Marbete, Pestanas } from "@/components/ui";

/**
 * Gráficos.
 *
 * El cambio de fondo: la barra más larga ya no es la referencia. Antes cada
 * barra se medía contra el máximo de la serie, así que el mejor proyecto
 * llenaba siempre la barra entera y la pantalla no podía decir nunca que la
 * cartera fuera bien o mal — sólo cuál iba primero.
 *
 * Ahora hay una línea de referencia: la media de la cartera en las métricas de
 * volumen, el umbral del comité en el margen. Una barra que se queda corta
 * significa algo, que es lo único que se le pide a un gráfico de barras.
 */

const METRICAS = {
  utilidad: { t: "Utilidad", get: (e: any) => e.utilidad, fmt: moneyC, ref: "media" },
  ventas:   { t: "Ingresos", get: (e: any) => e.ventas,   fmt: moneyC, ref: "media" },
  margen:   { t: "Margen",   get: (e: any) => e.margen,   fmt: (v: number) => pct(v), ref: "umbral" },
  van:      { t: "VAN",      get: (e: any) => e.van,      fmt: moneyC, ref: "media" },
  gba:      { t: "m² constr.", get: (e: any) => e.gba,    fmt: num,    ref: "media" },
} as const;

export default function Graficos() {
  const [m, setM] = useState<keyof typeof METRICAS>("utilidad");
  const cfg = METRICAS[m];

  const datos = [...EDIFICIOS].sort((a, b) => cfg.get(b) - cfg.get(a));
  const max = Math.max(...datos.map(cfg.get)) || 1;
  const media = datos.reduce((s, e) => s + cfg.get(e), 0) / datos.length;
  const referencia = cfg.ref === "umbral" ? UMBRALES.margen : media;
  const rotuloRef = cfg.ref === "umbral"
    ? `umbral del comité · ${pct(UMBRALES.margen, 0)}`
    : `media de cartera · ${cfg.fmt(media)}`;
  const bajos = datos.filter(e => cfg.get(e) < referencia).length;

  const maxEt = Math.max(...ETAPAS.map(e => e.valor)) || 1;

  return (
    <div>
      <Pagina
        icono={BarChart3}
        titulo="Gráficos"
        bajada={`${bajos} de ${EDIFICIOS.length} promociones por debajo de la referencia en ${cfg.t.toLowerCase()}.`}
        acciones={
          /* A la primitiva: era el cuarto sitio del panel con su propio
             `layoutId` y su propia constante de muelle, y además marcaba lo
             activo con `.seccion` —superficie y sombra de contenedor— para una
             pastilla de veinticuatro píxeles de alto. */
          <Pestanas
            id="metrica"
            forma="pastilla"
            activa={m}
            alElegir={k => setM(k as keyof typeof METRICAS)}
            pestanas={(Object.keys(METRICAS) as (keyof typeof METRICAS)[])
              .map(k => ({ k, t: METRICAS[k].t }))}
          />
        }
      />

      <section className="seccion overflow-hidden rounded-caja">
        <header className="flex flex-wrap items-baseline justify-between gap-3
                           border-b border-trazo-fino px-4 py-3.5 sm:px-6 sm:py-4">
          <h3 className="text-[15px] font-medio text-tinta-950">{cfg.t} por promoción</h3>
          <span className="flex items-center gap-2 text-[12.5px] text-tinta-400">
            <span aria-hidden className="h-3.5 w-px bg-tinta-950" /> {rotuloRef}
          </span>
        </header>

        {/* Tres columnas fijas de 178 y 108 px dejaban cincuenta píxeles de
            barra en un teléfono, que es donde vive toda la información del
            gráfico. En estrecho el nombre pasa encima y la barra ocupa la fila
            entera; a partir de 640 vuelve la rejilla de tres. */}
        <div className="space-y-3 px-4 py-5 sm:space-y-1.5 sm:px-6 sm:py-6">
          {datos.map((e, i) => {
            const v = cfg.get(e);
            const corto = v < referencia;
            return (
              <motion.div key={e.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * .025, .4) }}
                className="grid gap-x-3 gap-y-1.5 sm:grid-cols-[178px_minmax(0,1fr)_108px] sm:items-center">
                <Link href={`/proyectos/${e.id}`}
                      className="flex min-w-0 items-center gap-2 transition hover:text-tinta-950">
                  <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.color }} />
                  <span className="truncate text-[13.5px] text-tinta-700">{e.nombre}</span>
                  <span className="ml-auto text-[13px] font-medio tabular-nums text-tinta-950 sm:hidden">
                    {cfg.fmt(v)}
                  </span>
                </Link>
                {/* El listón de referencia va dentro de cada pista. Al estar
                    todas las pistas alineadas y a la misma escala, los
                    dieciocho segmentos se leen como una sola línea vertical, y
                    así no depende de calcular la posición contra el ancho de
                    una retícula de tres columnas. */}
                <div className="relative h-5 overflow-hidden rounded-[6px] bg-hueso-mesa sm:h-6">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(v / max) * 100}%` }}
                    transition={{ duration: .7, delay: .06 + i * .022, ease: [.22,.68,.36,1] }}
                    className="h-full rounded-[6px]"
                    style={{ background: corto ? tinte(e.color, 42) : e.color }} />
                  <span aria-hidden
                    className="absolute inset-y-0 w-px bg-tinta-950/45"
                    style={{ left: `${(referencia / max) * 100}%` }} />
                </div>
                <span className="hidden text-right text-[13.5px] font-medio tabular-nums text-tinta-950 sm:block">
                  {cfg.fmt(v)}
                </span>
              </motion.div>
            );
          })}
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="seccion overflow-hidden rounded-caja">
          <header className="border-b border-trazo-fino px-4 py-3.5 sm:px-6 sm:py-4">
            <h3 className="text-[15px] font-medio text-tinta-950">Valor por etapa</h3>
          </header>
          <div className="space-y-3.5 px-4 py-5 sm:px-6 sm:py-6">
            {ETAPAS.map((s, i) => (
              <div key={s.etapa}
                   className="grid gap-x-3 gap-y-1.5 sm:grid-cols-[116px_minmax(0,1fr)_96px_30px] sm:items-center">
                <span className="flex items-center gap-2">
                  <Marbete style={{ background: tinte(ETAPA_NEON[s.etapa], 12),
                                    borderColor: "transparent", color: ETAPA_NEON[s.etapa] }}>
                    {s.etapa}
                  </Marbete>
                  <span className="ml-auto flex items-baseline gap-2 sm:hidden">
                    <span className="text-[13px] tabular-nums text-tinta-700">{moneyC(s.valor)}</span>
                    <span className="text-[12px] tabular-nums text-tinta-400">{s.n}</span>
                  </span>
                </span>
                <div className="h-2 overflow-hidden rounded-full bg-hueso-mesa">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(s.valor / maxEt) * 100}%` }}
                    transition={{ duration: .6, delay: .08 + i * .05 }}
                    className="h-full rounded-full" style={{ background: ETAPA_NEON[s.etapa] }} />
                </div>
                <span className="hidden text-right text-[13px] tabular-nums text-tinta-700 sm:block">
                  {moneyC(s.valor)}
                </span>
                <span className="hidden text-right text-[12.5px] tabular-nums text-tinta-400 sm:block">
                  {s.n}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="seccion overflow-hidden rounded-caja">
          <header className="border-b border-trazo-fino px-4 py-3.5 sm:px-6 sm:py-4">
            <h3 className="text-[15px] font-medio text-tinta-950">Totales de cartera</h3>
          </header>
          <dl>
            {([["Ingresos", money(TOTALES.ventas)],
               ["Costo", money(TOTALES.costo)],
               ["Utilidad", money(TOTALES.utilidad)],
               ["Margen", pct(TOTALES.margen)],
               ["VAN agregado", money(TOTALES.van)],
               ["Exposición máxima", money(TOTALES.exp)],
               ["m² construcción", num(TOTALES.gba)],
               ["Unidades", num(TOTALES.uds)]] as const).map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 border-b
                                      border-trazo-fino px-4 py-3 last:border-0 sm:px-6">
                <dt className="min-w-0 text-[13.5px] text-tinta-500">{k}</dt>
                <dd className="shrink-0 text-[14px] font-medio tabular-nums text-tinta-950">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
