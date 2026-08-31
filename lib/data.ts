import raw from "./portfolio.json";

/** Una partida del presupuesto de obra: lo que se mide y a qué precio. */
export type Partida = {
  nombre: string; cantidad: number; unidad: string;
  precioUnitario: number; monto: number;
};
/** Un capítulo del presupuesto, con sus partidas. */
export type CapituloObra = {
  nombre: string; tipo: string; monto: number; partidas: Partida[];
};
/** Una unidad del cuadro de áreas, con su estado comercial. */
export type Unidad = {
  nivel: string; codigo: string; tipologia: string;
  m2: number; estado: string; fechaVenta: string | null;
};
export type Tipologia = { id: string; nombre: string; m2: number; precioM2: number };
/** Una actividad del cronograma de caja y su reparto mensual. */
export type ActividadFlujo = { nombre: string; total: number; dist: number[] };
/** Un modelo de vivienda, en las promociones de casas. */
export type Modelo = {
  nombre: string; m2Construccion: number; m2Lote: number;
  precioUnidad: number; viviendas: number;
};
/** Una etapa de obra, en las promociones de casas. */
export type EtapaObra = {
  nombre: string; viviendas: number; costoConstruccion: number;
  costoIndirecto: number; infraestructura: number; terreno: number; interes: number;
};

/**
 * Todo lo que la promoción tiene dentro.
 *
 * Es el mismo dato que maneja la aplicación de Prefacti, aplanado por
 * `scripts/generar-cartera.mjs`: el presupuesto con sus precios unitarios, el
 * cuadro de áreas unidad a unidad, el cronograma de caja mes a mes y —según el
 * tipo— los modelos de vivienda o las etapas de obra.
 */
export type Detalle = {
  params: Record<string, number> | null;
  inputs: Record<string, string | number> | null;
  chequeos: { pais?: string; target?: string } | null;
  presupuesto: CapituloObra[];
  presupuestos: { id: string; nombre: string; modo: string; fases: CapituloObra[] }[];
  areas: {
    tipologias: Tipologia[]; unidades: Unidad[];
    porEstado: Record<string, number>; niveles: number;
  } | null;
  flujo: {
    horizonte: number; actividades: ActividadFlujo[]; porMes: number[];
    params: Record<string, string | number | boolean> | null;
  } | null;
  modelos: Modelo[];
  etapas: EtapaObra[];
  comercial: Record<string, string | number> | null;
  resultado: Record<string, number>;
  retorno: {
    van: number; tirAnual: number | null; tasaDescuento: number;
    paybackSimple: number | null; paybackDescontado: number | null;
    capitalPropioMax: number; mesCapitalPropioMax: number | null;
    multiploCapital: number | null; horizonte: number; acumulado: number[];
  } | null;
};

export type Edificio = {
  id: string; nombre: string; distrito: string; tipo: string; etapa: string;
  floors: number; alturaM: number; gba: number; gla: number; unidades: number;
  ventas: number; costo: number; utilidad: number; margen: number; roi: number;
  tir: number | null; van: number; exposicion: number; color: string;
  /** La misma serie en hex, para lo que no es CSS (three.js, lienzos). */
  colorHex: string;
  massing: { poly: [number, number][]; y0: number; h: number; floors: number }[];
  detalle: Detalle;
};
export type Etapa = { etapa: string; n: number; valor: number };
export type Totales = {
  ventas: number; costo: number; utilidad: number; gba: number; uds: number;
  van: number; exp: number; margen: number; activos: number;
};

/**
 * Identidad de promoción.
 *
 * El JSON trae un color por promoción —seis ranuras validadas contra las tres
 * formas de daltonismo— y ese sistema se retira. Seis matices distintos
 * obligaban a memorizar una leyenda y no decían nada: dos proyectos vecinos en
 * la lista podían salir verde y morado sin que la diferencia significara nada.
 *
 * En su lugar, dieciocho pasos entre la tinta y el cobalto del acento. Cambian
 * a la vez de matiz y de valor, así que se distinguen en pantalla y siguen
 * distinguiéndose impresos en negro — que es lo que las seis ranuras validadas
 * protegían y conviene no perder.
 *
 * El reparto es por posición en la cartera y por tanto estable: un proyecto no
 * cambia de color al filtrar o reordenar. Y va en `var()`, no en hex, para que
 * la serie se recomponga sola al cambiar de tema.
 */
const SERIE = 18;
const tono = (i: number) => {
  const t = (i % SERIE) / (SERIE - 1);          // 0 = tinta, 1 = cobalto
  const mezcla = Math.round(t * 100);
  /* La luminosidad también se mueve, no sólo el matiz: sin eso, la mitad de la
     serie se confunde en una impresión en escala de grises. */
  const luz = Math.round(8 + t * 26);
  return `color-mix(in srgb, ` +
         `color-mix(in srgb, rgb(var(--minio-500)) ${mezcla}%, rgb(var(--tinta-950))) ` +
         `${100 - luz}%, rgb(var(--hueso)))`;
};

/**
 * La misma serie, resuelta a hex.
 *
 * `color` es una función de CSS —`color-mix()`— y eso lo entiende el navegador
 * pero no three.js ni un lienzo: `new THREE.Color("color-mix(...)")` avisa por
 * consola y se queda en blanco, que es lo que le pasaba al zócalo del modelo
 * tridimensional desde que la serie dejó de ser un hex. Así que la serie va por
 * duplicado: en `color` para el DOM, y en `colorHex` para todo lo que pinte
 * fuera de CSS.
 *
 * Interpola en el mismo recorrido —tinta a ladrillo— con los valores del tema
 * claro, que es el único que un motor 3D con luces propias necesita.
 */
const TINTA_HEX: [number, number, number] = [16, 22, 34];
const LADRILLO_HEX: [number, number, number] = [166, 33, 26];

function hexSerie(i: number) {
  const t = (i % SERIE) / (SERIE - 1);
  const canal = (a: number, b: number) => Math.round(a + (b - a) * t);
  const c = [
    canal(TINTA_HEX[0], LADRILLO_HEX[0]),
    canal(TINTA_HEX[1], LADRILLO_HEX[1]),
    canal(TINTA_HEX[2], LADRILLO_HEX[2]),
  ];
  return "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
}

export const EDIFICIOS = (raw.edificios as unknown as Edificio[])
  .map((e, i) => ({ ...e, color: tono(i), colorHex: hexSerie(i) }));
export const ETAPAS = raw.etapas as Etapa[];
export const TOTALES = raw.totales as Totales;
/* `u` son las iniciales del autor; el JSON las trae desde el principio y el
   tipo se las había dejado fuera. */
export const BITACORA = raw.bitacora as
  { ts: string; u: string; n: string; p: string; a: string; d: string }[];

/**
 * Tono por etapa. Es cromo de estado, no identidad de serie.
 *
 * No son valores sino referencias: el color de cada etapa vive en las
 * variables de `globals.css` y cambia con el tema. En claro puede ser más
 * oscuro y saturado —el papel aguanta croma— y en oscuro va subido de luz y
 * bajado de croma, que es lo que hace falta para que un tono no vibre contra
 * el negro. El matiz se conserva en los dos, así que la etapa se sigue
 * reconociendo por color.
 */
/* Los cinco estados son los de la entidad `Proyecto` de Prefacti, no una lista
   inventada. El orden de la rampa es el del ciclo de vida —de lo que aún se
   está estudiando a lo que ya está cerrado— así que el color dice en qué punto
   está la promoción sin tener que leer la leyenda. Los nombres de las
   variables conservan la nomenclatura anterior por no tocar los dos temas. */
export const ETAPA_NEON: Record<string, string> = {
  "En estudio": "var(--etapa-factibilidad)",
  Activo: "var(--etapa-obra)",
  Aprobado: "var(--etapa-permisos)",
  Finalizado: "var(--etapa-preventa)",
  Archivado: "var(--etapa-entregado)",
};

export function estadoDe(margen: number) {
  if (margen >= 0.18) return { t: "Viable", c: "rgb(var(--viable))" };
  if (margen >= 0.12) return { t: "Marginal", c: "rgb(var(--tenso))" };
  if (margen >= 0) return { t: "En riesgo", c: "rgb(var(--riesgo))" };
  return { t: "No viable", c: "rgb(var(--riesgo))" };
}

/**
 * Tinte translúcido de un color de estado.
 *
 * Antes se hacía pegando dos dígitos al hex (`${c}55`), lo que obligaba a que
 * el color fuera literalmente un hex. Ahora es una variable, así que el alfa
 * se aplica con `color-mix`, que funciona igual sobre `var()`, `rgb()` o hex.
 */
export const tinte = (c: string, pct: number) =>
  `color-mix(in srgb, ${c} ${pct}%, transparent)`;
