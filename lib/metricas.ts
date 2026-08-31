"use client";

import { useCallback, useEffect, useState } from "react";
import type { Edificio } from "./data";
import { money, moneyC, num, pct, m2 } from "./format";

/**
 * Las métricas que puede llevar una ficha de la cartera.
 *
 * La ficha enseñaba tres cifras fijas —ingresos, utilidad y unidades— elegidas
 * por nosotros. Y quien mira una cartera no siempre mira lo mismo: el comité
 * pregunta por VAN y TIR, el operador por exposición y absorción, el comercial
 * por precio por m² y unidades. Con tres fijas, dos de esos tres perfiles
 * tenían que abrir dieciocho fichas de detalle.
 *
 * El margen no está en esta lista y no es un olvido: va siempre, en el anillo,
 * porque es la pregunta que la tarjeta contesta antes que ninguna otra. Lo que
 * se elige son las de apoyo.
 *
 * Doce disponibles y hasta seis a la vez. El techo no es arbitrario: la rejilla
 * de la ficha es de tres columnas y dos filas caben sin que la tarjeta crezca
 * más que el anillo que lleva al lado.
 */

export type ClaveMetrica =
  | "ventas" | "costo" | "utilidad" | "roi" | "tir" | "van"
  | "exposicion" | "unidades" | "gba" | "gla" | "precioM2" | "eficiencia";

export type Metrica = {
  k: ClaveMetrica;
  t: string;
  /** Rótulo corto para la ficha, donde la columna mide 90 px. */
  corto: string;
  fmt: (e: Edificio) => string;
  /** Qué contesta, para el selector. */
  d: string;
};

export const METRICAS: Metrica[] = [
  { k: "ventas",     t: "Ingresos",        corto: "Ingresos",  d: "Valor bruto de venta de la promoción.",
    fmt: e => moneyC(e.ventas) },
  { k: "costo",      t: "Costo",           corto: "Costo",     d: "Suelo, obra, blandos y financiación.",
    fmt: e => moneyC(e.costo) },
  { k: "utilidad",   t: "Utilidad",        corto: "Utilidad",  d: "Ingresos menos costo total.",
    fmt: e => moneyC(e.utilidad) },
  { k: "roi",        t: "ROI",             corto: "ROI",       d: "Utilidad sobre el capital puesto.",
    fmt: e => pct(e.roi) },
  { k: "tir",        t: "TIR",             corto: "TIR",       d: "El retorno repartido en el tiempo.",
    fmt: e => (e.tir === null ? "n/d" : pct(e.tir)) },
  { k: "van",        t: "VAN al 12 %",     corto: "VAN",       d: "Valor actual neto descontado al 12 %.",
    fmt: e => moneyC(e.van) },
  { k: "exposicion", t: "Exposición",      corto: "Exposición", d: "Pico de caja negativa que hay que financiar.",
    fmt: e => moneyC(e.exposicion) },
  { k: "unidades",   t: "Unidades",        corto: "Unidades",  d: "Cuántas viviendas o locales salen.",
    fmt: e => num(e.unidades) },
  { k: "gba",        t: "m² construcción", corto: "m² constr.", d: "Superficie construida sobre rasante.",
    fmt: e => m2(e.gba) },
  { k: "gla",        t: "m² vendibles",    corto: "m² vend.",  d: "La parte de la construcción que se vende.",
    fmt: e => m2(e.gla) },
  { k: "precioM2",   t: "Precio / m²",     corto: "Precio/m²", d: "Ingresos entre superficie vendible.",
    fmt: e => money(e.ventas / e.gla) },
  { k: "eficiencia", t: "Eficiencia",      corto: "Eficiencia", d: "Vendible sobre construido: cuánto no se pierde.",
    fmt: e => pct(e.gla / e.gba) },
];

export const POR_DEFECTO: ClaveMetrica[] = ["ventas", "utilidad", "unidades"];
export const MAXIMO = 6;
const CLAVE = "pf-metricas";

export function metricaDe(k: ClaveMetrica) {
  return METRICAS.find(m => m.k === k);
}

/**
 * La elección, guardada en el navegador.
 *
 * Se lee en `useEffect` y no en el primer renderizado: el servidor no tiene
 * `localStorage`, y pintar directamente la lista guardada daría desajuste de
 * hidratación. Hasta que monte se enseñan las tres de siempre, que es lo que
 * el servidor también pintó.
 */
export function useMetricas() {
  const [claves, setClaves] = useState<ClaveMetrica[]>(POR_DEFECTO);

  useEffect(() => {
    try {
      const crudo = localStorage.getItem(CLAVE);
      if (!crudo) return;
      const lista = (JSON.parse(crudo) as ClaveMetrica[])
        .filter(k => METRICAS.some(m => m.k === k))
        .slice(0, MAXIMO);
      if (lista.length) setClaves(lista);
    } catch {}
  }, []);

  const alternar = useCallback((k: ClaveMetrica) => {
    setClaves(prev => {
      const dentro = prev.includes(k);
      /* Nunca por debajo de una: una ficha sin ninguna cifra de apoyo se queda
         con el nombre y el anillo, y deja de servir para comparar. */
      if (dentro && prev.length === 1) return prev;
      const sig = dentro
        ? prev.filter(x => x !== k)
        : prev.length >= MAXIMO ? prev : [...prev, k];
      try { localStorage.setItem(CLAVE, JSON.stringify(sig)); } catch {}
      return sig;
    });
  }, []);

  const restablecer = useCallback(() => {
    setClaves(POR_DEFECTO);
    try { localStorage.setItem(CLAVE, JSON.stringify(POR_DEFECTO)); } catch {}
  }, []);

  return { claves, alternar, restablecer };
}
