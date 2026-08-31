"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Las dos preferencias de presentación que hacen algo.
 *
 * Había cuatro —densidad, moneda, decimales y vista de inicio— y las cuatro se
 * guardaban en `localStorage` bajo la clave `pf-cfg` sin que nadie las leyera
 * nunca. Cuatro controles que se pulsan, se marcan y no cambian una sola cosa
 * de la aplicación: es peor que no ofrecerlos, porque quien los usa se queda
 * creyendo que la herramienta le ha hecho caso.
 *
 * Sobreviven dos, y sobreviven porque se pueden cumplir:
 *
 *   densidad  la altura de fila de las tablas y las listas. Es un eje de
 *             presentación como el canto o la letra, y en una herramienta con
 *             tablas largas es de las preferencias que más se agradecen.
 *   inicio    a qué pantalla se entra. Lo usan la entrada y los enlaces de
 *             demostración de la portada.
 *
 * Se caen «moneda» y «decimales». Formatear va por `lib/format`, que son
 * funciones puras usadas en doscientos sitios; hacerlas reactivas exigiría
 * pasarlas por un contexto y reescribir cada llamada, y la cartera está en
 * dólares porque en dólares la exportó el motor. Prometer lo contrario desde un
 * interruptor es exactamente lo que había que quitar.
 */

export const DENSIDADES = [
  { k: "comoda", t: "Cómoda", d: "Filas altas, más aire entre líneas" },
  { k: "compacta", t: "Compacta", d: "Cabe un tercio más de tabla en pantalla" },
] as const;

export const INICIOS = [
  { k: "/proyectos", t: "Proyectos" },
  { k: "/graficos", t: "Gráficos" },
  { k: "/alertas", t: "Alertas" },
] as const;

export type Densidad = (typeof DENSIDADES)[number]["k"];
export type Inicio = (typeof INICIOS)[number]["k"];

type Estado = { densidad: Densidad; inicio: Inicio };

const CLAVE = "pf-preferencias";
/* Constante y compartida: `useSyncExternalStore` compara por identidad, y un
   objeto nuevo en cada llamada le haría creer que el dato cambia siempre. */
const BASE: Estado = { densidad: "comoda", inicio: "/proyectos" };

let estado: Estado = BASE;
let leido = false;
const oyentes = new Set<() => void>();

function leer(): Estado {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return BASE;
    const p = JSON.parse(crudo) as Partial<Estado>;
    return {
      densidad: DENSIDADES.some(d => d.k === p.densidad) ? p.densidad! : BASE.densidad,
      inicio: INICIOS.some(i => i.k === p.inicio) ? p.inicio! : BASE.inicio,
    };
  } catch {
    return BASE;
  }
}

/** La densidad va como atributo del `<html>`, igual que el canto y la letra. */
function aplicar(e: Estado) {
  if (typeof document !== "undefined") document.documentElement.dataset.densidad = e.densidad;
}

function publicar(siguiente: Estado) {
  estado = siguiente;
  aplicar(siguiente);
  try { localStorage.setItem(CLAVE, JSON.stringify(siguiente)); } catch { /* sin persistencia */ }
  oyentes.forEach(f => f());
}

function suscribir(f: () => void) {
  if (!leido) { leido = true; estado = leer(); }
  oyentes.add(f);
  return () => { oyentes.delete(f); };
}

const retrato = () => estado;
const retratoServidor = () => BASE;

export function usePreferencias() {
  const p = useSyncExternalStore(suscribir, retrato, retratoServidor);
  const poner = useCallback(<K extends keyof Estado>(k: K, v: Estado[K]) => {
    publicar({ ...estado, [k]: v });
  }, []);
  return { ...p, poner };
}

/**
 * La vista de inicio, para quien sólo necesita saber a dónde ir.
 *
 * Lee el almacenamiento directamente en lugar de suscribirse: quien la llama lo
 * hace dentro de un manejador de evento —al pulsar «Entrar»— no durante el
 * renderizado, así que no hay desajuste de hidratación que evitar y no hace
 * falta montar un gancho para leer un dato una vez.
 */
export function inicioGuardado(): Inicio {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE) || "{}") as Partial<Estado>;
    return INICIOS.some(i => i.k === p.inicio) ? p.inicio! : BASE.inicio;
  } catch {
    return BASE.inicio;
  }
}
