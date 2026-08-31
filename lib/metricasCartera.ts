"use client";

import { useCallback, useEffect, useState } from "react";
import { EDIFICIOS, TOTALES } from "./data";
import { money, moneyC, num, pct, m2 } from "./format";

/**
 * Las cifras del panel de cartera.
 *
 * El panel enseñaba cuatro fijas —ingresos, costo, utilidad y margen— y son las
 * cuatro correctas para el primer vistazo. No son las correctas para todo el
 * mundo: quien lleva la financiación abre este panel a mirar exposición, y
 * quien negocia suelo mira el coste por m² de construcción. Con cuatro fijas,
 * los dos tenían que bajar a Gráficos.
 *
 * Doce disponibles y hasta cuatro a la vez. La primera elegida manda: va en el
 * cuerpo grande del panel y las otras tres debajo, a la mitad. Ese reparto es
 * lo que hace que el bloque tenga una sola respuesta y tres apoyos, en vez de
 * cuatro cifras del mismo peso que no dicen cuál importa.
 */

export type ClaveCartera =
  | "ventas" | "costo" | "utilidad" | "margen" | "van" | "exposicion"
  | "unidades" | "gba" | "gla" | "precioGla" | "costoGla" | "costoGba";

export type MetricaCartera = {
  k: ClaveCartera;
  t: string;
  /** Renglón de contexto, debajo de la cifra. */
  pie: string;
  v: string;
  /** Verde si va bien, rojo si va mal, neutro si sólo es una magnitud. */
  tono?: "bien" | "mal";
};

const UMBRAL_MARGEN = 0.15;

/** Los totales que hacen falta para las doce cifras, vengan de donde vengan. */
export type TotalesCartera = {
  ventas: number; costo: number; utilidad: number; margen: number;
  van: number; exp: number; uds: number; gba: number; gla: number;
  promociones: number;
};

/** Los de la cartera de demostración, que salen de `lib/data`. */
export function totalesDeLaDemo(): TotalesCartera {
  return {
    ventas: TOTALES.ventas, costo: TOTALES.costo, utilidad: TOTALES.utilidad,
    margen: TOTALES.margen, van: TOTALES.van, exp: TOTALES.exp,
    uds: TOTALES.uds, gba: TOTALES.gba,
    gla: EDIFICIOS.reduce((s, e) => s + e.gla, 0),
    promociones: EDIFICIOS.length,
  };
}

/**
 * Las doce cifras de cartera, calculadas sobre unos totales.
 *
 * Estaban escritas contra la cartera de demostración, así que la cartera de la
 * base no podía ofrecer las mismas y se quedó con cuatro fijas. Con los totales
 * por parámetro hay una sola definición de qué es «precio por m² vendible» y
 * las dos pantallas eligen entre lo mismo.
 *
 * Divisiones protegidas: una empresa recién abierta tiene todo en cero, y
 * `0/0` pinta «NaN %» donde debería haber una raya.
 */
export function metricasDeTotales(T: TotalesCartera): MetricaCartera[] {
  const seguro = (n: number, d: number, f: (x: number) => string) =>
    d > 0 ? f(n / d) : "—";
  const gla = T.gla;
  return [
    { k: "ventas", t: "Ingresos totales", v: moneyC(T.ventas),
      pie: `${num(T.uds)} unidades en ${T.promociones} promociones` },
    { k: "costo", t: "Costo total", v: moneyC(T.costo),
      pie: `${seguro(T.costo, T.ventas, x => pct(x, 0))} de los ingresos` },
    { k: "utilidad", t: "Utilidad total", v: moneyC(T.utilidad), tono: "bien",
      pie: `VAN agregado ${moneyC(T.van)}` },
    { k: "margen", t: "Margen promedio", v: pct(T.margen),
      tono: T.margen >= UMBRAL_MARGEN ? "bien" : "mal",
      pie: `${((T.margen - UMBRAL_MARGEN) * 100).toFixed(1)} pp sobre el umbral del comité` },
    { k: "van", t: "VAN agregado", v: moneyC(T.van),
      pie: "Descontado al 12 % anual" },
    { k: "exposicion", t: "Exposición máxima", v: moneyC(T.exp),
      pie: `${seguro(T.exp, T.costo, x => pct(x, 0))} del costo total` },
    { k: "unidades", t: "Unidades", v: num(T.uds),
      pie: `${T.promociones ? num(Math.round(T.uds / T.promociones)) : "—"} de media por promoción` },
    { k: "gba", t: "m² construcción", v: m2(T.gba),
      pie: `${seguro(gla, T.gba, x => pct(x, 0))} de eficiencia` },
    { k: "gla", t: "m² vendibles", v: m2(gla),
      pie: `${T.uds ? num(Math.round(gla / T.uds)) : "—"} m² por unidad` },
    { k: "precioGla", t: "Precio m² vendible", v: seguro(T.ventas, gla, money),
      pie: "Promedio ponderado de la cartera" },
    { k: "costoGla", t: "Costo m² vendible", v: seguro(T.costo, gla, money),
      pie: `${T.ventas > 0 ? pct(1 - T.costo / T.ventas, 0) : "—"} de margen por metro` },
    { k: "costoGba", t: "Costo m² construcción", v: seguro(T.costo, T.gba, money),
      pie: "Todo incluido: suelo, obra, blandos y financiación" },
  ];
}


/** La de siempre: las doce sobre la cartera de demostración. */
export function metricasCartera(): MetricaCartera[] {
  return metricasDeTotales(totalesDeLaDemo());
}

export const CARTERA_POR_DEFECTO: ClaveCartera[] = ["ventas", "costo", "utilidad", "margen"];
export const CARTERA_MAXIMO = 4;
const CLAVE = "pf-metricas-cartera";

/** La elección, guardada en el navegador. Misma cautela de hidratación. */
/**
 * Las cifras elegidas para el consolidado.
 *
 * Acepta unos totales para que la cartera de la base ofrezca exactamente las
 * mismas doce que la de demostración. Sin argumento, los de la demostración.
 */
export function useMetricasCartera(totales?: TotalesCartera) {
  const [claves, setClaves] = useState<ClaveCartera[]>(CARTERA_POR_DEFECTO);
  const todas = totales ? metricasDeTotales(totales) : metricasCartera();

  useEffect(() => {
    try {
      const crudo = localStorage.getItem(CLAVE);
      if (!crudo) return;
      const lista = (JSON.parse(crudo) as ClaveCartera[])
        .filter(k => todas.some(m => m.k === k))
        .slice(0, CARTERA_MAXIMO);
      if (lista.length) setClaves(lista);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alternar = useCallback((k: ClaveCartera) => {
    setClaves(prev => {
      const dentro = prev.includes(k);
      /* Nunca por debajo de una: el panel sin cifra grande es una caja oscura. */
      if (dentro && prev.length === 1) return prev;
      const sig = dentro
        ? prev.filter(x => x !== k)
        : prev.length >= CARTERA_MAXIMO ? prev : [...prev, k];
      try { localStorage.setItem(CLAVE, JSON.stringify(sig)); } catch {}
      return sig;
    });
  }, []);

  const restablecer = useCallback(() => {
    setClaves(CARTERA_POR_DEFECTO);
    try { localStorage.setItem(CLAVE, JSON.stringify(CARTERA_POR_DEFECTO)); } catch {}
  }, []);

  /* En el orden en que se eligieron: la primera es la que manda. */
  const elegidas = claves
    .map(k => todas.find(m => m.k === k))
    .filter(Boolean) as MetricaCartera[];

  return { claves, elegidas, todas, alternar, restablecer };
}
