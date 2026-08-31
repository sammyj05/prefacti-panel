"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Las empresas de quien usa la aplicación.
 *
 * En Prefacti una cuenta no trabaja sobre una cartera sino sobre varias: cada
 * empresa tiene sus proyectos, sus miembros y sus permisos, y toda consulta va
 * filtrada por la que esté activa.
 *
 * El estado vive en el módulo y no dentro de un componente. El motivo es
 * concreto: el conmutador sale ahora dos veces a la vez —en la banda de
 * escritorio y dentro del cajón del teléfono— y con un `useState` por copia
 * cada una llevaría su propia lista. Cambiar de empresa en una dejaría a la
 * otra enseñando la anterior, que no es un fallo de pintado sino de verdad: las
 * dos dicen ser el mismo dato.
 *
 * `useSyncExternalStore` es lo que corresponde a un dato así. Y su tercer
 * argumento —el retrato del servidor— es lo que evita el desajuste de
 * hidratación sin recurrir a leer en un `useEffect`: en el servidor no hay
 * `localStorage`, así que allí se devuelve la lista de base, que es exactamente
 * lo que el marcado del servidor ya trae.
 *
 * Los campos son los de la entidad `Empresa` de Base44. Sin servidor detrás la
 * creación es local: es la pantalla, no el sistema, y el día que haya API lo
 * único que cambia son `leer`, `guardar` y `crearEmpresa`.
 */

export const INDUSTRIAS = [
  { k: "desarrollo_inmobiliario", t: "Desarrollo inmobiliario" },
  { k: "construccion", t: "Construcción" },
  { k: "inversiones", t: "Inversiones" },
  { k: "correduria", t: "Correduría" },
  { k: "arquitectura", t: "Arquitectura" },
  { k: "otros", t: "Otros" },
] as const;

export type Industria = (typeof INDUSTRIAS)[number]["k"];

export type Empresa = {
  id: string;
  nombre: string;
  industria: Industria;
  ciudad?: string;
  descripcion?: string;
  emailContacto?: string;
  /** Quién puede editar. La demostración entra siempre como propietario. */
  rol: "propietario" | "editor" | "lector";
};

/* Las que trae la cuenta de demostración: la del producto y la del usuario. */
export const EMPRESAS_BASE: Empresa[] = [
  {
    id: "emp_prefacti", nombre: "Prefacti Development",
    industria: "desarrollo_inmobiliario", ciudad: "Ciudad de Panamá",
    descripcion: "Cartera de demostración del producto.", rol: "propietario",
  },
  {
    id: "emp_aravena", nombre: "Cartera Aravena",
    industria: "desarrollo_inmobiliario", ciudad: "Ciudad de Panamá",
    rol: "propietario",
  },
];

const CLAVE_LISTA = "pf-empresas";
const CLAVE_ACTIVA = "pf-empresa-activa";

type Estado = { lista: Empresa[]; activaId: string };

/* El retrato del servidor. Es constante a propósito: `useSyncExternalStore`
   compara por identidad, y devolver un objeto nuevo en cada llamada haría que
   React se creyera que el dato cambia en cada renderizado. */
const BASE: Estado = { lista: EMPRESAS_BASE, activaId: EMPRESAS_BASE[EMPRESAS_BASE.length - 1].id };

let estado: Estado = BASE;
let leido = false;
const oyentes = new Set<() => void>();

function leer(): Estado {
  try {
    const crudo = localStorage.getItem(CLAVE_LISTA);
    const guardada = crudo ? (JSON.parse(crudo) as Empresa[]) : null;
    const lista = Array.isArray(guardada) && guardada.length ? guardada : EMPRESAS_BASE;
    const activa = localStorage.getItem(CLAVE_ACTIVA);
    return {
      lista,
      activaId: lista.some(e => e.id === activa) ? activa! : lista[lista.length - 1].id,
    };
  } catch {
    /* Almacenamiento no disponible —modo privado de algunos navegadores— y ahí
       es mejor la lista de base que una pantalla rota. */
    return BASE;
  }
}

function publicar(siguiente: Estado) {
  estado = siguiente;
  oyentes.forEach(f => f());
}

function suscribir(f: () => void) {
  /* La primera suscripción es la que trae lo guardado. Ocurre después de
     hidratar —React llama a `subscribe` en un efecto— así que el primer pintado
     coincide con el del servidor y no hay desajuste. */
  if (!leido) { leido = true; estado = leer(); }
  oyentes.add(f);
  return () => { oyentes.delete(f); };
}

const retrato = () => estado;
const retratoServidor = () => BASE;

/** Identificador estable sin depender de la hora: cuenta lo que ya hay. */
function nuevoId(lista: Empresa[]) {
  let n = lista.length + 1;
  while (lista.some(e => e.id === `emp_${n}`)) n++;
  return `emp_${n}`;
}

export function useEmpresas() {
  const { lista, activaId } = useSyncExternalStore(suscribir, retrato, retratoServidor);

  const elegir = useCallback((id: string) => {
    publicar({ ...estado, activaId: id });
    try { localStorage.setItem(CLAVE_ACTIVA, id); } catch { /* sin persistencia */ }
  }, []);

  const crear = useCallback((datos: Omit<Empresa, "id" | "rol">) => {
    const creada: Empresa = { ...datos, id: nuevoId(estado.lista), rol: "propietario" };
    const siguiente = [...estado.lista, creada];
    publicar({ lista: siguiente, activaId: creada.id });
    try {
      localStorage.setItem(CLAVE_LISTA, JSON.stringify(siguiente));
      localStorage.setItem(CLAVE_ACTIVA, creada.id);
    } catch { /* sin persistencia */ }
    return creada;
  }, []);

  const activa = lista.find(e => e.id === activaId) ?? lista[0];

  return { lista, activa, activaId, elegir, crear };
}

/** El nombre legible de una industria, para las fichas y los subtítulos. */
export function nombreIndustria(k: Industria) {
  return INDUSTRIAS.find(i => i.k === k)?.t ?? "Otros";
}
