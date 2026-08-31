"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ArrowDown } from "lucide-react";
import { Iman, SUAVE } from "@/components/anim/Revelar";
import { TiraCartera } from "@/components/inicio/TiraCartera";

/**
 * Intro.
 *
 * La primera pantalla no tiene contenido, y es la decisión: se deja entera para
 * la trama de píxeles, que la pone `FondoMatriz` por detrás de la página. Lo
 * único que vive aquí son los dos rótulos del canto —que se relevan conforme la
 * palabra se derrumba en la manzana— y la señal de bajar.
 *
 * Antes esta sección montaba su propia trama y la apagaba al terminar. Eso la
 * convertía en un cartel: bonito, y desconectado de las siete pantallas que
 * venían detrás. Ahora es el arranque de una sola animación que llega al pie.
 */
export function Hero() {
  const tramo = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: tramo,
    offset: ["start start", "end start"],
  });

  const señal = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const rotuloPalabra = useTransform(scrollYProgress, [0.3, 0.6], [1, 0]);
  const rotulo = useTransform(scrollYProgress, [0.5, 0.8], [0, 1]);

  return (
    <>
      {/* La trama la pone `FondoMatriz` por detrás de la página entera; aquí
          sólo queda el hueco que la deja verse sola, y los dos rótulos del
          canto que dicen qué está dibujando. */}
      <section ref={tramo} className="relative h-screen">
        <motion.span
          aria-hidden
          style={{ opacity: rotuloPalabra }}
          className="pointer-events-none absolute right-4 top-1/2 hidden origin-right -rotate-90
                     rounded-full bg-hueso/85 px-3 py-1 text-[10.5px] font-medio uppercase
                     tracking-[0.62em] text-tinta-900 backdrop-blur-sm md:block"
        >
          Factibilidad inmobiliaria · Panamá
        </motion.span>
        <motion.span
          aria-hidden
          style={{ opacity: rotulo }}
          className="pointer-events-none absolute right-4 top-1/2 hidden origin-right -rotate-90
                     rounded-full bg-hueso/85 px-3 py-1 text-[10.5px] font-medio uppercase
                     tracking-[0.62em] text-minio-600 backdrop-blur-sm md:block"
        >
          18 promociones · 1.997 unidades
        </motion.span>

        <motion.div
          aria-hidden
          style={{ opacity: señal }}
          className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            /* Pastilla de papel bajo la señal: es lo único que va suelto sobre
               la trama a plena intensidad, y sin fondo se perdía entre las
               celdas de la palabra. */
            className="flex flex-col items-center gap-2 rounded-full bg-hueso/85 px-4 py-2.5
                       text-[10.5px] uppercase tracking-[0.28em] text-tinta-900 backdrop-blur-sm"
          >
            <span>Desplaza y míralo construirse</span>
            <motion.span
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </motion.span>
          </motion.div>
        </motion.div>
      </section>

      {/* ------------------------------------------------------- el titular */}
      <section className="relative flex min-h-screen items-center">
        {/* Sobre lámina, como el resto del contenido. Era la única sección con
            texto que iba suelta encima de la trama, y con el mosaico a plena
            intensidad el párrafo se leía a medias — en oscuro, donde la trama
            es salmón sobre casi negro, directamente no se leía. */}
        <div className="mx-auto w-full max-w-[1320px] px-4 md:px-8">
          <div className="lamina rounded-hueco px-7 py-16 md:px-14 md:py-20">
          <h1 className="font-display text-[clamp(3rem,9vw,8rem)] leading-[0.92] text-tinta-950">
            <Linea>El número</Linea>
            <Linea retraso={0.1}>antes del ladrillo.</Linea>
          </h1>

          {/* El hueco que quedaba entre el titular y el filete: dieciocho
              columnas de píxeles, una por promoción, con la altura de su margen
              y el umbral del comité a trazos. Se levanta al entrar. */}
          <TiraCartera />

          <div className="mt-14 grid gap-10 border-t border-trazo-fino pt-10 md:grid-cols-[1fr_auto]
                          md:items-end">
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.8, delay: 0.15, ease: SUAVE }}
              className="max-w-[34rem] text-[clamp(1.05rem,1.6vw,1.35rem)] leading-[1.5] text-tinta-700"
            >
              Simula escenarios y modela versiones antes de comprometer capital en obra.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.8, delay: 0.28, ease: SUAVE }}
              className="flex flex-wrap items-center gap-2.5"
            >
              <Iman>
                <Link
                  href="/entrar"
                  className="group flex items-center gap-2 rounded-full bg-tinta-950 px-7 py-4
                             text-[15px] font-medio text-hueso transition hover:bg-tinta-900"
                >
                  Crear cuenta
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Iman>
              <Iman>
                <Link href="/proyectos"
                      className="cristal rounded-full px-7 py-4 text-[15px] font-medio text-tinta-950">
                  Ver la demo
                </Link>
              </Iman>
            </motion.div>
          </div>
          </div>
        </div>
      </section>
    </>
  );
}

/** Una línea del titular, saliendo de debajo de su propia caja. */
function Linea({ children, retraso = 0 }: { children: React.ReactNode; retraso?: number }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        initial={{ y: "108%" }}
        whileInView={{ y: "0%" }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 1.1, delay: retraso, ease: SUAVE }}
        className="block"
      >
        {children}
      </motion.span>
    </span>
  );
}
