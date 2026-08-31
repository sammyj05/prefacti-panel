"use client";

import { motion } from "framer-motion";
import type { Edificio } from "@/lib/data";
import { estadoDe, ETAPA_NEON, tinte } from "@/lib/data";
import { moneyC } from "@/lib/format";
import { Anillo } from "@/components/Anillo";

/**
 * Widget de proyecto: una sola ficha, tratada como pieza de escaparate.
 *
 * No es la ficha de la rejilla a mayor tamaño. Aquella tiene que sobrevivir
 * repetida dieciocho veces y por eso comprime; ésta aparece una única vez y
 * puede permitirse lo contrario — el anillo a 168 px como foco, las tres
 * cifras en fila con aire, y nada más. Es la promesa de la herramienta, no la
 * herramienta.
 *
 * Flota de verdad: entra desde abajo, se inclina un grado y lleva una segunda
 * tarjeta detrás, desplazada y girada, que es lo que da el espesor de pila
 * sin recurrir a una sombra dura.
 */
export function WidgetProyecto({ e }: { e: Edificio }) {
  const st = estadoDe(e.margen);
  const tono = ETAPA_NEON[e.etapa];

  const CIFRAS = [
    ["Ingresos", moneyC(e.ventas)],
    ["Coste", moneyC(e.costo)],
    ["Utilidad", moneyC(e.utilidad)],
  ] as const;

  return (
    <div className="relative">
      {/* La de detrás: sólo se ve el canto, y es lo que da la pila. */}
      <div aria-hidden
        className="absolute inset-x-6 -bottom-3 top-8 rotate-[1.4deg] rounded-hueco border
                   border-trazo-fino bg-vidrio-hondo" />

      <motion.article
        initial={{ opacity: 0, y: 28, rotate: -1.4 }}
        whileInView={{ opacity: 1, y: 0, rotate: -0.8 }}
        viewport={{ once: true, amount: .4 }}
        transition={{ duration: .9, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ rotate: 0, y: -6 }}
        className="pieza relative p-8 shadow-flota md:p-10"
      >
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <span className="nota">{e.id} · {e.distrito}</span>
            <h3 className="mt-3 font-display text-[clamp(1.9rem,3vw,2.6rem)] leading-[1.05] text-tinta-950">
              {e.nombre}
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="marbete border-trazo-fino bg-vidrio text-tinta-700">{e.tipo}</span>
              <span className="marbete"
                style={{ borderColor: tinte(tono, 33), background: tinte(tono, 12), color: tono }}>
                {e.etapa}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Anillo v={e.margen} color={st.c} tam={168} />
            <span className="nota text-tinta-400">Margen</span>
          </div>
        </div>

        <div className="mt-9 grid grid-cols-3 gap-px overflow-hidden rounded-pieza border
                        border-trazo-fino bg-trazo-fino">
          {CIFRAS.map(([k, v]) => (
            <div key={k} className="bg-vidrio-hondo px-4 py-5">
              <div className="nota">{k}</div>
              <div className="mt-2 text-[clamp(1.05rem,1.6vw,1.4rem)] font-medio italic
                              tabular-nums leading-none text-tinta-950">
                {v}
              </div>
            </div>
          ))}
        </div>
      </motion.article>
    </div>
  );
}
