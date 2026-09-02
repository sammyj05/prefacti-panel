// ============================================================
// Presupuesto — árbol de fases (hasta 3 niveles) y cálculos
//
// Estructura de un nodo (misma forma en los 3 niveles):
//   { id, nombre, tipo: 'directo'|'indirecto' (solo nivel 1),
//     cantidad, unidad, precioUnitario, monto, subfases: [ ...nodos ] }
//
// Reglas tipo Excel:
//   - Si un nodo tiene hijos, su monto es la SUMA de los hijos.
//   - Si no tiene hijos y hay cantidad y precio unitario, el monto es
//     cantidad × precio unitario.
//   - Si no, se usa el monto ingresado manualmente.
// ============================================================

export const MAX_NIVEL = 3;

const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isNaN(n) ? 0 : n;
};

export const nuevoId = (p = 'fase') => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export const hijosDe = (n) => (Array.isArray(n?.subfases) ? n.subfases : []);

/** ¿La línea calcula su monto a partir de cantidad × precio? */
export function esCalculada(linea) {
  return num(linea?.cantidad) > 0 && num(linea?.precioUnitario) > 0;
}

/** Monto de un nodo: suma de hijos, o cantidad × precio, o monto manual. */
export function montoNodo(nodo) {
  if (!nodo) return 0;
  const hijos = hijosDe(nodo);
  if (hijos.length > 0) return hijos.reduce((a, h) => a + montoNodo(h), 0);
  if (esCalculada(nodo)) return num(nodo.cantidad) * num(nodo.precioUnitario);
  return num(nodo.monto);
}

// Alias históricos
export const montoLinea = montoNodo;
export const montoFase = montoNodo;

/** Totales del presupuesto (solo se suman las fases raíz). */
export function calcularResumenPresupuesto(fases) {
  const list = Array.isArray(fases) ? fases : [];
  let directoTotal = 0;
  let indirectoTotal = 0;
  list.forEach((f) => {
    const m = montoNodo(f);
    if (f.tipo === 'indirecto') indirectoTotal += m;
    else directoTotal += m;
  });
  return { directoTotal, indirectoTotal, totalPresupuesto: directoTotal + indirectoTotal };
}

/** Monto acumulado por etiqueta (tipo) de las fases raíz. */
export function totalesPorTipo(fases) {
  const out = {};
  (Array.isArray(fases) ? fases : []).forEach((f) => {
    const k = f.tipo || 'directo';
    out[k] = (out[k] || 0) + montoNodo(f);
  });
  return out;
}

/** Fases listas para sembrar en el flujo de caja: solo el nivel 1. */
export function fasesParaFlujo(fases) {
  return (Array.isArray(fases) ? fases : [])
    .filter((f) => (f.nombre || '').trim() && montoNodo(f) > 0)
    .map((f) => ({ nombre: f.nombre.trim(), total: Math.round(montoNodo(f)) }));
}

/** Cuenta todas las líneas del árbol. */
export function contarLineas(list) {
  return (list || []).reduce((a, n) => a + 1 + contarLineas(hijosDe(n)), 0);
}

/** Nodo vacío listo para editar. */
export function nodoVacio(nivel = 1) {
  const base = {
    id: nuevoId(`n${nivel}`),
    nombre: '',
    cantidad: 0,
    unidad: '',
    precioUnitario: 0,
    monto: 0,
    subfases: [],
  };
  return nivel === 1 ? { ...base, tipo: 'directo' } : base;
}

// ---------- Utilidades inmutables sobre el árbol ----------

/** Aplica fn al nodo con ese id, devolviendo un árbol nuevo. */
export function mapNodo(list, id, fn) {
  return (list || []).map((n) => (
    n.id === id ? fn(n) : { ...n, subfases: mapNodo(hijosDe(n), id, fn) }
  ));
}

/** Elimina el nodo con ese id en cualquier nivel. */
export function quitarNodo(list, id) {
  return (list || [])
    .filter((n) => n.id !== id)
    .map((n) => ({ ...n, subfases: quitarNodo(hijosDe(n), id) }));
}

/** Devuelve la lista de hijos de un padre ('root' = nivel 1). */
export function listaDe(list, parentId) {
  if (parentId === 'root') return list || [];
  let encontrada = null;
  const buscar = (arr) => {
    for (const n of arr) {
      if (n.id === parentId) { encontrada = hijosDe(n); return; }
      buscar(hijosDe(n));
      if (encontrada) return;
    }
  };
  buscar(list || []);
  return encontrada || [];
}

/** Reemplaza la lista de hijos de un padre ('root' = nivel 1). */
export function setLista(list, parentId, nuevos) {
  if (parentId === 'root') return nuevos;
  return mapNodo(list, parentId, (n) => ({ ...n, subfases: nuevos }));
}

/** Copia profunda de un nodo con identificadores nuevos. */
export function clonarNodo(nodo, nivel = 1) {
  const copia = {
    ...nodo,
    id: nuevoId(`n${nivel}`),
    subfases: hijosDe(nodo).map((h) => clonarNodo(h, nivel + 1)),
  };
  return copia;
}

/** Inserta un nodo justo después del nodo indicado, en su mismo nivel. */
export function insertarDespues(list, id, nodo) {
  const rec = (arr) => {
    const out = [];
    for (const n of arr) {
      const copia = { ...n, subfases: rec(hijosDe(n)) };
      out.push(copia);
      if (n.id === id) out.push(nodo);
    }
    return out;
  };
  return rec(list || []);
}

// ---------- Consultas sobre la estructura ----------

/** Devuelve el nodo con ese id, en cualquier nivel. */
export function buscarNodo(list, id) {
  for (const n of list || []) {
    if (n.id === id) return n;
    const r = buscarNodo(hijosDe(n), id);
    if (r) return r;
  }
  return null;
}

/** Id del padre de un nodo; 'root' si es de nivel 1. */
export function padreDe(list, id, padre = 'root') {
  for (const n of list || []) {
    if (n.id === id) return padre;
    const r = padreDe(hijosDe(n), id, n.id);
    if (r) return r;
  }
  return null;
}

/** Nivel (1..3) del nodo dentro del árbol. */
export function nivelDe(list, id, nivel = 1) {
  for (const n of list || []) {
    if (n.id === id) return nivel;
    const r = nivelDe(hijosDe(n), id, nivel + 1);
    if (r) return r;
  }
  return 0;
}

/** Alto del subárbol: 1 si el nodo no tiene hijos. */
export function profundidad(nodo) {
  const h = hijosDe(nodo);
  return h.length ? 1 + Math.max(...h.map(profundidad)) : 1;
}

/** Cuántos descendientes se llevaría consigo el nodo si se elimina. */
export function contarDescendientes(nodo) {
  return hijosDe(nodo).reduce((a, h) => a + 1 + contarDescendientes(h), 0);
}

// El tipo (etiqueta de costo) solo existe en el nivel 1: al subir o bajar de
// nivel se añade o se descarta, sin tocar ningún monto.
const ajustarNivel = (nodo, nivel) => {
  if (nivel === 1) return { ...nodo, tipo: nodo.tipo || 'directo' };
  const { tipo, ...resto } = nodo;
  return resto;
};

/**
 * Convierte el nodo en hijo de su hermano anterior. Devuelve null (y no
 * modifica nada) si no hay hermano anterior o si el subárbol excedería
 * MAX_NIVEL.
 */
export function indentarNodo(list, id) {
  const padre = padreDe(list, id);
  if (!padre) return null;
  const hermanos = listaDe(list, padre);
  const i = hermanos.findIndex((n) => n.id === id);
  if (i <= 0) return null;
  const nodo = hermanos[i];
  const nivelNuevo = nivelDe(list, id) + 1;
  if (nivelNuevo + profundidad(nodo) - 1 > MAX_NIVEL) return null;
  const nuevos = hermanos
    .map((n, k) => (k === i - 1
      ? { ...n, subfases: [...hijosDe(n), ajustarNivel(nodo, nivelNuevo)] }
      : n))
    .filter((_, k) => k !== i);
  return setLista(list, padre, nuevos);
}

/**
 * Saca el nodo de su padre y lo coloca justo después de él, un nivel arriba.
 * Devuelve null si ya está en el nivel 1.
 */
export function desindentarNodo(list, id) {
  const padre = padreDe(list, id);
  if (!padre || padre === 'root') return null;
  const abuelo = padreDe(list, padre);
  const nodo = buscarNodo(list, id);
  if (!nodo) return null;
  const nivelNuevo = nivelDe(list, id) - 1;
  let arbol = setLista(list, padre, listaDe(list, padre).filter((n) => n.id !== id));
  const destino = [...listaDe(arbol, abuelo)];
  const j = destino.findIndex((n) => n.id === padre);
  destino.splice(j + 1, 0, ajustarNivel(nodo, nivelNuevo));
  return setLista(arbol, abuelo, destino);
}

/** Mueve el nodo entre sus hermanos. delta -1 sube, +1 baja. */
export function moverEntreHermanos(list, id, delta) {
  const padre = padreDe(list, id);
  if (!padre) return null;
  const hermanos = [...listaDe(list, padre)];
  const i = hermanos.findIndex((n) => n.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= hermanos.length) return null;
  [hermanos[i], hermanos[j]] = [hermanos[j], hermanos[i]];
  return setLista(list, padre, hermanos);
}

const normalizarNodo = (l, nivel) => {
  const hijos = (l.subfases || l.partidas || l.items || [])
    .filter((s) => String(s?.nombre || '').trim())
    .map((s) => normalizarNodo(s, nivel + 1))
    .filter((s) => hijosDe(s).length > 0 || montoNodo(s) > 0);
  const base = {
    id: l.id || nuevoId(`n${nivel}`),
    nombre: String(l.nombre || '').trim(),
    cantidad: num(l.cantidad),
    unidad: String(l.unidad || '').trim(),
    precioUnitario: num(l.precioUnitario),
    monto: Math.round(num(l.monto ?? l.total)),
    subfases: nivel < MAX_NIVEL ? hijos : [],
  };
  return nivel === 1 ? { ...base, tipo: l.tipo === 'indirecto' ? 'indirecto' : 'directo' } : base;
};

/**
 * Convierte partidas importadas (de interpretarPresupuestoObra) al árbol de
 * fases. Acepta jerarquías anidadas de hasta tres niveles o listas planas.
 */
export function partidasAFases(partidas) {
  return (partidas || [])
    .map((p) => normalizarNodo(p, 1))
    .filter((f) => f.nombre && (hijosDe(f).length > 0 || montoNodo(f) > 0));
}