"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { EDIFICIOS, TOTALES, ETAPAS, ETAPA_NEON, tinte } from "@/lib/data";
import { ALERTAS } from "@/lib/alertas";
import { moneyC, pct } from "@/lib/format";

/**
 * Retícula de cajas.
 *
 * Tres piezas de proporción distinta —una ancha y dos cuadradas— porque la
 * información que llevan tampoco es del mismo orden: una lista quiere ancho,
 * un total quiere centro, un aviso quiere poco sitio. Una retícula regular las
 * habría igualado y habría hecho parecer que las tres pesan lo mismo.
 *
 * La corona del consolidado es la misma escala que el anillo de las fichas
 * pero contando otra cosa: cada arco es una etapa, proporcional a su valor en
 * cartera. No lleva rótulos — para eso está la leyenda debajo.
 */

const TOP = [...EDIFICIOS].sort((a, b) => b.margen - a.margen).slice(0, 3);
const CRITICAS = ALERTAS.filter(a => a.sev === "critica");
const PROYECTOS_EN_AVISO = new Set(CRITICAS.map(a => a.proyecto)).size;

/** Corona de etapas: un arco por etapa, en proporción a su valor. */
function Corona() {
  const total = ETAPAS.reduce((s, e) => s + e.valor, 0) || 1;
  const R = 78;
  const C = 2 * Math.PI * R;
  let acumulado = 0;

  return (
    <svg viewBox="0 0 190 190" className="h-[190px] w-[190px] -rotate-90">
      {ETAPAS.map(e => {
        const parte = e.valor / total;
        /* 1,5 % de hueco entre arcos: el corte es lo que los separa, no un
           filete, que a este grosor se comería el arco más pequeño. */
        const largo = Math.max(0, C * parte - C * 0.015);
        const inicio = C * acumulado;
        acumulado += parte;
        return (
          <motion.circle
            key={e.etapa}
            cx="95" cy="95" r={R} fill="none"
            stroke={ETAPA_NEON[e.etapa]} strokeWidth="10" strokeLinecap="butt"
            strokeDasharray={`${largo} ${C - largo}`}
            initial={{ strokeDashoffset: -inicio, opacity: 0 }}
            whileInView={{ strokeDashoffset: -inicio, opacity: 1 }}
            viewport={{ once: true, amount: .5 }}
            transition={{ duration: .7, ease: "easeOut" }}
          />
        );
      })}
    </svg>
  );
}

function Caja({
  children, className = "", retraso = 0,
}: { children: React.ReactNode; className?: string; retraso?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: .3 }}
      transition={{ duration: .6, delay: retraso, ease: [0.16, 1, 0.3, 1] }}
      className={`pieza p-7 md:p-8 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function Bento() {
  return (
    <div className="grid gap-5 lg:grid-cols-3 lg:grid-rows-2">
      {/* 1 — Ancha: los tres de mejor margen */}
      <Caja className="lg:col-span-2 lg:row-span-2">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-display text-sub text-tinta-950">Top activos</h3>
          <Link href="/proyectos" className="nota text-tinta-500 transition hover:text-tinta-950">
            Ver la cartera →
          </Link>
        </div>

        <div className="mt-7 space-y-px">
          {TOP.map((e, i) => (
            <Link
              key={e.id}
              href={`/proyectos/${e.id}`}
              className={`group grid grid-cols-[1fr_auto] items-center gap-4 rounded-pieza px-3 py-5
                          transition hover:bg-vidrio-hondo md:grid-cols-[1fr_170px_110px]
                          ${i ? "border-t border-trazo-fino" : ""}`}
            >
              <span className="min-w-0">
                <span className="block truncate font-display text-[clamp(1.4rem,2.2vw,2rem)]
                                 italic leading-tight text-tinta-950">
                  {e.nombre}
                </span>
                <span className="mt-1 block truncate text-tinta-500">{e.distrito}</span>
              </span>

              <span className="hidden md:block">
                <span className="marbete"
                  style={{ borderColor: tinte(ETAPA_NEON[e.etapa], 33),
                           background: tinte(ETAPA_NEON[e.etapa], 12),
                           color: ETAPA_NEON[e.etapa] }}>
                  {e.etapa}
                </span>
              </span>

              <span className="flex items-center justify-end gap-2 text-[clamp(1.2rem,1.8vw,1.6rem)]
                               font-medio tabular-nums text-tinta-950">
                {pct(e.margen)}
                <ArrowUpRight className="h-4 w-4 shrink-0 text-tinta-300 transition
                                         group-hover:text-tinta-950" />
              </span>
            </Link>
          ))}
        </div>
      </Caja>

      {/* 2 — Cuadrada: el consolidado */}
      <Caja retraso={.08} className="flex flex-col items-center justify-center text-center">
        <span className="nota">Consolidado</span>
        <div className="relative mt-5 grid place-items-center">
          <Corona />
          {/* Dentro del anillo cabe poco: el hueco útil es el diámetro menos
              dos grosores, así que la cifra va topada a 20 px y en redonda —la
              cursiva, al inclinarse, pedía más ancho del que hay. */}
          <div className="absolute grid w-[118px] place-items-center text-center">
            <span className="cifra text-[22px] leading-none text-tinta-950">
              {moneyC(TOTALES.ventas)}
            </span>
            <span className="nota mt-1.5 text-[9.5px] text-tinta-400">Ingresos</span>
          </div>
        </div>
        <div className="mt-7 grid w-full grid-cols-2 gap-x-4 gap-y-2.5">
          {ETAPAS.map(s => (
            <span key={s.etapa}
              className="flex min-w-0 items-center gap-2 text-[12.5px] text-tinta-500">
              <span className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: ETAPA_NEON[s.etapa] }} />
              <span className="truncate">{s.etapa}</span>
              <span className="ml-auto shrink-0 tabular-nums text-tinta-400">{s.n}</span>
            </span>
          ))}
        </div>
      </Caja>

      {/* 3 — Cuadrada: los avisos */}
      <Caja retraso={.16} className="flex flex-col">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full
                             bg-riesgo opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-riesgo" />
          </span>
          <span className="nota">Alertas</span>
        </div>

        <p className="mt-6 font-display text-[clamp(1.3rem,2vw,1.7rem)] leading-[1.15] text-tinta-950">
          {PROYECTOS_EN_AVISO === 1
            ? "1 proyecto requiere revisión de costes."
            : `${PROYECTOS_EN_AVISO} proyectos requieren revisión de costes.`}
        </p>

        <p className="mt-3 text-tinta-500">
          Margen por debajo del umbral de inversión: no absorbe una desviación de obra del 5 %.
        </p>

        <Link href="/alertas"
          className="boton mt-auto self-start">
          Ver las {ALERTAS.length} alertas
        </Link>
      </Caja>
    </div>
  );
}
