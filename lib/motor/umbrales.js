// Puntos de quiebre: hasta dónde puede moverse una variable antes de que el
// proyecto deje de cumplir su margen objetivo.
//
// Método: búsqueda binaria sobre calcularFactibilidad, máximo 30 iteraciones,
// tolerancia de 0,0001 en margen (una centésima de punto). Si el objetivo no
// se alcanza dentro del rango explorado, se devuelve `converge: false` y la
// pantalla lo dice con palabras: un número inventado aquí es peor que un "—".
import { calcularFactibilidad } from "./calculations.js";
import { aplicarOverrides } from "./simuladorVariables.js";

export const MARGEN_OBJETIVO_DEFAULT = 0.20;
const MAX_ITER = 30;
export const TOLERANCIA = 0.0001;

export function leerMargenObjetivo(datos) {
  const v = datos?.params?.margenObjetivo;
  return typeof v === 'number' && isFinite(v) ? v : MARGEN_OBJETIVO_DEFAULT;
}

const margenCon = (datos, tipo, pct, variable) =>
  calcularFactibilidad(aplicarOverrides(datos, tipo, { [variable]: pct }), tipo)?.margen ?? 0;

/**
 * Busca el ajuste porcentual de `variable` que deja el margen en `objetivo`.
 * @returns {{converge:boolean, pct:number|null, margen:number|null, iteraciones:number, rango:[number,number]}}
 */
export function buscarAjuste(datos, tipo, variable, objetivo, rango = [-60, 200]) {
  if (!datos || !tipo) return { converge: false, pct: null, margen: null, iteraciones: 0, rango };
  let lo = rango[0];
  let hi = rango[1];
  const fLo = margenCon(datos, tipo, lo, variable) - objetivo;
  const fHi = margenCon(datos, tipo, hi, variable) - objetivo;
  // Sin cambio de signo en el rango explorado, el objetivo no se alcanza
  // moviendo solo esta variable.
  if (fLo * fHi > 0) return { converge: false, pct: null, margen: null, iteraciones: 0, rango };

  let mid = lo;
  let fMid = fLo;
  let signoLo = fLo;
  let k = 0;
  for (; k < MAX_ITER; k += 1) {
    mid = (lo + hi) / 2;
    fMid = margenCon(datos, tipo, mid, variable) - objetivo;
    if (Math.abs(fMid) < TOLERANCIA) break;
    if (signoLo * fMid < 0) { hi = mid; } else { lo = mid; signoLo = fMid; }
  }
  return { converge: true, pct: mid, margen: fMid + objetivo, iteraciones: k, rango };
}

/**
 * Conjunto de umbrales del proyecto, en la unidad en que se toman decisiones:
 * precio por m², costo de construcción y unidades a vender.
 */
export function calcularUmbrales(datos, tipo, resultado, objetivo = MARGEN_OBJETIVO_DEFAULT) {
  if (!datos || !tipo || !resultado) return null;
  const precioBase = resultado.precioListaM2 || 0;
  const margenActual = resultado.margen ?? 0;

  const conPrecio = (pct) => (precioBase ? precioBase * (1 + pct / 100) : null);

  const precioCero = buscarAjuste(datos, tipo, 'pctPrecio', 0);
  const precioObjetivo = buscarAjuste(datos, tipo, 'pctPrecio', objetivo);
  const costoObjetivo = buscarAjuste(datos, tipo, 'pctCostos', objetivo);
  const costoCero = buscarAjuste(datos, tipo, 'pctCostos', 0);

  return {
    margenActual,
    objetivo,
    // Precio de lista por m² que deja el margen en 0 y en el objetivo.
    precioMargenCero: precioCero.converge ? conPrecio(precioCero.pct) : null,
    precioMargenCeroPct: precioCero.converge ? precioCero.pct : null,
    precioObjetivo: precioObjetivo.converge ? conPrecio(precioObjetivo.pct) : null,
    precioObjetivoPct: precioObjetivo.converge ? precioObjetivo.pct : null,
    // Cuánto puede subir el costo de construcción antes de tocar cada umbral.
    holguraCostoObjetivoPct: costoObjetivo.converge ? costoObjetivo.pct : null,
    holguraCostoCeroPct: costoCero.converge ? costoCero.pct : null,
    // Punto de equilibrio en unidades: ya lo calcula el motor, aquí solo se
    // presenta junto a los demás umbrales para que se lean como un conjunto.
    puntoEquilibrio: resultado.puntoEquilibrio || null,
    unidadesTotales: resultado.cantApartamentos || resultado.cantViviendas || null,
    unidadesVendidas: resultado.unidadesVendidas ?? null,
    tolerancia: TOLERANCIA,
    maxIteraciones: MAX_ITER,
  };
}