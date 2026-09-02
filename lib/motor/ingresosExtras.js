// ============================================================
// Ingresos adicionales (extras) del proyecto.
// Líneas de ingreso con valor manual que se suman al TOTAL INGRESOS.
//  - Torre: se guardan en datos.inputs.ingresosExtras
//  - Casas: se guardan en datos.ingresosExtras (nivel proyecto)
// Cada item: { id, nombre, valor }
// ============================================================

export function getIngresosExtras(datos, tipo) {
  if (!datos) return [];
  const src = tipo === 'torre' ? (datos.inputs || {}) : datos;
  return Array.isArray(src.ingresosExtras) ? src.ingresosExtras : [];
}

export function setIngresosExtras(datos, tipo, extras) {
  if (tipo === 'torre') {
    return { ...datos, inputs: { ...(datos.inputs || {}), ingresosExtras: extras } };
  }
  return { ...datos, ingresosExtras: extras };
}

function nuevoId() {
  return 'ie_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

export function agregarIngresoExtra(datos, tipo, nombre = '', valor = 0) {
  const extras = getIngresosExtras(datos, tipo);
  const nuevo = { id: nuevoId(), nombre: nombre || 'Nuevo ingreso', valor: Number(valor) || 0 };
  return setIngresosExtras(datos, tipo, [...extras, nuevo]);
}

export function actualizarIngresoExtra(datos, tipo, id, patch) {
  const extras = getIngresosExtras(datos, tipo);
  return setIngresosExtras(
    datos,
    tipo,
    extras.map((e) => (e.id === id ? { ...e, ...patch } : e))
  );
}

export function eliminarIngresoExtra(datos, tipo, id) {
  const extras = getIngresosExtras(datos, tipo);
  return setIngresosExtras(datos, tipo, extras.filter((e) => e.id !== id));
}

export function sumaIngresosExtras(datos, tipo) {
  return getIngresosExtras(datos, tipo).reduce((a, e) => a + (Number(e.valor) || 0), 0);
}

// Clave usada en el spec del Master para una línea extra.
export function extraKey(e) {
  return 'ie_' + (e.id || '').replace(/^ie_/, '');
}