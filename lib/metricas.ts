"use client";

import { useCallback, useEffect, useState } from "react";
import type { Edificio } from "./data";
import { money, moneyC, num, pct, m2 } from "./format";
import { calcularFactibilidad, metricasComercial } from "./motor/calculations.js";
import { datosOriginales, tipoMotor } from "./estudioLocal";

/**
 * El resultado del motor por promoción, calculado una vez y recordado.
 *
 * Las métricas nuevas de la tarjeta —precio neto, costo por m² vendible, la
 * hipótesis comercial— no viven en la cabecera del dato: salen del estudio,
 * calculado con el motor real. Un `WeakMap` sobre la promoción evita repetir
 * la corrida en cada tarjeta de la cartera.
 */
type ResMotor = Record<string, number>;
const cacheResultado = new WeakMap<Edificio, ResMotor>();
const cacheComercial = new WeakMap<Edificio, ResMotor>();

function resultadoDe(e: Edificio): ResMotor {
  const visto = cacheResultado.get(e);
  if (visto) return visto;
  const datos = datosOriginales(e);
  const r = (datos ? calcularFactibilidad(datos, tipoMotor(e)) : {}) as ResMotor;
  cacheResultado.set(e, r);
  return r;
}

function comercialDe(e: Edificio): ResMotor {
  const visto = cacheComercial.get(e);
  if (visto) return visto;
  const datos = datosOriginales(e);
  const c = (datos
    ? metricasComercial(resultadoDe(e), datos, tipoMotor(e))
    : {}) as ResMotor;
  cacheComercial.set(e, c);
  return c;
}

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
  | "exposicion" | "unidades" | "gba" | "gla" | "precioM2" | "eficiencia"
  | "precioNetoM2" | "ctVendible" | "vendido" | "porVender" | "pctVendido"
  | "m2Vendidos" | "unidadesVendidas" | "unidadesPorVender" | "ritmoActual" | "absorcion";

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
  /* --- Del estudio: precios finos e hipótesis comercial. Salen del motor,
         vía `comercialDe`, no de la cabecera. --- */
  { k: "precioNetoM2", t: "Precio neto / m²", corto: "Neto/m²", d: "Precio de lista menos el descuento comercial.",
    fmt: e => money(resultadoDe(e).precioNetoM2 ?? 0) },
  { k: "ctVendible", t: "Costo / m² vendible", corto: "Costo/m²", d: "Costo total entre los metros que se venden.",
    fmt: e => money(resultadoDe(e).ctVendible ?? 0) },
  { k: "vendido",    t: "Vendido",         corto: "Vendido",   d: "Monto ya comprometido en la hipótesis comercial.",
    fmt: e => moneyC(comercialDe(e).totalVendido ?? 0) },
  { k: "porVender",  t: "Por vender",      corto: "Por vender", d: "Lo que falta por colocar a precio de hoy.",
    fmt: e => moneyC(comercialDe(e).totalPorVender ?? 0) },
  { k: "pctVendido", t: "% vendido",       corto: "% vendido", d: "Metros vendidos sobre los metros de venta.",
    fmt: e => pct(comercialDe(e).pctVendido ?? 0) },
  { k: "m2Vendidos", t: "m² vendidos",     corto: "m² vend.",  d: "Superficie ya comprometida.",
    fmt: e => m2(comercialDe(e).m2Vendidos ?? 0) },
  { k: "unidadesVendidas", t: "Unidades vendidas", corto: "Uds. vend.", d: "Cuántas ya tienen comprador.",
    fmt: e => num(comercialDe(e).unidadesVendidas ?? 0) },
  { k: "unidadesPorVender", t: "Unidades por vender", corto: "Uds. rest.", d: "Las que faltan por colocar.",
    fmt: e => num(comercialDe(e).unidadesPorVender ?? 0) },
  { k: "ritmoActual", t: "Ritmo actual",   corto: "Ritmo",     d: "Unidades al mes desde el inicio de preventa.",
    fmt: e => (comercialDe(e).ritmoActual ?? 0).toFixed(1) + " un/mes" },
  { k: "absorcion",  t: "Absorción",       corto: "Absorción", d: "Años hasta agotar el inventario al ritmo objetivo.",
    fmt: e => ((comercialDe(e).absorcion ?? 0) || 0).toFixed(1) + " años" },
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
