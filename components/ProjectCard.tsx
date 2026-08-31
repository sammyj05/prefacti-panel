"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { Edificio } from "@/lib/data";
import { estadoDe, ETAPA_NEON, tinte } from "@/lib/data";
import { ALERTAS } from "@/lib/alertas";
import { responsableDe, ultimoApunte, fechaDe, hace } from "@/lib/equipo";
import { metricaDe, POR_DEFECTO, type ClaveMetrica } from "@/lib/metricas";
import { TiltCard } from "./TiltCard";
import { Anillo } from "./Anillo";
import { Avatar } from "./Pagina";

/**
 * Ficha de proyecto.
 *
 * Responde a una sola pregunta —¿este proyecto va bien?— con el margen en un
 * arco. Las cifras de apoyo las elige quien mira: hasta seis de doce, desde la
 * barra de la cartera. Antes eran tres fijas puestas por nosotros, y quien
 * viniera a buscar VAN, TIR o exposición tenía que abrir las dieciocho fichas
 * de detalle.
 *
 * El pie es nuevo y es lo que hace que dieciocho fichas dejen de parecer la
 * misma repetida: quién la lleva y cuándo se tocó por última vez. Sin eso, la
 * rejilla se leía como un catálogo — todas las tarjetas intercambiables, sin
 * un solo dato que dijera cuál está viva. Y las que tienen aviso lo enseñan
 * arriba: si algo va mal, se ve antes de entrar.
 */

export function ProjectCard({
  e, i, metricas = POR_DEFECTO,
}: {
  e: Edificio;
  i: number;
  /** Las cifras de apoyo, elegidas en la barra de la cartera. */
  metricas?: ClaveMetrica[];
}) {
  const st = estadoDe(e.margen);
  const tono = ETAPA_NEON[e.etapa];
  const avisos = ALERTAS.filter(a => a.proyecto === e.nombre);
  const grave = avisos.some(a => a.sev === "critica");
  const quien = responsableDe(e.id);
  const apunte = ultimoApunte(e.id);

  /* Las de apoyo salen de la elección del usuario, no de una lista nuestra.
     `filter(Boolean)` porque una clave guardada en el navegador puede haber
     dejado de existir entre dos versiones. */
  const APOYO = metricas.map(metricaDe).filter(Boolean) as NonNullable<ReturnType<typeof metricaDe>>[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .38, delay: Math.min(i * 0.035, .4), ease: [.22,.68,.36,1] }}
      /* `min-w-0` no es decorativo: una celda de rejilla trae de serie
         `min-width: auto`, es decir, no baja de su ancho mínimo de contenido.
         Con el anillo de 78 px fijos y dos marbetes que no parten, ese mínimo
         salía en 399 px, y en un teléfono de 375 la ficha empujaba la página
         entera hacia la derecha: la pantalla se desplazaba en horizontal, con
         la banda cortada, en la única pantalla que se mira desde la calle.
         Puesto a cero, manda la columna y los `truncate` de dentro hacen su
         trabajo, que es para lo que están.

         El relleno también baja en estrecho. Veintiocho píxeles por lado son
         casi un sexto del ancho de un teléfono gastados en margen. */
      className="group h-full min-w-0"
    >
      <TiltCard intensity={4}>
        <Link
          href={`/proyectos/${e.id}`}
          className="seccion seccion-viva flex h-full flex-col rounded-caja p-5 sm:p-7"
        >
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: e.color }} />
                {/* Escala con la columna. A 24 px fijos, «Mirador del Este»
                    cabía en un monitor y se cortaba en «Mirador del E…» en
                    cuanto la rejilla pasaba a dos columnas, que es donde más se
                    necesita distinguir una ficha de otra. */}
                <h3 className="truncate font-display text-[clamp(1.15rem,1rem+.55vw,1.5rem)]
                               leading-tight text-tinta-950">
                  {e.nombre}
                </h3>
                {avisos.length > 0 && (
                  <span
                    title={avisos.map(a => a.titulo).join(" · ")}
                    className="ml-auto flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5
                               text-[11.5px] font-medio"
                    style={{
                      background: tinte(grave ? "rgb(var(--riesgo))" : "rgb(var(--tenso))", 14),
                      color: grave ? "rgb(var(--riesgo))" : "rgb(var(--tenso))",
                    }}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {avisos.length}
                  </span>
                )}
              </div>

              <p className="mt-2 truncate text-[14px] text-tinta-500">
                {e.distrito} · {e.floors} plantas
              </p>

              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                <span className="marbete border-transparent bg-hueso-mesa text-tinta-700">{e.tipo}</span>
                <span
                  className="marbete"
                  style={{ borderColor: "transparent", background: tinte(tono, 12), color: tono }}
                >
                  {e.etapa}
                </span>
              </div>
            </div>

            <Anillo v={e.margen} color={st.c} />
          </div>

          {/* Tres columnas siempre: con seis métricas hace dos filas, así la
              ficha crece en alto y no en ancho, que es lo que rompería la
              rejilla. En la sans y no en la mono —a 17 px la Roboto Mono pierde
              legibilidad— con `tabular-nums`, que es lo único que la mono
              aportaba aquí. */}
          <div className="mt-7 grid grid-cols-3 gap-x-4 gap-y-4 border-t border-trazo-fino pt-5">
            {APOYO.map(m => (
              <div key={m.k} className="min-w-0">
                <div className="truncate text-[12.5px] text-tinta-500">{m.corto}</div>
                <div className="mt-1 truncate text-[17px] font-medio tabular-nums text-tinta-950">
                  {m.fmt(e)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto flex items-center gap-2.5 pt-5 text-[12.5px] text-tinta-400">
            <Avatar u={quien.u} n={quien.n} tam={24} />
            <span className="truncate">{quien.n}</span>
            {apunte && (
              <span className="ml-auto shrink-0 truncate">{hace(fechaDe(apunte.ts))}</span>
            )}
          </div>
        </Link>
      </TiltCard>
    </motion.div>
  );
}
