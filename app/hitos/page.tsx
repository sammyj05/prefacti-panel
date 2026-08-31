"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, CalendarDays } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ETAPA_NEON, tinte } from "@/lib/data";
import { CRONOGRAMA } from "@/lib/hitos";
import { HOY } from "@/lib/equipo";
import { responsableDe } from "@/lib/equipo";
import { Pagina, Avatar } from "@/components/Pagina";
import { Boton, Marbete, Vacio } from "@/components/ui";

/**
 * Hitos.
 *
 * El calendario ya dibujaba bien la línea de cada promoción, pero contaba una
 * sola cosa: cuándo pasa todo. Faltaba la que de verdad se le pide a un
 * cronograma —qué se ha pasado de fecha—, y estaba en los datos: un hito
 * pendiente cuya fecha ya quedó atrás está atrasado, y eso no se marcaba.
 *
 * Ahora hay tres estados, no dos: cumplido, previsto y atrasado. El atrasado es
 * lo único que se pinta en rojo en toda la pantalla, y la tabla de abajo abre
 * con ellos en vez de con el siguiente por fecha.
 */

/* El cronograma vive en `lib/hitos`, con la aplicación de móvil. Se calculaba
   aquí y otra vez allí, con dos anclas distintas, así que la misma promoción
   tenía dos calendarios según por dónde se mirara. */
const FILAS = CRONOGRAMA;
const TONO_ESTADO = {
  cumplido: "rgb(var(--tinta-950))",
  previsto: "rgb(var(--tinta-300))",
  atrasado: "rgb(var(--riesgo))",
} as const;

const FECHA = new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", year: "numeric" });
const MES = new Intl.DateTimeFormat("es", { month: "long", year: "numeric" });

export default function Hitos() {
  const [soloAtrasados, setSoloAtrasados] = useState(false);

  const { min, max } = useMemo(() => {
    const t = FILAS.flatMap(f => f.h.map(x => +x.d));
    return { min: Math.min(...t), max: Math.max(...t) };
  }, []);
  const span = max - min || 1;
  const pos = (d: Date | number) => ((+d - min) / span) * 100;

  const pendientes = FILAS
    .flatMap(f => f.h.filter(x => x.estado !== "cumplido").map(x => ({ ...x, e: f.e })))
    .sort((a, b) => +a.d - +b.d);

  const atrasados = pendientes.filter(x => x.estado === "atrasado");
  const visibles = (soloAtrasados ? atrasados : pendientes).slice(0, 14);

  /* Agrupar por mes: catorce fechas seguidas sin cortes se leen como una sola
     lista larga, y lo que se pregunta aquí es «qué cae este mes». */
  const grupos: { mes: string; filas: typeof visibles }[] = [];
  for (const x of visibles) {
    const mes = MES.format(x.d);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.mes === mes) ultimo.filas.push(x);
    else grupos.push({ mes, filas: [x] });
  }

  return (
    <div>
      <Pagina
        icono={CalendarDays}
        titulo="Hitos"
        bajada={
          atrasados.length > 0
            /* Con un solo hito atrasado en una sola promoción salía «1 hitos
               por detrás de su fecha en 1 promociones». */
            ? (() => {
                const n = atrasados.length;
                const p = new Set(atrasados.map(x => x.e.id)).size;
                return `${n} ${n === 1 ? "hito" : "hitos"} por detrás de su fecha `
                     + `en ${p} ${p === 1 ? "promoción" : "promociones"}.`;
              })()
            : "Todas las promociones van en fecha."
        }
        acciones={
          atrasados.length > 0 && (
            <Boton onClick={() => setSoloAtrasados(v => !v)}>
              {soloAtrasados ? "Ver todos los pendientes" : "Ver sólo atrasados"}
            </Boton>
          )
        }
      />

      {/* La columna del nombre baja de 200 a 128 px en estrecho.
          A 200 fijos, en un teléfono de 375 quedaban ciento cuarenta píxeles
          para dibujar cuatro años de calendario: los jalones se amontonaban
          unos sobre otros y la línea no decía nada. A 128 el nombre sigue
          leyéndose —va truncado— y el calendario recupera la mitad del ancho,
          que es lo que esta pantalla viene a enseñar. */}
      <section className="seccion overflow-hidden rounded-caja">
        <div className="grid grid-cols-[128px_minmax(0,1fr)] border-b border-trazo-fino sm:grid-cols-[200px_minmax(0,1fr)]">
          <div className="nota px-4 py-3 sm:px-5">Promoción</div>
          <div className="relative h-10 border-l border-trazo-fino">
            {/* Los años salen del propio calendario. Estaban escritos como
                `2024 + i`, de modo que con un cronograma que empezara más tarde
                el eje quedaba mudo: ninguno de los seis años caía dentro del
                rango y no se dibujaba ni una marca. */}
            {Array.from({ length: new Date(max).getFullYear() - new Date(min).getFullYear() + 1 },
              (_, i) => {
              const y = new Date(min).getFullYear() + i;
              const d = new Date(y, 0, 1);
              if (+d < min || +d > max) return null;
              return (
                <span key={y}
                  className="absolute top-3 -translate-x-1/2 font-mono text-[10.5px] text-tinta-400"
                  style={{ left: `${pos(d)}%` }}>{y}</span>
              );
            })}
          </div>
        </div>

        {FILAS.map(({ e, h }, i) => {
          const tarde = h.filter(x => x.estado === "atrasado").length;
          return (
            <motion.div key={e.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * .025, .35) }}
              className="grid grid-cols-[128px_minmax(0,1fr)] border-b border-trazo-fino
                         transition last:border-0 hover:bg-hueso-mesa/60
                         sm:grid-cols-[200px_minmax(0,1fr)]">
              <Link href={`/proyectos/${e.id}`} className="min-w-0 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.color }} />
                  <span className="truncate text-[14px] font-medio text-tinta-950">{e.nombre}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[12px] text-tinta-400">
                  <span>{e.etapa}</span>
                  {tarde > 0 && (
                    <span className="font-medio text-riesgo">{tarde} tarde</span>
                  )}
                </div>
              </Link>

              <div className="relative h-[52px] border-l border-trazo-fino">
                <div className="absolute top-[22px] h-[5px] rounded-full opacity-20"
                  style={{ left: `${pos(h[0].d)}%`,
                           width: `${Math.max(1, pos(h[h.length - 1].d) - pos(h[0].d))}%`,
                           background: "rgb(var(--tinta-950))" }} />
                {h.map(x => (
                  <span key={x.n}
                    title={`${x.n} · ${FECHA.format(x.d)} · ${x.estado}`}
                    className="absolute top-[18px] h-[13px] w-[13px] -translate-x-1/2 rounded-full
                               ring-2 ring-[rgb(var(--hueso))] transition"
                    style={{ left: `${pos(x.d)}%`, background: TONO_ESTADO[x.estado] }} />
                ))}
                {+HOY >= min && +HOY <= max && (
                  <span className="absolute inset-y-0 w-px bg-riesgo/70" style={{ left: `${pos(HOY)}%` }} />
                )}
              </div>
            </motion.div>
          );
        })}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-trazo-fino px-5 py-3
                        text-[12.5px] text-tinta-500">
          {([["cumplido", "Cumplido"], ["previsto", "Previsto"], ["atrasado", "Atrasado"]] as const)
            .map(([k, t]) => (
              <span key={k} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: TONO_ESTADO[k] }} />
                {t}
              </span>
            ))}
          <span className="flex items-center gap-2">
            <span className="h-3.5 w-px bg-riesgo/70" /> Hoy
          </span>
        </div>
      </section>

      <section className="mt-8 space-y-6">
        {/* El rótulo sigue la escala del panel y no el serif de rótulo de
            portada: en una pantalla de trabajo, un titular de 24 px en display
            sobre una tabla pesa más que la tabla. */}
        <h2 className="text-[18px] font-medio text-tinta-950">
          {soloAtrasados ? "Atrasados" : "Lo que viene"}
          <span className="ml-2 tabular-nums font-libro text-tinta-400">{visibles.length}</span>
        </h2>

        {grupos.length === 0 ? (
          <Vacio
            icono={CalendarCheck}
            titulo={soloAtrasados ? "Ningún hito atrasado" : "Nada pendiente"}
            detalle={soloAtrasados
              ? "Todas las promociones van en fecha ahora mismo."
              : "No queda ningún hito por delante en el calendario cargado."}
            accion={soloAtrasados
              ? <Boton onClick={() => setSoloAtrasados(false)}>Ver todos los pendientes</Boton>
              : undefined}
            compacto
          />
        ) : grupos.map(g => (
          <div key={g.mes}>
            <h3 className="nota mb-2.5">{g.mes}</h3>
            <div className="seccion divide-y divide-trazo-fino overflow-hidden rounded-caja">
              {g.filas.map((x, i) => {
                const quien = responsableDe(x.e.id);
                return (
                  /* Tres filas en estrecho y una sola en ancho. Con la fila
                     única, en un teléfono la fecha, el hito, la promoción, la
                     persona y el estado envolvían en cuatro renglones sin orden
                     y no se sabía qué pertenecía a qué. */
                  <div key={`${x.e.id}-${x.n}-${i}`}
                    className="grid gap-x-4 gap-y-1.5 px-4 py-3 transition hover:bg-hueso-mesa/60
                               sm:flex sm:items-center sm:px-5 sm:py-3.5">
                    <span className="order-2 font-mono text-[12px] tabular-nums text-tinta-500
                                     sm:order-1 sm:w-[104px] sm:shrink-0 sm:text-[12.5px]">
                      {FECHA.format(x.d)}
                    </span>
                    <span className="order-1 min-w-0 truncate text-[14.5px] text-tinta-950
                                     sm:order-2 sm:flex-1">
                      {x.n}
                    </span>
                    <span className="order-3 flex min-w-0 items-center gap-2.5 sm:contents">
                      <Link href={`/proyectos/${x.e.id}`} className="min-w-0 shrink">
                        <Marbete style={{ background: tinte(ETAPA_NEON[x.e.etapa], 12),
                                          borderColor: "transparent",
                                          color: ETAPA_NEON[x.e.etapa] }}>
                          <span className="truncate">{x.e.nombre}</span>
                        </Marbete>
                      </Link>
                      <span className="shrink-0 sm:mx-0"><Avatar u={quien.u} n={quien.n} tam={24} /></span>
                      <span className="ml-auto shrink-0 text-right text-[12.5px] font-medio sm:ml-0 sm:w-[74px]"
                        style={{ color: x.estado === "atrasado" ? "rgb(var(--riesgo))" : "rgb(var(--tinta-400))" }}>
                        {x.estado === "atrasado" ? "Atrasado" : "Previsto"}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
