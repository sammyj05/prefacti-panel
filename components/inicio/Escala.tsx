"use client";

import { EDIFICIOS, TOTALES } from "@/lib/data";
import { moneyC, num, pct } from "@/lib/format";
import { Revelar, Cifra } from "@/components/anim/Revelar";

/**
 * Las cuatro cifras de la cartera de ejemplo, contándose al entrar.
 *
 * Es cliente entero y no sólo las cifras: el formateador de cada una es una
 * función, y una función no cruza la frontera de servidor a cliente. Antes que
 * inventar un catálogo de formatos con nombre para poder pasar una cadena, la
 * lista vive del lado en que se usa.
 */

const CIFRAS = [
  ["Proyectos", EDIFICIOS.length, (n: number) => num(n)],
  ["m² construidos", TOTALES.gba, (n: number) => num(n)],
  ["Ingresos modelados", TOTALES.ventas, (n: number) => moneyC(n)],
  ["Margen de cartera", TOTALES.margen, (n: number) => pct(n)],
] as const;

export function Escala() {
  return (
    <div className="grid grid-cols-2 gap-x-10 gap-y-10 lg:grid-cols-4">
      {CIFRAS.map(([k, v, f], i) => (
        <Revelar key={k} retraso={i * 0.07}>
          <div className="nota">{k}</div>
          <Cifra
            a={v}
            formato={f}
            retraso={i * 0.07}
            className="cifra mt-3 block text-[clamp(2.2rem,3.8vw,3.4rem)] leading-none text-tinta-950"
          />
        </Revelar>
      ))}
    </div>
  );
}
