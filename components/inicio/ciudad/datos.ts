/**
 * El dato horneado de OpenStreetMap y su forma en memoria.
 *
 * Lo produce `scripts/hornear-osm.mjs` y vive en `public/panama.json`. Todo
 * viene ya en metros locales con el origen en la bahía frente a Avenida
 * Balboa: +x al este, +z al sur, que es la mano de three.
 */

/**
 * Un edificio corriente.
 *
 * Lleva la caja envolvente orientada —que sigue sirviendo de reserva cuando
 * el contorno no es utilizable— y, detrás, la huella de verdad: pares x,z
 * relativos al centro, ya simplificada. Es lo que permite extruir una planta
 * en L o en cuña en vez del prisma que la envuelve.
 */
export type Edificio = [
  x: number, z: number, ancho: number, fondo: number,
  giroGrados: number, plantas: number, zona: string,
  huella?: number[] | null,
];

/** Una torre con nombre: además del contorno, si es de las muy altas. */
export type Hito = {
  n: string; p: number;
  x: number; z: number; w: number; d: number; g: number;
  zona: string;
  c?: [number, number][];
};

export type Via = { r: number; p: [number, number][]; n: string };
export type Zona = { id: string; x: number; z: number; r: number };

export type Panama = {
  meta: {
    origen: [number, number];
    recorte: [number, number, number, number];
    horneado: string;
  };
  zonas: Zona[];
  edificios: Edificio[];
  hitos: Hito[];
  vias: Via[];
  costas: [number, number][][];
  lagos: [number, number][][];
  parques: [number, number][][];
};

/**
 * Los hitos que se modelan a mano, por nombre exacto de OSM.
 *
 * El resto de torres —incluidas las de sesenta plantas— se extruyen de su
 * caja, que a la escala del vuelo es indistinguible. Estas seis no: son las
 * que se reconocen por su silueta y no por su altura, así que llevan
 * geometría propia.
 */
export const HITOS_PROPIOS = new Set([
  "F&F Tower",
  "JW Marriott Panama",
  "PH The Point",
  "BICSA",
  "Yoo Panama",
  "Torre Global Bank",
]);

let cache: Promise<Panama> | null = null;

/** Carga el dato una sola vez por sesión. */
export function cargarPanama(): Promise<Panama> {
  cache ??= fetch("/panama.json").then(r => {
    if (!r.ok) throw new Error(`panama.json ${r.status}`);
    return r.json() as Promise<Panama>;
  });
  return cache;
}
