// ============================================================
// Casas · Etapas como fuente de la verdad
// Los costos y la mezcla de unidades se capturan por ETAPA.
// Los modelos sólo definen m² y precio por vivienda; sus cantidades
// y costos se DERIVAN del reparto hecho en las etapas, de modo que
// la vista por modelo y la vista por etapa siempre cuadren.
// ============================================================

const num = (v) => {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};
const tieneValor = (v) => v !== undefined && v !== '' && v !== null;

// Costos que se capturan en la etapa y se prorratean a los modelos.
export const COSTOS_ETAPA = [
  'costoConstTipo', 'costoIndTipo', 'infraOriginario', 'infraVida',
  'valorTerreno', 'interesBancario',
];

export const usaEtapas = (datos) => (datos?.etapas || []).length > 0;

// Unidades de un modelo dentro de una etapa (reparto por índice de modelo).
export const cantEnEtapa = (etapa, idx) => num(etapa?.reparto?.[idx]);

export const tieneReparto = (etapa) =>
  Object.values(etapa?.reparto || {}).some((v) => num(v) > 0);

// Total de unidades de una etapa (según su reparto por modelo).
export function unidadesEtapa(etapa, modelos = []) {
  if (!tieneReparto(etapa)) return num(etapa?.cantViviendas);
  return modelos.reduce((a, _m, idx) => a + cantEnEtapa(etapa, idx), 0);
}

// Total de unidades de un modelo en todo el proyecto (suma de etapas).
export function unidadesModelo(datos, idx) {
  return (datos?.etapas || []).reduce((a, e) => a + cantEnEtapa(e, idx), 0);
}

// Precio de lista por vivienda de un modelo (compatibilidad con datos viejos,
// donde el modelo guardaba el ingreso total y su propia cantidad).
export function precioUnidadModelo(m) {
  if (tieneValor(m?.precioUnidad)) return num(m.precioUnidad);
  const cant = num(m?.cantViviendas);
  return cant > 0 ? num(m?.ingresosViv) / cant : 0;
}

// Precio de lista promedio por m² construido, ponderado por las unidades de
// cada modelo (si aún no hay unidades repartidas, promedia por modelo).
export function precioPromedioM2(datos, modelos) {
  const lista = modelos || datos?.modelos || [];
  let ingresos = 0, m2 = 0, ingSimple = 0, m2Simple = 0;
  lista.forEach((m, idx) => {
    const u = unidadesModelo(datos, idx);
    const mc = num(m.m2ConstViv);
    const pu = precioUnidadModelo(m);
    ingresos += u * pu;
    m2 += u * mc;
    ingSimple += pu;
    m2Simple += mc;
  });
  if (m2 > 0) return +(ingresos / m2).toFixed(2);
  return m2Simple > 0 ? +(ingSimple / m2Simple).toFixed(2) : 0;
}

// Etapas listas para el motor de cálculo: costos propios de la etapa +
// unidades, m² e ingresos derivados del reparto de modelos.
export function etapasCalculables(datos) {
  const modelos = datos?.modelos || [];
  return (datos?.etapas || []).map((e) => {
    if (!tieneReparto(e)) return e; // etapa antigua: conserva sus propios datos
    let cant = 0, m2C = 0, m2L = 0, ingresos = 0;
    modelos.forEach((m, idx) => {
      const c = cantEnEtapa(e, idx);
      cant += c;
      m2C += c * num(m.m2ConstViv);
      m2L += c * num(m.m2LoteViv);
      ingresos += c * precioUnidadModelo(m);
    });
    return {
      ...e,
      cantViviendas: cant,
      m2ConstViv: cant ? m2C / cant : 0,
      m2LoteViv: cant ? m2L / cant : 0,
      ingresosViv: ingresos,
    };
  });
}

// Modelos derivados de las etapas: cantidades sumadas y costos prorrateados
// por su participación en los m² construidos de cada etapa.
export function modelosDerivados(datos, pImprevistos = 0.03) {
  const modelos = datos?.modelos || [];
  if (!usaEtapas(datos)) return modelos;
  const etapas = datos.etapas || [];

  // Peso de cada modelo dentro de cada etapa (m² construidos).
  const pesos = etapas.map((e) => {
    const w = modelos.map((m, idx) => cantEnEtapa(e, idx) * num(m.m2ConstViv));
    const total = w.reduce((a, x) => a + x, 0);
    if (total > 0) return { w, total };
    // Sin m² capturados: reparte por unidades.
    const u = modelos.map((_m, idx) => cantEnEtapa(e, idx));
    return { w: u, total: u.reduce((a, x) => a + x, 0) };
  });

  return modelos.map((m, idx) => {
    const cant = unidadesModelo(datos, idx);
    const out = {
      ...m,
      cantViviendas: cant,
      ingresosViv: precioUnidadModelo(m) * cant,
      descuentoViv: 0,
    };
    COSTOS_ETAPA.forEach((k) => { out[k] = 0; });
    let imprevistos = 0;
    let descuento = 0;

    etapas.forEach((e, ei) => {
      const { w, total } = pesos[ei];
      if (!total) return;
      const share = (w[idx] || 0) / total;
      if (!share) return;
      COSTOS_ETAPA.forEach((k) => { out[k] += share * num(e[k]); });
      const cc = num(e.costoConstTipo) + num(e.costoIndTipo);
      const impEtapa = tieneValor(e.imprevistos) ? num(e.imprevistos) : pImprevistos * cc;
      imprevistos += share * impEtapa;
      descuento += share * num(e.descuentoViv);
    });

    out.imprevistos = imprevistos;
    if (descuento > 0) out.descuentoViv = descuento;
    return out;
  });
}

// Deja las cantidades escritas en los datos que se guardan: cada etapa lleva
// el total de su reparto y cada modelo el total sumado de todas las etapas.
// Así el reparto capturado queda reflejado tal cual en la hoja global por
// modelo, en el presupuesto, el comparador y las exportaciones.
export function sincronizarUnidades(datos) {
  if (!datos || !usaEtapas(datos)) return datos;
  const modelos = datos.modelos || [];
  const etapas = (datos.etapas || []).map((e) => (
    tieneReparto(e) ? { ...e, cantViviendas: unidadesEtapa(e, modelos) } : e
  ));
  const next = { ...datos, etapas };
  next.modelos = modelos.map((m, idx) => ({ ...m, cantViviendas: unidadesModelo(next, idx) }));
  return next;
}

// Al eliminar un modelo hay que recorrer el reparto de todas las etapas: sus
// claves son los índices de los modelos, y sin este ajuste las unidades
// quedarían asignadas al modelo equivocado (o se perderían).
export function quitarModeloDeReparto(datos, indexEliminado) {
  const etapas = (datos?.etapas || []).map((e) => {
    if (!e?.reparto) return e;
    const reparto = {};
    Object.entries(e.reparto).forEach(([k, v]) => {
      const i = parseInt(k, 10);
      if (isNaN(i) || i === indexEliminado) return;
      reparto[i > indexEliminado ? i - 1 : i] = v;
    });
    return { ...e, reparto };
  });
  return { ...datos, etapas };
}

// Validación de cuadratura: las unidades por modelo nunca pueden exceder
// las unidades repartidas en las etapas (por construcción son iguales).
export function resumenUnidades(datos) {
  const modelos = datos?.modelos || [];
  const porModelo = modelos.map((m, idx) => ({
    nombre: m.nombre, cantidad: unidadesModelo(datos, idx),
  }));
  const totalModelos = porModelo.reduce((a, x) => a + x.cantidad, 0);
  const totalEtapas = (datos?.etapas || []).reduce((a, e) => a + unidadesEtapa(e, modelos), 0);
  return { porModelo, totalModelos, totalEtapas, cuadra: totalModelos === totalEtapas };
}