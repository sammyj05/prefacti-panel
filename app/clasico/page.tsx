"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { EDIFICIOS, TOTALES, ETAPAS } from "@/lib/data";
import { Massing3D } from "@/components/Massing3D";
import { moneyC, num, pct } from "@/lib/format";

/**
 * Portada.
 *
 * No es un panel: es la primera página de un juego de planos. Toda la
 * composición cuelga de una retícula de doce columnas que se ve —los filetes
 * verticales no son adorno, son la caja— y del bloque de rótulo de abajo, que
 * es donde un plano pone la cartera, la fecha y la escala.
 *
 * La volumetría entra como pieza de portada, no como ilustración: es un
 * edificio real de la cartera, con sus datos al lado.
 */

const PORTADA = EDIFICIOS.find(e => e.id === "BAL-11") ?? EDIFICIOS[0];

const entra = {
  oculto: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.06 * i, duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

function Columnas() {
  /* La retícula, dibujada. Un plano enseña su caja; una web normalmente la
     esconde. Enseñarla es lo que ancla todo lo demás. */
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 mx-auto max-w-[1320px] px-6">
      <div className="grid h-full grid-cols-12">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="border-l border-trazo-fino/70 last:border-r" />
        ))}
      </div>
    </div>
  );
}

export default function Portada() {
  const alto = [...EDIFICIOS].sort((a, b) => b.margen - a.margen).slice(0, 5);

  return (
    <div className="relative min-h-screen overflow-hidden bg-hueso">
      <Columnas />

      <div className="relative mx-auto max-w-[1320px] px-6">
        {/* -------- cabecera -------- */}
        <header className="flex items-center justify-between border-b border-trazo-medio py-5">
          <div className="flex items-baseline gap-2.5">
            <span className="marca text-[23px] leading-none">Prefacti</span>
            <span className="nota text-tinta-400">Factibilidad inmobiliaria</span>
          </div>
          <Link href="/proyectos"
            className="group inline-flex items-center gap-2 rounded-pieza border border-tinta-900
                       bg-tinta-900 px-3.5 py-2 text-[12.5px] font-semibold text-hueso-alto
                       transition hover:bg-tinta-700">
            Entrar al panel
            <ArrowRight className="h-[15px] w-[15px] transition group-hover:translate-x-0.5" />
          </Link>
        </header>

        {/* -------- titular -------- */}
        <section className="grid grid-cols-1 gap-10 py-16 lg:grid-cols-12 lg:py-24">
          <motion.div className="lg:col-span-7" initial="oculto" animate="visible">
            <motion.p variants={entra} custom={0} className="nota mb-6 text-minio-600">
              Cartera Aravena · {EDIFICIOS.length} activos · Panamá
            </motion.p>

            <motion.h1 variants={entra} custom={1}
              className="font-display text-titular text-tinta-950">
              El número
              <br />
              <em className="italic text-minio-600">antes</em>
              <br />
              del ladrillo.
            </motion.h1>

            <motion.p variants={entra} custom={2}
              className="mt-7 max-w-[46ch] text-[15px] leading-[1.65] text-tinta-700">
              Prefacti resuelve la pre‑factibilidad de una promoción: volumetría,
              superficies vendibles, costes y retorno. Cambias una hipótesis y el
              margen se recalcula sobre la cartera entera, no sobre una hoja suelta.
            </motion.p>

            <motion.div variants={entra} custom={3} className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/proyectos" className="boton-minio boton">Ver la cartera</Link>
              <Link href="/simulador" className="boton">Abrir el simulador</Link>
            </motion.div>
          </motion.div>

          {/* -------- volumetría de portada -------- */}
          <motion.div className="lg:col-span-5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: .3, duration: 1 }}>
            <div className="pieza overflow-hidden">
              <div className="rotulo-bloque">
                <span className="nota">Volumetría · {PORTADA.id}</span>
                <span className="font-mono text-[11px] text-tinta-500">
                  {PORTADA.floors} plantas · {PORTADA.alturaM} m
                </span>
              </div>
              <Massing3D e={PORTADA} altura={330} />
              <div className="grid grid-cols-3 divide-x divide-trazo-fino border-t border-trazo-fino">
                {[
                  ["Superficie", `${num(PORTADA.gba)} m²`],
                  ["Unidades", String(PORTADA.unidades)],
                  ["Margen", pct(PORTADA.margen)],
                ].map(([k, v]) => (
                  <div key={k} className="px-3 py-2.5">
                    <div className="nota">{k}</div>
                    <div className="tnum mt-1 font-mono text-[15px] font-medium text-tinta-950">{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-tinta-500">
              {PORTADA.nombre} — {PORTADA.distrito}. Arrastra para girar.
            </p>
          </motion.div>
        </section>

        {/* -------- bloque de rótulo: la cartera en cifras -------- */}
        <motion.section
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: .7, ease: [0.16, 1, 0.3, 1] }}
          className="border-y border-trazo-medio py-8"
        >
          <div className="grid grid-cols-2 gap-y-7 md:grid-cols-4">
            {[
              ["Ingresos previstos", moneyC(TOTALES.ventas)],
              ["Coste total", moneyC(TOTALES.costo)],
              ["Utilidad", moneyC(TOTALES.utilidad)],
              ["Margen medio", pct(TOTALES.margen)],
            ].map(([k, v], i) => (
              <div key={k} className={i ? "md:border-l md:border-trazo-fino md:pl-6" : ""}>
                <div className="nota">{k}</div>
                <div className="tnum mt-2 font-mono text-[19px] font-medium tracking-tight text-tinta-950">{v}</div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* -------- índice de proyectos, como un listado de planos -------- */}
        <section className="py-16">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="font-display text-rotulo text-tinta-950">Mejor margen</h2>
            <Link href="/proyectos" className="nota text-cian-700 hover:text-cian-900">
              Los {EDIFICIOS.length} activos →
            </Link>
          </div>

          <ol className="border-t border-trazo-medio">
            {alto.map((e, i) => (
              <motion.li key={e.id}
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                viewport={{ once: true }} transition={{ delay: i * 0.05, duration: .5 }}
                className="group border-b border-trazo-fino"
              >
                <Link href={`/proyectos/${e.id}`}
                  className="grid grid-cols-12 items-center gap-3 py-3.5 transition hover:bg-hueso-alto">
                  <span className="col-span-1 font-mono text-[11px] text-tinta-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="col-span-1 h-2.5 w-2.5 rounded-[1px]" style={{ background: e.color }} />
                  <span className="col-span-4 text-[14.5px] font-medium text-tinta-950">{e.nombre}</span>
                  <span className="col-span-3 font-mono text-[11.5px] text-tinta-500">
                    {e.distrito} · {e.floors} plantas
                  </span>
                  <span className="col-span-2 font-mono text-[11.5px] text-tinta-500">{e.etapa}</span>
                  <span className="tnum col-span-1 text-right font-mono text-[14px] font-medium text-viable">
                    {pct(e.margen)}
                  </span>
                </Link>
              </motion.li>
            ))}
          </ol>
        </section>

        {/* -------- pie: bloque de rótulo de plano -------- */}
        <footer className="grid grid-cols-2 gap-6 border-t border-trazo-medio py-7 md:grid-cols-4">
          {[
            ["Cartera", "Aravena"],
            ["Activos", `${EDIFICIOS.length} proyectos`],
            ["Etapas", `${ETAPAS.length} en curso`],
            ["Documento", "Pre‑factibilidad"],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="nota">{k}</div>
              <div className="mt-1.5 font-mono text-[12px] text-tinta-700">{v}</div>
            </div>
          ))}
        </footer>
      </div>
    </div>
  );
}
