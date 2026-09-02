// ============================================================
// PRECISIÓN HONESTA — Prefacti
//
// Una prefactibilidad no conoce el segundo decimal de su margen: los
// costos son estimados y los precios son hipótesis. Mostrar "21,34 %"
// comunica una exactitud que el dato no tiene.
//
// Este archivo es SOLO PRESENTACIÓN. No toca el motor: calcularFactibilidad
// sigue devolviendo exactamente los mismos números y el modo "detalle"
// permite cuadrar al centavo contra el Master Finanzas.
// ============================================================
import { formatCurrency, formatNumber } from "./calculations.js";
import { formatMoneda } from "./localizacion.js";

export const MODO_PREFACT = 'prefactibilidad';
export const MODO_DETALLE = 'detalle';

// Campo nuevo con default en lectura: un proyecto guardado antes de esta
// función abre sin error y el modo se deduce de su estado.
export function modoPrecision(datos, estadoProyecto) {
  const m = datos && datos.precision && datos.precision.modo;
  if (m === MODO_DETALLE || m === MODO_PREFACT) return m;
  return estadoProyecto === 'Aprobado' || estadoProyecto === 'Finalizado'
    ? MODO_DETALLE
    : MODO_PREFACT;
}

export function conModoPrecision(datos, modo) {
  const base = datos || {};
  return { ...base, precision: { ...(base.precision || {}), modo } };
}

const vacio = (v) => v == null || (typeof v === 'number' && !isFinite(v)) || isNaN(v);

/**
 * Formateadores según el modo. En prefactibilidad los montos se redondean
 * al millar y los porcentajes a un decimal; en detalle se conserva el
 * formato exacto de siempre.
 */
export function formateadores(modo) {
  const aprox = modo === MODO_PREFACT;
  return {
    aprox,
    // Montos grandes (ingresos, costo, utilidad).
    money: (v) => {
      if (vacio(v)) return '—';
      return formatCurrency(aprox ? Math.round(v / 1000) * 1000 : v);
    },
    // Precios unitarios ($/m²): el millar no aplica, se redondea a la unidad.
    unit: (v) => {
      if (vacio(v)) return '—';
      return formatMoneda(aprox ? Math.round(v) : v);
    },
    pct: (v) => {
      if (vacio(v)) return '—';
      return (v * 100).toFixed(aprox ? 1 : 2) + '%';
    },
    num: (v, d = 2) => (vacio(v) ? '—' : formatNumber(v, aprox ? Math.min(d, 1) : d)),
  };
}