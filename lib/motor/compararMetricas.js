// Catálogo de métricas del comparador de versiones.
// Las base siempre se muestran; las opcionales se eligen desde el botón
// "Métricas" y se guardan por usuario en el navegador.
// Estilo de texto unificado: solo la primera palabra en mayúscula.
import { formatCurrency, formatPercent, formatNumber, formatInt } from "./calculations.js";

// Envuelve un formateador para que un dato ausente se vea como "—" y no
// como un cero que se leería como resultado real.
const sinDato = (f) => (v) => (v == null || (typeof v === 'number' && isNaN(v)) ? '—' : f(v));

export const METRICAS_BASE = [
  { key: 'totalIngresos', label: 'Total ingresos', format: formatCurrency, mejor: 'alta' },
  { key: 'costosDirectos', label: 'Costos directos', format: formatCurrency, mejor: 'baja' },
  { key: 'costosIndirectos', label: 'Costos indirectos', format: formatCurrency, mejor: 'baja' },
  { key: 'costoTotal', label: 'Costo total', format: formatCurrency, mejor: 'baja' },
  { key: 'utilidad', label: 'Utilidad', format: formatCurrency, mejor: 'alta' },
  { key: 'margen', label: 'Margen', format: formatPercent, mejor: 'alta' },
  { key: 'precioListaM2', label: 'Precio lista M²', format: formatCurrency, mejor: 'alta' },
  { key: 'precioNetoM2', label: 'Precio neto M²', format: formatCurrency, mejor: 'alta' },
  { key: 'ctVendible', label: 'Costo M² vendible', format: formatCurrency, mejor: 'baja' },
  { key: 'ctConstruccion', label: 'Costo M² construcción', format: formatCurrency, mejor: 'baja' },
];

export const METRICAS_OPCIONALES = [
  { key: 'terreno', label: 'Terreno', format: formatCurrency, mejor: 'baja' },
  { key: 'imprevistos', label: 'Imprevistos', format: formatCurrency, mejor: 'baja' },
  { key: 'gastosAdmin', label: 'Gastos administrativos', format: formatCurrency, mejor: 'baja' },
  { key: 'comisiones', label: 'Comisiones', format: formatCurrency, mejor: 'baja' },
  { key: 'publicidad', label: 'Publicidad', format: formatCurrency, mejor: 'baja' },
  { key: 'impuestoTerreno', label: 'Impuesto de terreno', format: formatCurrency, mejor: 'baja' },
  { key: 'impuestosVentas', label: 'Impuestos sobre ventas', format: formatCurrency, mejor: 'baja' },
  { key: 'interes', label: 'Interés bancario', format: formatCurrency, mejor: 'baja' },
  { key: 'descuentos', label: 'Descuentos', format: formatCurrency, mejor: 'alta' },
  { key: 'ingresosExtras', label: 'Ingresos adicionales', format: formatCurrency, mejor: 'alta' },
  { key: 'precioNetoUnidad', label: 'Precio neto unidad', format: formatCurrency, mejor: 'alta' },
  { key: 'areaVendible', label: 'Área vendible', format: (v) => formatNumber(v, 2), mejor: 'alta' },
  { key: 'areaConstruccion', label: 'Área de construcción', format: (v) => formatNumber(v, 2), mejor: 'baja' },
  { key: 'm2ConstTipo', label: 'M² construidos', format: (v) => formatNumber(v, 2), mejor: 'alta' },
  { key: 'm2LoteTipo', label: 'M² de lote', format: (v) => formatNumber(v, 2), mejor: 'alta' },
  { key: 'cantViviendas', label: 'Cantidad de viviendas', format: formatInt, mejor: 'alta' },
  { key: 'totalVendido', label: 'Total vendido', format: formatCurrency, mejor: 'alta' },
  { key: 'totalPorVender', label: 'Total por vender', format: formatCurrency, mejor: 'baja' },
  { key: 'pctVendido', label: 'Porcentaje vendido', format: formatPercent, mejor: 'alta' },
  { key: 'puntoEquilibrio', label: 'Punto de equilibrio', format: (v) => formatNumber(v, 1), mejor: 'baja' },
  { key: 'absorcion', label: 'Absorción (años)', format: (v) => formatNumber(v, 2), mejor: 'baja' },
  // --- Retorno (dependen del flujo de caja) ---
  // Sin flujo configurado valen null y se muestran como "—": un 0 aquí se
  // leería como "rentabilidad cero" y es solo ausencia de cronograma.
  { key: 'tirAnual', label: 'TIR anual', format: sinDato(formatPercent), mejor: 'alta' },
  { key: 'vanProyecto', label: 'VAN del proyecto', format: sinDato(formatCurrency), mejor: 'alta' },
  { key: 'paybackMeses', label: 'Recuperación (meses)', format: sinDato(formatInt), mejor: 'baja' },
  { key: 'capitalPropioMax', label: 'Capital propio máximo', format: sinDato(formatCurrency), mejor: 'baja' },
  { key: 'multiploCapital', label: 'Múltiplo sobre capital', format: sinDato((v) => formatNumber(v, 2) + '×'), mejor: 'alta' },
  { key: 'roeProyecto', label: 'ROE del proyecto', format: sinDato(formatPercent), mejor: 'alta' },
];

// Catálogo completo (base + opcionales) para el comparador de proyectos,
// donde todas las métricas se pueden mostrar u ocultar.
export const METRICAS_TODAS = [...METRICAS_BASE, ...METRICAS_OPCIONALES];

const STORAGE_KEY = 'prefacti_comparador_metricas_v2';
const STORAGE_KEY_PROY = 'prefacti_comparador_proyectos_metricas';

function leer(key, def) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : def;
  } catch {
    return def;
  }
}

function guardar(key, keys) {
  try {
    localStorage.setItem(key, JSON.stringify(keys));
  } catch { /* almacenamiento no disponible */ }
}

// Comparador de versiones: base marcadas por defecto, todas ocultables.
export const leerMetricasExtra = () => leer(STORAGE_KEY, METRICAS_BASE.map((m) => m.key));
export const guardarMetricasExtra = (keys) => guardar(STORAGE_KEY, keys);

// Comparador de proyectos: por defecto vienen marcadas las métricas base.
export const leerMetricasProyectos = () => leer(STORAGE_KEY_PROY, METRICAS_BASE.map((m) => m.key));
export const guardarMetricasProyectos = (keys) => guardar(STORAGE_KEY_PROY, keys);