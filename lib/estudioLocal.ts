"use client";

import type { Edificio } from "./data";

/**
 * El estudio en el navegador.
 *
 * Las herramientas de la ficha —Master, presupuesto, flujo de caja, simulador—
 * trabajan sobre el `datos` crudo del producto, el mismo árbol que guarda la
 * versión en la base. En modo demostración no hay dónde escribirlo, así que el
 * borrador vive aquí: por promoción, en `localStorage`, siempre distinguible
 * del original para poder volver a él con un gesto.
 *
 * El borrador es un objeto opaco a propósito: el motor es quien conoce su
 * forma, y tiparlo aquí sería inventar un contrato que se mantiene en el
 * producto (ver `lib/motor/LEEME.md`).
 */

export type DatosEstudio = Record<string, unknown>;

/** El tipo del motor a partir del rótulo de la cartera. */
export const tipoMotor = (e: Edificio): "torre" | "casas" =>
  e.tipo === "Casas" ? "casas" : "torre";

/** El estudio crudo de la promoción, o null si el dato no lo trae. */
export function datosOriginales(e: Edificio): DatosEstudio | null {
  const d = e.detalle?.datos;
  if (!d || typeof d !== "object") return null;
  return d as DatosEstudio;
}

const CLAVE = (id: string) => `prefacti:estudio:${id}`;

export function leerBorrador(id: string): DatosEstudio | null {
  try {
    const crudo = localStorage.getItem(CLAVE(id));
    if (!crudo) return null;
    const v = JSON.parse(crudo);
    return v && typeof v === "object" ? (v as DatosEstudio) : null;
  } catch {
    return null;
  }
}

export function guardarBorrador(id: string, datos: DatosEstudio) {
  try {
    localStorage.setItem(CLAVE(id), JSON.stringify(datos));
  } catch {
    /* Sin almacenamiento (modo privado, cuota): el borrador vive en memoria
       mientras dure la pestaña, que es mejor que romper la edición. */
  }
}

export function borrarBorrador(id: string) {
  try {
    localStorage.removeItem(CLAVE(id));
  } catch { /* nada que borrar */ }
}

export function hayBorrador(id: string): boolean {
  try {
    return localStorage.getItem(CLAVE(id)) !== null;
  } catch {
    return false;
  }
}

/* --------------------------------------------------------- listas anexas
   Escenarios del simulador y del flujo: hasta cinco por promoción, guardando
   SIEMPRE parámetros y nunca resultados — si mañana cambia el estudio, el
   escenario se recalcula con los datos nuevos. Congelar cifras fabricaría una
   foto que envejece sin avisar. */

export function leerLista<T>(clave: string): T[] {
  try {
    const v = JSON.parse(localStorage.getItem(clave) ?? "[]");
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

export function guardarLista<T>(clave: string, lista: T[]) {
  try {
    localStorage.setItem(clave, JSON.stringify(lista));
  } catch { /* igual que el borrador: mejor en memoria que roto */ }
}
