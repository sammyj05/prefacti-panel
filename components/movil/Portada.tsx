"use client";

import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { EDIFICIOS, TOTALES, ETAPAS, ETAPA_NEON } from "@/lib/data";
import { UMBRALES } from "@/lib/equipo";
import { moneyC, num, pct } from "@/lib/format";

/**
 * Portada de móvil.
 *
 * No es la portada de escritorio adaptada. Aquella tiene ocho pantallas, una
 * trama de 4.608 celdas y tres modelos tridimensionales; en un teléfono eso es
 * medio megabyte de WebGL para llegar a un botón que está a dos dedos.
 *
 * Aquí hay cuatro bloques y se acabó: qué es, la prueba, qué trae y entrar. La
 * prueba son las cifras reales de la cartera de ejemplo, porque en una pantalla
 * de 390 px una cifra grande convence más que un párrafo — y porque son las
 * mismas que se ven al entrar, así que la portada no promete nada que la
 * aplicación no enseñe treinta segundos después.
 *
 * El único movimiento es la entrada de cada bloque al aparecer. En un teléfono,
 * la animación que se pelea con el desplazamiento del dedo se siente como que
 * la página va lenta, no como que está viva.
 */

const MODULOS = [
  ["Simulador", "Mueve precio o coste y mira el margen."],
  ["Comparador", "Dos versiones del proyecto, lado a lado."],
  ["Hitos", "Permisos, obra y preventa sobre una línea."],
  ["Alertas", "Margen bajo umbral, antes de firmar."],
];

function Bloque({ children, retraso = 0 }: { children: React.ReactNode; retraso?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay: retraso, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function PortadaMovil({ onEntrar }: { onEntrar: () => void }) {
  const bajoUmbral = EDIFICIOS.filter(e => e.margen < UMBRALES.margen).length;

  return (
    <div className="min-h-full bg-hueso">
      {/* -------------------------------------------------------------- 1 */}
      <section
        className="px-6 pb-10"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 72px)" }}
      >
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .5 }}
          className="nota"
        >
          Factibilidad inmobiliaria · Panamá
        </motion.p>

        <h1 className="mt-5 font-display text-[42px] leading-[0.98] text-tinta-950">
          <Linea>El número</Linea>
          <Linea retraso={0.09}>antes del ladrillo.</Linea>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .6, delay: .45, ease: [0.16, 1, 0.3, 1] }}
          className="mt-5 text-[16px] leading-[1.5] text-tinta-700"
        >
          Simula escenarios y modela versiones antes de comprometer capital en obra.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .6, delay: .58, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7 flex flex-col gap-2.5"
        >
          {/* Botones a todo el ancho y de 52 px: en el pulgar, dos botones
              juntos en fila se fallan uno de cada cinco veces. */}
          <button
            onClick={onEntrar}
            className="flex h-[52px] items-center justify-center gap-2 rounded-full bg-tinta-950
                       text-[16px] font-medio text-hueso active:opacity-80"
          >
            Entrar a la demo
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={onEntrar}
            className="flex h-[52px] items-center justify-center rounded-full border
                       border-trazo-medio text-[16px] font-medio text-tinta-950 active:opacity-60"
          >
            Crear cuenta
          </button>
        </motion.div>
      </section>

      {/* -------------------------------------------------------------- 2
          La prueba. Cifras reales de la cartera de ejemplo. */}
      <Bloque>
        <section className="panel-oscuro mx-4 rounded-caja p-6">
          <span className="nota rotulo-claro">Cartera de demostración</span>
          <div className="cifra mt-3 text-[40px] leading-none">{moneyC(TOTALES.ventas)}</div>
          <p className="mt-2 text-[13px] rotulo-claro">
            {num(TOTALES.uds)} unidades en {EDIFICIOS.length} promociones
          </p>

          <div className="mt-5 grid grid-cols-2 gap-4 border-t filete-claro pt-4">
            <div>
              <div className="nota rotulo-claro text-[9px]">Margen</div>
              <div className="cifra mt-1.5 text-[22px] leading-none">{pct(TOTALES.margen)}</div>
            </div>
            <div>
              <div className="nota rotulo-claro text-[9px]">Bajo umbral</div>
              <div className="cifra mt-1.5 text-[22px] leading-none">
                {bajoUmbral} de {EDIFICIOS.length}
              </div>
            </div>
          </div>
        </section>
      </Bloque>

      {/* Las seis etapas, en una barra proporcional. Es lo más cerca que se
          puede estar de enseñar la cartera entera en 390 px. */}
      <Bloque retraso={0.06}>
        <section className="mt-8 px-6">
          <span className="nota">Las {EDIFICIOS.length} promociones</span>
          <div className="mt-3.5 flex h-3 overflow-hidden rounded-full">
            {ETAPAS.map(s => (
              <span key={s.etapa} title={`${s.etapa} · ${s.n}`}
                    style={{ flex: s.n, background: ETAPA_NEON[s.etapa] }} />
            ))}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
            {ETAPAS.map(s => (
              <li key={s.etapa} className="flex items-center gap-2 text-[13px] text-tinta-500">
                <span className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: ETAPA_NEON[s.etapa] }} />
                <span className="truncate">{s.etapa}</span>
                <span className="ml-auto tabular-nums text-tinta-400">{s.n}</span>
              </li>
            ))}
          </ul>
        </section>
      </Bloque>

      {/* -------------------------------------------------------------- 3 */}
      <Bloque retraso={0.06}>
        <section className="mt-10 px-6">
          <h2 className="font-display text-[30px] leading-[1.04] text-tinta-950">
            Una aplicación, no seis hojas de cálculo.
          </h2>
          <ul className="mt-6">
            {MODULOS.map(([t, d], i) => (
              <li key={t} className={`py-4 ${i ? "border-t border-trazo-fino" : ""}`}>
                <p className="text-[16px] font-medio text-tinta-950">{t}</p>
                <p className="mt-1 text-[14px] leading-snug text-tinta-500">{d}</p>
              </li>
            ))}
          </ul>
        </section>
      </Bloque>

      {/* -------------------------------------------------------------- 4 */}
      <Bloque retraso={0.06}>
        <section className="mt-10 px-6 pb-16">
          <div className="lamina rounded-caja p-6">
            <h2 className="font-display text-[26px] leading-[1.08] text-tinta-950">
              Antes de comprometer capital en obra.
            </h2>
            <button
              onClick={onEntrar}
              className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-full
                         bg-minio-600 text-[16px] font-medio text-white active:opacity-80"
            >
              Ver la cartera
              <ArrowUpRight className="h-4 w-4" />
            </button>
            <p className="mt-4 text-center text-[12.5px] text-tinta-400">
              Datos de demostración · Cartera Aravena
            </p>
          </div>
        </section>
      </Bloque>
    </div>
  );
}

function Linea({ children, retraso = 0 }: { children: React.ReactNode; retraso?: number }) {
  return (
    <span className="block overflow-hidden pb-[0.06em]">
      <motion.span
        initial={{ y: "108%" }} animate={{ y: "0%" }}
        transition={{ duration: .85, delay: .2 + retraso, ease: [0.16, 1, 0.3, 1] }}
        className="block"
      >
        {children}
      </motion.span>
    </span>
  );
}
