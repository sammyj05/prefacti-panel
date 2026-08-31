// ============================================================
// Personalización del Master Finanzas
//  - Ocultar líneas existentes (por key o label)
//  - Agregar líneas custom con fórmulas aritméticas evaluadas
//    sobre el resultado calculado (una vez por columna).
// La configuración se persiste en datos.master_custom.
// ============================================================

export function getMasterCustom(datos) {
  const mc = (datos && datos.master_custom) || {};
  return {
    ocultas: Array.isArray(mc.ocultas) ? mc.ocultas : [],
    custom: Array.isArray(mc.custom) ? mc.custom : [],
    orden: Array.isArray(mc.orden) ? mc.orden : [],
  };
}

// Reordena las filas de una sección manteniendo FIJAS en su posición original
// las filas de totales (kind 'kpi' o 'sub'). Sólo las filas movibles adoptan
// el orden configurado en `orden` (array de ids); las no listadas conservan su
// orden original entre las fijas.
export function ordenarSeccion(rows, orden) {
  const ord = Array.isArray(orden) ? orden : [];
  const esFija = (r) => r.kind === 'kpi' || r.kind === 'sub';
  const movibles = rows.filter((r) => !esFija(r));
  const byId = new Map();
  movibles.forEach((r) => {
    const id = r.key || r.label;
    if (!byId.has(id)) byId.set(id, r);
  });
  const idsMov = [...byId.keys()];
  const setMov = new Set(idsMov);
  const ordenMov = ord.filter((id) => setMov.has(id));
  const faltantes = idsMov.filter((id) => !ordenMov.includes(id));
  const ordenFinal = [...ordenMov, ...faltantes];
  let idx = 0;
  return rows.map((r) => (esFija(r) ? r : (byId.get(ordenFinal[idx++]) ?? r)));
}

function setMasterCustom(datos, mc) {
  return { ...(datos || {}), master_custom: mc };
}

export function ocultarLinea(datos, id) {
  if (!id) return datos;
  const mc = getMasterCustom(datos);
  if (mc.ocultas.includes(id)) return datos;
  return setMasterCustom(datos, { ...mc, ocultas: [...mc.ocultas, id] });
}

export function mostrarLinea(datos, id) {
  if (!id) return datos;
  const mc = getMasterCustom(datos);
  return setMasterCustom(datos, { ...mc, ocultas: mc.ocultas.filter((k) => k !== id) });
}

export function mostrarTodasLineas(datos) {
  const mc = getMasterCustom(datos);
  return setMasterCustom(datos, { ...mc, ocultas: [] });
}

export function agregarLineaCustom(datos, def) {
  const mc = getMasterCustom(datos);
  const nuevo = {
    id: def.id || 'custom_' + Date.now(),
    label: def.label || 'Nueva línea',
    formula: def.formula || '0',
    numFmt: def.numFmt || 'money',
    seccion: def.seccion || null,
    tipo: def.tipo || 'formula',
    valor: typeof def.valor === 'number' ? def.valor : (def.valor != null ? parseFloat(def.valor) || 0 : 0),
    valores: Array.isArray(def.valores) ? def.valores.map((v) => (typeof v === 'number' ? v : parseFloat(v) || 0)) : undefined,
  };
  return setMasterCustom(datos, { ...mc, custom: [...mc.custom, nuevo] });
}

export function eliminarLineaCustom(datos, key) {
  if (!key) return datos;
  const mc = getMasterCustom(datos);
  return setMasterCustom(datos, {
    ...mc,
    custom: mc.custom.filter((c) => c.id !== key && c.label !== key),
  });
}

// Actualiza una línea personalizada existente (por id).
export function actualizarLineaCustom(datos, id, def) {
  if (!id) return datos;
  const mc = getMasterCustom(datos);
  const custom = mc.custom.map((c) =>
    c.id === id
      ? {
          ...c,
          label: def.label || c.label,
          formula: def.formula != null ? def.formula : c.formula,
          numFmt: def.numFmt || c.numFmt,
          seccion: def.seccion != null ? def.seccion : c.seccion,
          tipo: def.tipo || c.tipo || 'formula',
          valor: typeof def.valor === 'number' ? def.valor : (def.valor != null ? parseFloat(def.valor) || 0 : c.valor),
          valores: Array.isArray(def.valores) ? def.valores.map((v) => (typeof v === 'number' ? v : parseFloat(v) || 0)) : c.valores,
        }
      : c
  );
  return setMasterCustom(datos, { ...mc, custom });
}

// Actualiza sólo el valor de una línea manual (sección datos_proyecto).
export function setCustomValor(datos, id, valor) {
  if (!id) return datos;
  const mc = getMasterCustom(datos);
  const custom = mc.custom.map((c) =>
    c.id === id ? { ...c, valor: typeof valor === 'number' ? valor : (parseFloat(valor) || 0) } : c
  );
  return setMasterCustom(datos, { ...mc, custom });
}

// Actualiza el valor manual de una línea personalizada para un modelo concreto
// (proyectos de Casas: distribución por modelo). modelIndex = índice del modelo.
export function setCustomValorModelo(datos, id, modelIndex, valor) {
  if (!id) return datos;
  const mc = getMasterCustom(datos);
  const custom = mc.custom.map((c) => {
    if (c.id !== id) return c;
    const valores = Array.isArray(c.valores) ? [...c.valores] : [];
    valores[modelIndex] = typeof valor === 'number' ? valor : (parseFloat(valor) || 0);
    return { ...c, valores };
  });
  return setMasterCustom(datos, { ...mc, custom });
}

// Orden de visualización: array de ids (key/label de filas base, o customId
// para líneas personalizadas) en el orden deseado. Las filas no listadas
// conservan su orden original. Aplica por sección.
export function setOrden(datos, orden) {
  const mc = getMasterCustom(datos);
  return setMasterCustom(datos, { ...mc, orden: Array.isArray(orden) ? orden : [] });
}

// Restablece la vista: muestra todas las líneas y limpia el orden.
export function restablecerVista(datos) {
  const mc = getMasterCustom(datos);
  return setMasterCustom(datos, { ...mc, ocultas: [], orden: [] });
}

// Posición de un id dentro del orden configurado (para ordenar).
// Devuelve Infinity si no está listado (conserva el orden original al final).
export function posicionOrden(orden, id) {
  if (!Array.isArray(orden) || !id) return Infinity;
  const i = orden.indexOf(id);
  return i === -1 ? Infinity : i;
}

// Evalúa una fórmula aritmética segura sobre los campos del resultado.
// Solo permite números, nombres de campos, + - * / ( ) . _ y espacios.
export function evaluarFormula(formula, resultado = {}) {
  if (typeof formula !== 'string' || !formula.trim()) return 0;
  if (!/^[a-zA-Z0-9_\s+\-*/.()]+$/.test(formula)) return 0;
  const keys = Object.keys(resultado);
  const vals = keys.map((k) => {
    const v = resultado[k];
    if (typeof v === 'number') return v;
    if (Array.isArray(v)) return 0;
    if (typeof v === 'string') return 0;
    return v || 0;
  });
  try {
     
    const fn = new Function(...keys, '"use strict"; return (' + formula + ');');
    const res = fn(...vals);
    return typeof res === 'number' && isFinite(res) ? res : 0;
  } catch {
    return 0;
  }
}

// ============================================================
// Aplicación de líneas personalizadas al resultado calculado.
// Suman a su total (ingresos / costos directos / costos indirectos)
// y recalculan los costos porcentuales y derivados, para que las
// tarjetas y KPIs coincidan exactamente con el Master Finanzas.
// ============================================================

// TORRE: muta `r` in-place sumando custom lines y recalculando derivados.
export function aplicarCustomTorreResultado(r, custom, P, i) {
  const n = (v) => (typeof v === 'number' ? v : parseFloat(v) || 0);
  let cIng = 0, cDir = 0, cInd = 0;
  (custom || []).filter((c) => c.seccion !== 'datos_proyecto').forEach((c) => {
    const v = evaluarFormula(c.formula, r) || 0;
    if (c.seccion === 'ventas') cIng += v;
    else if (c.seccion === 'costos_directos') cDir += v;
    else if (c.seccion === 'costos_indirectos') cInd += v;
  });
  r.totalIngresos += cIng; r.total_ingresos = r.totalIngresos;
  r.costosDirectos += cDir;
  r.gastosAdmin = n(P.gastosAdminMonto) > 0 ? n(P.gastosAdminMonto) : P.gastosAdmin * (r.costosDirectos - n(i.valorTerreno));
  r.comisiones = n(P.comisionesMonto) > 0 ? n(P.comisionesMonto) : P.comisiones * r.totalIngresos;
  r.publicidad = n(P.publicidadMonto) > 0 ? n(P.publicidadMonto) : P.publicidad * r.totalIngresos;
  r.impuestoTerreno = n(P.impuestoTerrenoMonto) > 0 ? n(P.impuestoTerrenoMonto) : P.impuestoTerreno * r.totalIngresos;
  r.impuestosVentas = n(P.impuestosVentasMonto) > 0 ? n(P.impuestosVentasMonto) : P.impuestosVentas * r.totalIngresos;
  r.costosIndirectos = r.gastosAdmin + r.comisiones + r.publicidad + r.impuestoTerreno +
    r.impuestosVentas + n(i.interesBancario) + n(i.apartamentoModelo) + n(i.cuotaMantenimiento) + n(i.garantias) + cInd;
  r.costoTotal = r.costosDirectos + r.costosIndirectos; r.costo_total = r.costoTotal;
  r.utilidad = r.totalIngresos - r.costoTotal;
  r.margen = r.totalIngresos ? r.utilidad / r.totalIngresos : 0;
  r.ctVendible = r.areaVendible ? r.costoTotal / r.areaVendible : 0;
  r.ctConstruccion = r.areaConstruccion ? r.costoTotal / r.areaConstruccion : 0;
  r.costo_m2_vendible = r.areaVendible ? r.costoTotal / r.areaVendible : 0;
}

// CASAS: muta `r` (resultado global) in-place sumando custom lines y recalculando.
export function aplicarCustomCasasResultado(r, custom, P) {
  const n = (v) => (typeof v === 'number' ? v : parseFloat(v) || 0);
  let cIng = 0, cDir = 0, cInd = 0;
  (custom || []).filter((c) => c.seccion !== 'datos_proyecto').forEach((c) => {
    const v = evaluarFormula(c.formula, r) || 0;
    if (c.seccion === 'ventas') cIng += v;
    else if (c.seccion === 'costos_directos') cDir += v;
    else if (c.seccion === 'costos_indirectos') cInd += v;
  });
  r.totalIngresos += cIng; r.total_ingresos = r.totalIngresos;
  r.costosDirectos += cDir;
  r.comisiones = n(P.comisionesMonto) > 0 ? n(P.comisionesMonto) : P.comisiones * r.totalIngresos;
  r.publicidad = n(P.publicidadMonto) > 0 ? n(P.publicidadMonto) : P.publicidad * r.totalIngresos;
  r.impuestoTerreno = n(P.impuestoTerrenoMonto) > 0 ? n(P.impuestoTerrenoMonto) : P.impuestoTerreno * r.totalIngresos;
  r.impuestosVentas = n(P.impuestosVentasMonto) > 0 ? n(P.impuestosVentasMonto) : P.impuestosVentas * r.totalIngresos;
  r.costosIndirectos = n(r.gastosAdmin) + r.comisiones + r.publicidad + r.impuestoTerreno +
    r.impuestosVentas + n(r.interes) + cInd;
  r.costoTotal = r.costosDirectos + r.costosIndirectos; r.costo_total = r.costoTotal;
  r.utilidad = r.totalIngresos - r.costoTotal;
  r.margen = r.totalIngresos ? r.utilidad / r.totalIngresos : 0;
  r.ctVendible = r.m2ConstTipo ? r.costoTotal / r.m2ConstTipo : 0;
  r.ctConstruccion = r.m2LoteTipo ? r.costoTotal / r.m2LoteTipo : 0;
  r.costo_m2_vendible = r.m2ConstTipo ? r.costoTotal / r.m2ConstTipo : 0;
}