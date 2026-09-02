// ============================================================
// CHEQUEOS DE COHERENCIA — Prefacti
//
// Revisa el conjunto y avisa. NUNCA bloquea, NUNCA corrige solo y NUNCA
// inventa un dato para poder opinar: si falta el insumo de un chequeo,
// ese chequeo simplemente no se ejecuta.
//
// Cada aviso dice qué revisar y a qué pestaña lleva.
// ============================================================
import { metricasArea } from "./calculations.js";
import { rangoCostoM2 } from "./presupuestoModelo.js";
import { todasUnidades } from "./cuadroAreas.js";

// Ratio de eficiencia (área vendible / área construida) habitual.
// Torre: circulaciones, ductos y estacionamientos se llevan el resto.
// Casas: la relación es construcción sobre lote y su rango es más ancho.
export const RANGO_RATIO = { torre: [0.6, 0.8], casas: [0.3, 0.8] };

const n = (v) => {
  const x = typeof v === 'number' ? v : parseFloat(v);
  return isNaN(x) || !isFinite(x) ? null : x;
};

export const CONFIG_CHEQUEOS_DEFAULT = { pais: 'PA', target: 'medio' };

export function configChequeos(datos) {
  return { ...CONFIG_CHEQUEOS_DEFAULT, ...((datos && datos.chequeos) || {}) };
}

export function conConfigChequeos(datos, cfg) {
  const base = datos || {};
  return { ...base, chequeos: { ...configChequeos(base), ...cfg } };
}

/**
 * @returns {Array<{id,nivel,p,ir}>} avisos; `p` son los parámetros del texto
 * y `ir` la pestaña donde se revisa. Lista vacía = todo dentro de rango.
 */
export function ejecutarChequeos({ datos, resultado, tipo, estado }) {
  const r = resultado;
  if (!r) return [];
  const d = datos || {};
  const cfg = configChequeos(d);
  const out = [];
  const add = (id, nivel, p, ir) => out.push({ id, nivel, p: p || {}, ir: ir || 'master' });

  // --- Ratio de eficiencia ---
  const area = metricasArea(r, tipo);
  const rango = RANGO_RATIO[tipo] || RANGO_RATIO.torre;
  if (area.construccion > 0 && area.venta > 0) {
    if (area.ratio < rango[0] || area.ratio > rango[1]) {
      add('ratio', 'atencion', {
        valor: (area.ratio * 100).toFixed(1),
        min: (rango[0] * 100).toFixed(0),
        max: (rango[1] * 100).toFixed(0),
      });
    }
    // --- Área vendible mayor que la construida ---
    if (area.venta > area.construccion) {
      add('areaMayor', 'atencion', {
        venta: Math.round(area.venta).toLocaleString('en-US'),
        construccion: Math.round(area.construccion).toLocaleString('en-US'),
      });
    }
  }

  // --- Costo directo por m² de construcción contra el rango país/target ---
  const directos = n(r.costosDirectos);
  const terreno = n(r.terreno) || 0;
  if (directos != null && area.construccion > 0) {
    const obra = Math.max(0, directos - terreno);
    const costoM2 = obra / area.construccion;
    const [min, max] = rangoCostoM2(cfg.pais, cfg.target, tipo);
    if (costoM2 > 0 && (costoM2 < min || costoM2 > max)) {
      add('costoM2', 'atencion', {
        valor: Math.round(costoM2).toLocaleString('en-US'),
        min: min.toLocaleString('en-US'),
        max: max.toLocaleString('en-US'),
      }, 'presupuesto');
    }
  }

  // --- Margen ---
  const margen = n(r.margen);
  if (margen != null) {
    if (margen < 0) add('margenNegativo', 'atencion', { valor: (margen * 100).toFixed(1) });
    else if (margen > 0.45) add('margenAlto', 'atencion', { valor: (margen * 100).toFixed(1) });
  }

  // --- Interés en cero con plazo largo ---
  const plazo = n(d.flujoParams && d.flujoParams.plazoObra);
  const interes = n(r.interesBancario) != null ? n(r.interesBancario) : n(r.interes);
  if (plazo != null && plazo > 12 && interes != null && interes === 0) {
    add('interesCero', 'aviso', { plazo: Math.round(plazo) }, 'flujo');
  }

  // --- Precio de venta por m² bajo el costo por m² vendible ---
  const precio = n(r.precioNetoM2);
  const costoVend = n(r.ctVendible);
  if (precio != null && costoVend != null && precio > 0 && costoVend > 0 && precio < costoVend) {
    add('precioBajoCosto', 'atencion', {
      precio: Math.round(precio).toLocaleString('en-US'),
      costo: Math.round(costoVend).toLocaleString('en-US'),
    });
  }

  // --- Unidades del cuadro de viviendas contra las capturadas ---
  const cuadro = d.cuadroAreas;
  if (cuadro) {
    const enCuadro = todasUnidades(cuadro).length;
    const capturadas = n(r.unidades) != null ? n(r.unidades)
      : n(r.cantApartamentos) != null ? n(r.cantApartamentos)
      : n(d.inputs && d.inputs.cantApartamentos);
    if (enCuadro > 0 && capturadas != null && capturadas > 0 && Math.round(enCuadro) !== Math.round(capturadas)) {
      add('unidades', 'atencion', { cuadro: enCuadro, factibilidad: Math.round(capturadas) }, 'areas');
    }
  }

  return out;
}