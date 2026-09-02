// ============================================================
// MODELADOR DE PRESUPUESTO POR ACTIVIDAD
//
// Permite estimar un desglose de costo de obra partiendo de:
//   área de construcción  +  target del producto  +  ubicación
//
// Los rangos de costo por m² son referencias de mercado (USD) por país y
// target, pensadas como punto de partida cuando el usuario todavía no tiene
// un presupuesto formal. El usuario puede ajustar el costo por m² y cada
// monto del desglose antes de llevarlo al flujo de caja.
// ============================================================

export const ACTIVIDADES_BASE = [
  { clave: 'indirectos_construccion', nombre: 'Costos indirectos de obra', tipo: 'indirecto' },
  { clave: 'cimentaciones', nombre: 'Cimentaciones' },
  { clave: 'estructura', nombre: 'Estructura' },
  { clave: 'albanileria', nombre: 'Albañilería' },
  { clave: 'acabados', nombre: 'Acabados' },
  { clave: 'sistemas_especiales', nombre: 'Sistemas especiales' },
  { clave: 'electricidad', nombre: 'Electricidad' },
  { clave: 'plomeria', nombre: 'Plomería' },
  { clave: 'obras_exteriores', nombre: 'Obras exteriores' },
];

export const TARGETS = [
  { clave: 'economico', nombre: 'Económico' },
  { clave: 'medio', nombre: 'Medio' },
  { clave: 'medio_alto', nombre: 'Medio alto' },
  { clave: 'alto', nombre: 'Alto' },
];

// Distribución del costo de obra por actividad (% normalizado a 100) según target.
// Incluye los costos indirectos de obra como una actividad más, de modo que el
// peso de las demás se recalcula sobre el total de obra.
const DISTRIBUCION = {
  // Anclado a la integración real de propuestas de una torre medio alto en
  // Panamá (US$1,252/m² de construcción, US$72.5M):
  //   indirectos/previos 5.9 · cimentaciones (pilotes+fundaciones+estructura
  //   construida) 5.5 · estructura 31.8 · albañilería 17.1 · acabados
  //   (incl. áreas sociales) 24.1 · eléctrico 6.5 · plomería 6.0 ·
  //   sistemas especiales 3.0 · exteriores 0.1
  // Los otros targets se derivan de ese patrón: la estructura y la albañilería
  // ceden peso a acabados y sistemas especiales al subir el target, pero la
  // estructura nunca baja de los acabados.
  economico: {
    indirectos_construccion: 5,
    cimentaciones: 6, estructura: 34.5, albanileria: 18.5, acabados: 18,
    sistemas_especiales: 1.5, electricidad: 6.5, plomeria: 6.5, obras_exteriores: 3.5,
  },
  medio: {
    indirectos_construccion: 5.5,
    cimentaciones: 5.7, estructura: 33, albanileria: 17.7, acabados: 21,
    sistemas_especiales: 2.3, electricidad: 6.5, plomeria: 6.3, obras_exteriores: 2,
  },
  medio_alto: {
    indirectos_construccion: 5.9,
    cimentaciones: 5.5, estructura: 31.8, albanileria: 17.1, acabados: 24.1,
    sistemas_especiales: 3, electricidad: 6.5, plomeria: 6, obras_exteriores: 1,
  },
  alto: {
    indirectos_construccion: 6.5,
    cimentaciones: 5, estructura: 29.5, albanileria: 15.5, acabados: 27,
    sistemas_especiales: 4.5, electricidad: 6.5, plomeria: 5.7, obras_exteriores: 0.8,
  },
};

// En proyectos de casas la estructura pesa menos y el urbanismo/exteriores más.
const AJUSTE_CASAS = { estructura: -6, obras_exteriores: 6 };

// Rangos de costo de obra por m² de construcción (USD, directo + indirecto de
// obra) para residencia vertical en Panamá, usados como base de referencia.
const RANGOS_BASE = {
  economico: [480, 680],
  medio: [700, 1000],
  medio_alto: [1000, 1350],
  alto: [1350, 1850],
};

// Factor de mercado por país respecto a la base (Panamá = 1).
export const RANGOS_PAIS = {
  PA: { nombre: 'Panamá', factor: 1 },
  CR: { nombre: 'Costa Rica', factor: 1.05 },
  CO: { nombre: 'Colombia', factor: 0.7 },
  MX: { nombre: 'México', factor: 0.75 },
  PE: { nombre: 'Perú', factor: 0.68 },
  CL: { nombre: 'Chile', factor: 0.95 },
  DO: { nombre: 'República Dominicana', factor: 0.9 },
  GT: { nombre: 'Guatemala', factor: 0.8 },
  HN: { nombre: 'Honduras', factor: 0.74 },
  SV: { nombre: 'El Salvador', factor: 0.76 },
  EC: { nombre: 'Ecuador', factor: 0.72 },
  US: { nombre: 'Estados Unidos', factor: 2.9 },
  ES: { nombre: 'España', factor: 1.9 },
  OTRO: { nombre: 'Otro país', factor: 0.9 },
};

// En casas (residencia horizontal) el costo por m² suele ser menor que en torre.
const FACTOR_CASAS = 0.88;

export function paisesDisponibles() {
  return Object.entries(RANGOS_PAIS).map(([codigo, v]) => ({ codigo, nombre: v.nombre }));
}

/** Rango [min, max] de costo por m² para país/target/tipo. */
export function rangoCostoM2(pais, target, tipo = 'torre') {
  const cfg = RANGOS_PAIS[pais] || RANGOS_PAIS.OTRO;
  const base = RANGOS_BASE[target] || RANGOS_BASE.medio;
  const f = cfg.factor * (tipo === 'casas' ? FACTOR_CASAS : 1);
  return [Math.round(base[0] * f), Math.round(base[1] * f)];
}

/** Punto medio del rango, sugerido como valor inicial. */
export function costoM2Sugerido(pais, target, tipo = 'torre') {
  const [min, max] = rangoCostoM2(pais, target, tipo);
  return Math.round((min + max) / 2);
}

/** Distribución porcentual por actividad, normalizada a 100. */
export function distribucionActividades(target, tipo = 'torre') {
  const base = { ...(DISTRIBUCION[target] || DISTRIBUCION.medio) };
  if (tipo === 'casas') {
    Object.entries(AJUSTE_CASAS).forEach(([k, delta]) => {
      base[k] = Math.max(0, (base[k] || 0) + delta);
    });
  }
  const suma = Object.values(base).reduce((a, b) => a + b, 0) || 1;
  return ACTIVIDADES_BASE.map(({ clave, nombre, tipo: tipoCosto }) => ({
    clave,
    nombre,
    tipo: tipoCosto || 'directo',
    porcentaje: ((base[clave] || 0) / suma) * 100,
  }));
}

/**
 * Genera el desglose por actividad.
 * @returns {{ actividades: Array, total: number, costoM2: number }}
 */
export function generarDesglose({ area, costoM2, target, tipo = 'torre' }) {
  const a = Number(area) || 0;
  const c = Number(costoM2) || 0;
  const total = a * c;
  const actividades = distribucionActividades(target, tipo).map((act) => ({
    ...act,
    monto: Math.round((total * act.porcentaje) / 100),
  }));
  return { actividades, total: Math.round(total), costoM2: c };
}

/** Convierte el desglose a partidas del presupuesto, respetando directo/indirecto. */
export function desgloseAFases(actividades) {
  return (actividades || [])
    .filter((a) => (Number(a.monto) || 0) > 0)
    .map((a) => ({
      id: `act_${a.clave}_${Math.random().toString(36).slice(2, 7)}`,
      nombre: a.nombre,
      cantidad: 0,
      unidad: '',
      precioUnitario: 0,
      monto: Math.round(Number(a.monto) || 0),
      tipo: a.tipo === 'indirecto' ? 'indirecto' : 'directo',
      subfases: [],
    }));
}