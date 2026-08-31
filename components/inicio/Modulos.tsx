"use client";

import {
  FlaskConical, GitCompare, CalendarDays, FolderOpen, History, Bell,
} from "lucide-react";
import { Carrusel } from "@/components/anim/Scroll";

/**
 * Los seis módulos de la aplicación real —los mismos que están en
 * prefacti.com—, no una lista de virtudes.
 *
 * Pasan de rejilla a tira horizontal conducida por el desplazamiento. En
 * rejilla eran seis tarjetas iguales apiladas, que es exactamente la parte de
 * la portada que se salta; en tira, mirarlas es el mismo gesto de bajar, y la
 * página cambia de eje justo donde el ritmo vertical empezaba a pesar.
 *
 * Media frase por módulo. Lo que hace falta aquí es reconocer el nombre, no
 * entender el módulo: para eso está el módulo.
 */

const MODULOS = [
  [FlaskConical, "Simulador", "Mueve precio o coste y mira el margen."],
  [GitCompare, "Comparador", "Dos versiones del proyecto, lado a lado."],
  [CalendarDays, "Hitos", "Permisos, obra y preventa sobre una línea."],
  [FolderOpen, "Recursos", "Planos y contratos, colgando de su proyecto."],
  [History, "Bitácora", "Quién cambió qué hipótesis, y cuándo."],
  [Bell, "Alertas", "Margen bajo umbral, avisado antes de firmar."],
] as const;

export function Modulos() {
  return (
    <Carrusel
      ancho={360}
      piezas={MODULOS.map(([Ic, t, d], i) => (
        <div key={t} className="caja-tras">
          <article className="lamina lamina-viva flex h-[300px] flex-col rounded-hueco p-8">
            <span className="nota text-tinta-400">{String(i + 1).padStart(2, "0")}</span>
            <Ic className="mt-6 h-7 w-7 text-tinta-950" strokeWidth={1.4} />
            <h3 className="mt-auto font-display text-[30px] leading-tight text-tinta-950">{t}</h3>
            <p className="mt-2.5 text-[15px] leading-snug text-tinta-500">{d}</p>
          </article>
        </div>
      ))}
    />
  );
}
