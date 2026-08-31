"use client";

import { motion } from "framer-motion";

/**
 * Anillo de margen.
 *
 * Escala completa = 45 %: es donde vive el techo de la cartera, así que un
 * proyecto bueno llena casi la vuelta y uno flojo se queda a un cuarto. Con la
 * escala a 100 % todos los proyectos se parecerían —entre 13 % y 39 % apenas
 * hay un cuarto de vuelta de diferencia— y el anillo dejaría de comparar, que
 * es lo único que hace.
 *
 * Sale a componente porque lo usan la ficha de la rejilla y el widget de la
 * portada a tamaños muy distintos; el grosor del trazo va en proporción al
 * radio para que a 78 px y a 168 px se lea igual de sólido.
 */
export function Anillo({
  v,
  color,
  tam = 78,
  cuerpo,
}: {
  v: number;
  color: string;
  tam?: number;
  /** Cuerpo del rótulo central. Por defecto, proporcional al tamaño. */
  cuerpo?: number;
}) {
  const grosor = Math.max(5, Math.round(tam * 0.077));
  const R = (tam - grosor) / 2 - 1;
  const C = 2 * Math.PI * R;
  const parte = Math.max(0, Math.min(1, v / 0.45));
  const centro = tam / 2;

  return (
    <div className="relative shrink-0" style={{ width: tam, height: tam }}>
      <svg viewBox={`0 0 ${tam} ${tam}`} className="h-full w-full -rotate-90">
        <circle cx={centro} cy={centro} r={R} fill="none"
                stroke="var(--trazo-medio)" strokeWidth={grosor} />
        {/* El halo: el mismo trazo desenfocado por debajo. Es lo que hace que
            el arco parezca encendido en vez de dibujado, y en oscuro es lo
            único que evita que un verde apagado se pierda contra el fondo. */}
        <motion.circle
          cx={centro} cy={centro} r={R} fill="none" stroke={color}
          strokeWidth={grosor} strokeLinecap="round" strokeDasharray={C}
          style={{ filter: `blur(${Math.max(3, grosor * .6)}px)`, opacity: .45 }}
          initial={{ strokeDashoffset: C }}
          whileInView={{ strokeDashoffset: C * (1 - parte) }}
          viewport={{ once: true, amount: .6 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.circle
          cx={centro} cy={centro} r={R} fill="none" stroke={color}
          strokeWidth={grosor} strokeLinecap="round" strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          whileInView={{ strokeDashoffset: C * (1 - parte) }}
          viewport={{ once: true, amount: .6 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-rotulo tabular-nums"
              style={{ color, fontSize: cuerpo ?? Math.round(tam * 0.22) }}>
          {(v * 100).toFixed(tam > 120 ? 1 : 0)}%
        </span>
      </div>
    </div>
  );
}
