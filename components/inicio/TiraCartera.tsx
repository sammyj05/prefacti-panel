"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { EDIFICIOS } from "@/lib/data";
import { UMBRALES } from "@/lib/equipo";
import { pct } from "@/lib/format";

/**
 * La cartera, en píxeles.
 *
 * El panel del titular tenía media pantalla en blanco entre el titular y el
 * filete. Lo que la llena no es un adorno: son las dieciocho promociones, una
 * por columna, con la altura de su margen y el umbral del comité marcado a
 * trazos. La misma trama de la portada, pero diciendo algo comprobable.
 *
 * Se levanta de izquierda a derecha con el desplazamiento, columna a columna,
 * así que entra con el mismo gesto que el resto de la página y no como un
 * gráfico que aparece de golpe.
 *
 * Es campo propio y no la matriz grande: aquélla tiene su rejilla de 96×48 fija
 * en constantes de módulo y sus siete figuras. Aquí hacen falta cuatro columnas
 * por promoción y catorce filas, y forzar la otra a esta forma habría costado
 * más que estas cincuenta líneas.
 */

const FILAS = 14;
const POR_PROMO = 4;
const ESCALA = 0.45;               // el techo de la cartera, igual que el anillo
const COLS = EDIFICIOS.length * POR_PROMO;

/* Cuántas celdas encendidas le toca a cada promoción, y si baja del umbral. */
const BARRAS = EDIFICIOS.map(e => ({
  id: e.id,
  nombre: e.nombre,
  margen: e.margen,
  celdas: Math.max(1, Math.round((Math.min(e.margen, ESCALA) / ESCALA) * FILAS)),
  bajo: e.margen < UMBRALES.margen,
}));

/* La fila del umbral, contada desde abajo. */
const FILA_UMBRAL = Math.round((UMBRALES.margen / ESCALA) * FILAS);

export function TiraCartera() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 88%", "start 35%"] });
  const [levantadas, setLevantadas] = useState(0);
  const [sobre, setSobre] = useState<number | null>(null);

  /* Cuántas columnas están ya en pie. Se guarda en estado —y no se escribe
     celda a celda como en la matriz grande— porque son 1.008 nodos, no 4.608,
     y a esta escala un renderizado por columna es más barato que el bucle. */
  useMotionValueEvent(scrollYProgress, "change", v => {
    const n = Math.round(Math.max(0, Math.min(1, v)) * BARRAS.length);
    if (n !== levantadas) setLevantadas(n);
  });

  const opacidadRotulo = useTransform(scrollYProgress, [0.55, 0.8], [0, 1]);

  return (
    <div ref={ref} className="mt-12">
      <div className="flex items-end justify-between gap-4">
        <span className="nota">Margen por promoción</span>
        <motion.span style={{ opacity: opacidadRotulo }} className="nota text-tinta-400">
          Umbral del comité · {pct(UMBRALES.margen, 0)}
        </motion.span>
      </div>

      <div
        className="relative mt-4 grid select-none"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${FILAS}, 1fr)`,
          gap: "2px",
          height: "clamp(110px, 14vh, 168px)",
        }}
        onPointerLeave={() => setSobre(null)}
      >
        {BARRAS.map((b, i) =>
          Array.from({ length: POR_PROMO }, (_, k) => {
            const enPie = i < levantadas;
            const destacada = sobre === i;
            return Array.from({ length: FILAS }, (_, f) => {
              /* `f` cuenta desde arriba; la barra crece desde abajo. */
              const desdeAbajo = FILAS - f;
              const encendida = enPie && desdeAbajo <= b.celdas;
              const cima = encendida && desdeAbajo === b.celdas;
              return (
                <div
                  key={`${b.id}-${k}-${f}`}
                  title={`${b.nombre} · ${pct(b.margen)}`}
                  onPointerEnter={() => setSobre(i)}
                  style={{
                    gridColumn: i * POR_PROMO + k + 1,
                    gridRow: f + 1,
                    background: encendida
                      ? (cima
                          ? "rgb(var(--minio-600))"
                          : b.bajo
                            ? "rgb(var(--riesgo))"
                            : "rgb(var(--tinta-950))")
                      : desdeAbajo === FILA_UMBRAL
                        /* La fila del umbral se marca incluso donde no hay
                           barra: es lo que la convierte en una línea y no en
                           una muesca dentro de cada columna. */
                        ? "var(--trazo-medio)"
                        : "var(--trazo-fino)",
                    opacity: encendida ? (destacada ? 1 : 0.92) : (destacada ? 0.5 : 1),
                    transition: "background .3s ease, opacity .2s ease",
                  }}
                />
              );
            });
          }),
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-4">
        <span className="text-[12.5px] tabular-nums text-tinta-400">
          {sobre === null
            ? `${BARRAS.length} promociones · ${BARRAS.filter(b => b.bajo).length} bajo umbral`
            : `${BARRAS[sobre].nombre} · ${pct(BARRAS[sobre].margen)}`}
        </span>
        <span className="text-[12.5px] text-tinta-400">Escala 0 – {pct(ESCALA, 0)}</span>
      </div>
    </div>
  );
}
