"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, LayoutGrid, Plus } from "lucide-react";
import type { ProyectoBreve } from "@/lib/cartera";
import { moneyC, pct } from "@/lib/format";
import { UMBRALES } from "@/lib/equipo";
import { estadoDe } from "@/lib/data";
import { Pagina } from "@/components/Pagina";
import { SelectorMetricas } from "@/components/SelectorMetricas";
import { Boton, Marbete } from "@/components/ui";
import { Anillo } from "@/components/Anillo";
import { METRICAS, MAXIMO, useMetricas, type ClaveMetrica } from "@/lib/metricas";
import {
  CARTERA_MAXIMO, useMetricasCartera, type TotalesCartera,
} from "@/lib/metricasCartera";

/**
 * La cartera de la empresa, leída de la base.
 *
 * Enseña lo mismo que la de demostración y con los mismos controles: se elige
 * qué cifras van en el consolidado —hasta cuatro de doce— y qué cifras van en
 * cada tarjeta —hasta seis de doce—, y la elección se recuerda en el navegador.
 *
 * Esos dos selectores ya existían y se habían quedado atrás cuando la cartera
 * pasó a leer de la base: la pantalla nueva traía cuatro cifras fijas y ninguna
 * forma de cambiarlas. Aquí se reutilizan tal cual, con el catálogo entero,
 * porque lo que se elige no depende de dónde salga el dato.
 *
 * Las tarjetas usan el mismo lenguaje que la ficha: anillo de margen a la
 * derecha —que es la cifra que decide— y debajo las de apoyo que se hayan
 * elegido. Cuando la promoción todavía no tiene estudio, se dice en vez de
 * pintar una fila de ceros que parece un resultado.
 */

/** Los totales de la empresa, sumados de lo que trae cada promoción. */
function totalesDe(proyectos: ProyectoBreve[]): TotalesCartera {
  const t = proyectos.reduce((a, p) => ({
    ventas: a.ventas + p.cifras.ventas,
    costo: a.costo + p.cifras.costo,
    utilidad: a.utilidad + p.cifras.utilidad,
    van: a.van + p.cifras.van,
    /* La exposición no se suma: es el pico de caja, y dos promociones no tienen
       por qué tocar fondo el mismo mes. Se toma la mayor, que es la cota que de
       verdad hay que tener disponible. */
    exp: Math.max(a.exp, p.cifras.exposicion),
    uds: a.uds + p.cifras.unidades,
    gba: a.gba + p.cifras.gba,
    gla: a.gla + p.cifras.gla,
  }), { ventas: 0, costo: 0, utilidad: 0, van: 0, exp: 0, uds: 0, gba: 0, gla: 0 });

  return {
    ...t,
    margen: t.ventas > 0 ? t.utilidad / t.ventas : 0,
    promociones: proyectos.length,
  };
}

/** Qué vale cada cifra de apoyo para una promoción de la base. */
function valorDe(k: ClaveMetrica, p: ProyectoBreve): string {
  const c = p.cifras;
  switch (k) {
    case "ventas": return moneyC(c.ventas);
    case "costo": return moneyC(c.costo);
    case "utilidad": return moneyC(c.utilidad);
    case "roi": return pct(c.roi, 1);
    case "tir": return c.tir == null ? "n/d" : pct(c.tir, 1);
    case "van": return moneyC(c.van);
    case "exposicion": return moneyC(c.exposicion);
    case "unidades": return c.unidades ? String(c.unidades) : "—";
    case "gba": return c.gba ? `${c.gba.toLocaleString("es")} m²` : "—";
    case "gla": return c.gla ? `${c.gla.toLocaleString("es")} m²` : "—";
    case "precioM2": return c.gla > 0 ? moneyC(c.ventas / c.gla) : "—";
    case "eficiencia": return c.gba > 0 ? pct(c.gla / c.gba, 0) : "—";
    default: return "—";
  }
}

export function CarteraReal({ proyectos, empresa }: {
  proyectos: ProyectoBreve[];
  empresa: string | null;
}) {
  const totales = totalesDe(proyectos);
  const panel = useMetricasCartera(totales);
  const ficha = useMetricas();

  const elegidas = panel.claves
    .map(k => panel.todas.find(m => m.k === k))
    .filter(Boolean) as typeof panel.todas;

  const sinEstudio = proyectos.filter(p => p.cifras.ventas === 0).length;
  /* Las que ya tienen estudio, primero. Una cartera se abre por lo que se puede
     decidir hoy; lo que falta por cargar es trabajo pendiente y va detrás. */
  const orden = [...proyectos].sort((a, b) => b.cifras.ventas - a.cifras.ventas);

  return (
    <div className="max-w-[76rem]">
      <Pagina
        icono={LayoutGrid}
        titulo={empresa ?? "Cartera"}
        bajada={sinEstudio > 0
          ? `${proyectos.length} ${proyectos.length === 1 ? "promoción" : "promociones"}, `
            + `${sinEstudio} sin estudio cargado.`
          : `${proyectos.length} ${proyectos.length === 1 ? "promoción" : "promociones"} en cartera.`}
        acciones={
          <span className="flex flex-wrap items-center gap-2">
            <SelectorMetricas
              claves={panel.claves}
              alternar={panel.alternar as (k: never) => void}
              restablecer={panel.restablecer}
              catalogo={panel.todas.map(m => ({ k: m.k, t: m.t, d: m.pie }))}
              maximo={CARTERA_MAXIMO}
              rotulo="Cifras del panel"
              ayuda={`Elige hasta ${CARTERA_MAXIMO} para el consolidado.`}
              boton="Panel"
            />
            <SelectorMetricas
              claves={ficha.claves}
              alternar={ficha.alternar as (k: never) => void}
              restablecer={ficha.restablecer}
              maximo={MAXIMO}
              rotulo="Cifras de la ficha"
              ayuda={`El margen va siempre en el anillo. Elige hasta ${MAXIMO} de apoyo.`}
              boton="Tarjetas"
            />
            <Boton href="/proyectos/nuevo" tono="solido">
              <Plus className="h-4 w-4" aria-hidden /> Nueva promoción
            </Boton>
          </span>
        }
      />

      {/* El consolidado. Las columnas siguen al número elegido, así que con dos
          cifras no quedan dos huecos vacíos a la derecha. */}
      <section
        className="seccion grid overflow-hidden rounded-caja divide-y divide-trazo-fino
                   sm:divide-x sm:divide-y-0"
        /* `auto-fit` en vez de un número de columnas: reparte las que haya
           elegidas y baja a una sola en estrecho sin necesitar un punto de
           ruptura. Con un número fijo, dos cifras dejaban dos huecos. */
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
      >
        {elegidas.map((m, i) => (
          <motion.div
            key={m.k}
            className="px-6 py-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="nota">{m.t}</div>
            <div className="cifra mt-1.5 text-[clamp(1.6rem,3vw,2.1rem)] leading-none"
                 style={{ color: m.tono === "mal" ? "rgb(var(--tenso))" : undefined }}>
              {m.v}
            </div>
            <div className="mt-1.5 text-[13px] text-tinta-500">{m.pie}</div>
          </motion.div>
        ))}
      </section>

      <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-2">
        {orden.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              href={`/proyectos/${p.id}`}
              className={`seccion flex h-full flex-col rounded-caja px-6 py-5 transition
                          hover:border-trazo-medio hover:shadow-pieza
                          ${p.cifras.ventas > 0 ? "" : "border-dashed"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {/* El nombre en la letra de rótulo y a cuerpo de titular: es
                      lo que se busca al recorrer la cartera, y a quince píxeles
                      pesaba lo mismo que el resto de la tarjeta. */}
                  <h2 className="font-display text-[22px] leading-[1.1] text-tinta-950">
                    {p.nombre}
                  </h2>
                  <div className="mt-1.5 text-[13.5px] text-tinta-500">
                    {[p.ubicacion, p.tipo === "torre" ? "Torre residencial" : "Casas",
                      p.cifras.floors ? `${p.cifras.floors} plantas` : null,
                      p.cifras.gba ? `${p.cifras.gba.toLocaleString("es")} m²` : null]
                      .filter(Boolean).join(" · ")}
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <Marbete>{p.estado}</Marbete>
                    {!p.publicada && <Marbete tono="aviso">Borrador</Marbete>}
                  </div>
                </div>

                {/* El anillo, dentro de la caja y con su umbral debajo. Antes
                    salía por la esquina —quedaba cortado contra el canto— y sin
                    referencia: un 30 % no dice nada hasta que se sabe que el
                    comité pide 15. */}
                {p.cifras.ventas > 0 && (
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    {/* El color lo decide `estadoDe`, que es la misma escala
                        que usa la ficha y las alertas: viable, marginal, en
                        riesgo. Inventar aquí un verde y un rojo propios habría
                        dado dos lecturas distintas del mismo margen. */}
                    <Anillo v={p.cifras.margen} color={estadoDe(p.cifras.margen).c} tam={62} />
                    <span className="nota text-tinta-400">
                      {estadoDe(p.cifras.margen).t}
                    </span>
                    <span className="text-[11px] text-tinta-400">
                      umbral {pct(UMBRALES.margen, 0)}
                    </span>
                  </div>
                )}
              </div>

              {/* `mt-auto` empuja las cifras al pie: con tarjetas de alto
                 distinto, las filas de números quedaban a alturas distintas y
                 la cartera dejaba de poder leerse en horizontal. */}
              {p.cifras.ventas > 0 ? (
                <div className="mt-auto grid gap-4 pt-6"
                     style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
                  {ficha.claves.map(k => {
                    const m = METRICAS.find(x => x.k === k);
                    if (!m) return null;
                    return (
                      <div key={k}>
                        <div className="nota text-tinta-400">{m.corto}</div>
                        <div className="cifra mt-1 text-[19px] leading-none">{valorDe(k, p)}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-auto pt-6">
                  <p className="text-[13.5px] leading-relaxed text-tinta-500">
                    Sin cuadro de áreas ni presupuesto, así que todavía no hay
                    ingreso ni coste que calcular.
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[13.5px]
                                   font-medio text-minio-600">
                    Cargar el estudio
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </div>
              )}
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
