"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";

/**
 * Piezas guiadas por el desplazamiento.
 *
 * Todas comparten la misma idea: el desplazamiento no dispara animaciones, las
 * conduce. La diferencia importa — una animación disparada se reproduce sola y
 * ya no responde a nadie; una conducida va y viene con la rueda, se puede parar
 * a medias, y por eso se lee como si la página tuviera peso.
 */

export const SUAVE = [0.16, 1, 0.3, 1] as const;

/* -------------------------------------------------------------------------- */

/**
 * Barra de avance de la página.
 *
 * En una portada de ocho pantallas, la barra del navegador es lo único que dice
 * cuánto queda, y en pantalla completa no está. Es un pelo de un pixel: si se
 * nota, molesta.
 */
export function BarraProgreso() {
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX: x, transformOrigin: "0%" }}
      className="fixed inset-x-0 top-0 z-[60] h-[2px] bg-tinta-950"
    />
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Sección fijada con pasos.
 *
 * La columna izquierda se queda quieta mientras la derecha pasa sus bloques por
 * delante. Es el patrón que mejor funciona para explicar un proceso de tres
 * pasos: el enunciado no se va de pantalla mientras se leen los pasos, así que
 * no hay que recordarlo.
 *
 * El alto de la sección se calcula a partir del número de pasos —una pantalla
 * por paso más una de entrada— porque de eso depende cuánto dura el fijado; con
 * un alto fijo, añadir un cuarto paso lo rompería en silencio.
 */
export function Fijado({
  rotulo,
  titulo,
  pasos,
}: {
  rotulo: string;
  titulo: React.ReactNode;
  pasos: { n: string; t: string; d: string }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  return (
    /* Una pantalla por paso, no una de más. Con `pasos.length + 1` sobraba una
       pantalla entera al final en la que ya no cambiaba nada, y era justo el
       hueco vacío que hacía que la sección pareciera sin terminar. */
    <div ref={ref} style={{ height: `${pasos.length * 100}vh` }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1320px] gap-12 px-4 md:px-8
                        lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] lg:gap-20">
          {/* La columna fija va sobre lamina como el resto de los paneles: con
              la trama a plena intensidad por detrás, un titular suelto sobre
              ella se lee a medias. */}
          <div className="lamina max-w-[30rem] rounded-hueco px-7 py-9">
            <span className="nota">{rotulo}</span>
            <h2 className="mt-6 font-display text-[clamp(2.4rem,5vw,4.2rem)] leading-[1.02] text-tinta-950">
              {titulo}
            </h2>

            {/* El índice. Sustituye a la regla suelta que había aquí: dice en
                cuál de los tres se está y, sobre todo, ocupa la columna. Vacía,
                la mitad izquierda de la pantalla era la mitad de la sección. */}
            <ol className="mt-10 hidden space-y-1 lg:block">
              {pasos.map((p, i) => (
                <Indice key={p.n} p={p} i={i} total={pasos.length} avance={scrollYProgress} />
              ))}
            </ol>
          </div>

          <div className="space-y-5">
            {pasos.map((p, i) => (
              <Paso key={p.n} p={p} i={i} total={pasos.length} avance={scrollYProgress} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Una línea del índice de la columna fija: número, título y su barra. */
function Indice({
  p, i, total, avance,
}: {
  p: { n: string; t: string; d: string };
  i: number; total: number;
  avance: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const desde = i / total;
  const hasta = (i + 1) / total;
  const opacidad = useTransform(avance, [desde - 0.06, desde + 0.02], [0.35, 1]);
  const ancho = useTransform(avance, [desde, hasta], ["0%", "100%"]);

  return (
    <motion.li style={{ opacity: opacidad }} className="py-2.5">
      <div className="flex items-baseline gap-3">
        <span className="nota w-6 shrink-0 text-tinta-400">{p.n}</span>
        <span className="text-[15px] font-medio text-tinta-950">{p.t}</span>
      </div>
      <div className="mt-2 h-px w-full bg-trazo-fino">
        <motion.div style={{ width: ancho }} className="h-full bg-minio-600" />
      </div>
    </motion.li>
  );
}

function Paso({
  p, i, total, avance,
}: {
  p: { n: string; t: string; d: string };
  i: number; total: number;
  avance: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  /* Cada paso tiene su tramo del recorrido. El suelo de opacidad es 0,62 y no
     0,22: con la trama a plena intensidad por detrás, una lámina al 22 % dejaba
     ver el mosaico a través del texto y el paso inactivo era ilegible. A 0,62
     se sigue distinguiendo cuál está activo —lo dice sobre todo la escala— y
     los otros dos se pueden leer, que es lo que un índice de tres pasos tiene
     que permitir. */
  const desde = i / total;
  const hasta = (i + 1) / total;
  const opacidad = useTransform(avance,
    [desde - 0.08, desde + 0.02, hasta, hasta + 0.1], [0.62, 1, 1, 0.68]);
  const escala = useTransform(avance,
    [desde - 0.08, desde + 0.02, hasta, hasta + 0.1], [0.97, 1, 1, 0.975]);
  const x = useTransform(avance, [desde - 0.08, desde + 0.02], [26, 0]);

  return (
    <div className="caja-tras">
      <motion.div style={{ opacity: opacidad, scale: escala, x }}
                  className="lamina rounded-hueco p-8">
        <span className="nota text-tinta-400">{p.n}</span>
        <h3 className="mt-4 font-display text-[clamp(1.6rem,2.6vw,2.1rem)] leading-tight text-tinta-950">
          {p.t}
        </h3>
        <p className="mt-3 text-[15.5px] leading-relaxed text-tinta-700">{p.d}</p>
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Carrusel conducido por el desplazamiento vertical.
 *
 * La tira se mueve en horizontal mientras la página baja. Es la forma de
 * enseñar seis módulos sin apilar seis tarjetas en una columna de dos mil
 * píxeles — y de paso rompe el ritmo vertical de la portada justo donde, si no,
 * empezaría a pesar.
 *
 * El recorrido se calcula con la cuenta de piezas, no con un porcentaje a ojo,
 * para que la última llegue siempre al borde sin dejar hueco ni pasarse.
 */
export function Carrusel({
  piezas,
  ancho = 380,
  hueco = 20,
}: {
  piezas: React.ReactNode[];
  ancho?: number;
  hueco?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const total = piezas.length * (ancho + hueco) - hueco;
  const x = useTransform(scrollYProgress, [0, 1], ["0px", `calc(-${total}px + 100vw - 4rem)`]);

  return (
    <div ref={ref} style={{ height: `${piezas.length * 38}vh` }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <motion.div style={{ x, gap: hueco }} className="flex px-4 md:px-8">
          {piezas.map((p, i) => (
            <div key={i} style={{ width: ancho }} className="shrink-0">{p}</div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
