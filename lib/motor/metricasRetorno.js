// ============================================================
// MÉTRICAS DE RETORNO — Prefacti
//
// Conecta el vector mensual que ya calcula flujoCaja.js con las métricas
// que pide un inversionista: TIR, VAN, payback, capital propio, múltiplo.
//
// REGLA DE ORO DE ESTE ARCHIVO: nada aquí toca el Master. No se recalcula
// margen, utilidad ni costo total; se LEEN del resultado que ya cuadra al
// centavo. Y si falta un dato para calcular una métrica, se devuelve null
// —nunca 0—: un 0 en una TIR se lee como "rentabilidad cero" cuando en
// realidad significa "no hay flujo cargado", y con ese número alguien
// compra mal un terreno.
//
// Tampoco se inventa cronograma: sin flujo configurado, `completo` es
// false y NO se calcula ninguna métrica temporal.
// ============================================================
import { calcularFlujoCaja, obraDelMaster, calcularSaldoCaja } from "./flujoCaja.js";
// Se importa la migración de params del panel a propósito: es la única
// fuente de verdad de cómo se leen los flujos guardados. Duplicarla aquí
// garantizaría que ambas copias se desincronicen.
import { derivarParamsGuardados } from "./useFlujoParams.js";

const n = (v) => {
  const x = typeof v === 'number' ? v : parseFloat(v);
  return isNaN(x) || !isFinite(x) ? 0 : x;
};

// Meses en que se escrituran los cierres cuando el flujo no modela la
// capa de caja. Es un supuesto, y por eso se declara en pantalla.
export const MESES_CIERRE_DEFAULT = 6;

export function hayFlujoConfigurado(datos) {
  if (!datos) return false;
  return !!datos.flujoParams || (datos.flujoActividades || []).length > 0;
}

// ---------- TIR ----------
// Newton-Raphson con respaldo en bisección. Antes de iterar se verifica
// que el flujo tenga UN SOLO cambio de signo: con varios, la ecuación
// puede tener más de una raíz y devolver la primera que aparezca sería
// presentar como TIR un número que no significa nada.
function cambiosDeSigno(v) {
  let cambios = 0;
  let signo = 0;
  v.forEach((x) => {
    if (Math.abs(x) < 1e-9) return;
    const s = x > 0 ? 1 : -1;
    if (signo !== 0 && s !== signo) cambios += 1;
    signo = s;
  });
  return cambios;
}

const van = (v, i) => v.reduce((a, x, m) => a + x / Math.pow(1 + i, m), 0);
const dVan = (v, i) => v.reduce((a, x, m) => a - (m * x) / Math.pow(1 + i, m + 1), 0);

// Intervalos donde el VAN cruza el cero: cada cruce es una TIR candidata.
// Se barre por tramos para poder distinguir la zona con sentido económico
// (tasa mensual ≥ 0) de las raíces matemáticas en tasas absurdas.
function cruces(v, lo, hi, pasos) {
  const out = [];
  let a = lo;
  let ya = van(v, a);
  for (let k = 1; k <= pasos; k += 1) {
    const b = lo + (k * (hi - lo)) / pasos;
    const yb = van(v, b);
    if (ya !== 0 && yb !== 0 && ya * yb < 0) out.push([a, b]);
    a = b;
    ya = yb;
  }
  return out;
}

// Resuelve la raíz dentro de un intervalo que ya se sabe que la contiene:
// Newton-Raphson (rápido) con respaldo en bisección, máximo 100 iteraciones
// cada uno. Dentro de un intervalo con cambio de signo la bisección no
// puede fallar, así que siempre hay respuesta.
function resolverEnRango(v, rango) {
  let i = (rango[0] + rango[1]) / 2;
  for (let k = 0; k < 100; k += 1) {
    const f = van(v, i);
    if (Math.abs(f) < 1e-7) return i;
    const d = dVan(v, i);
    if (!isFinite(d) || Math.abs(d) < 1e-12) break;
    const sig = i - f / d;
    if (!isFinite(sig) || sig < rango[0] || sig > rango[1]) break;
    if (Math.abs(sig - i) < 1e-12) return sig;
    i = sig;
  }
  let a = rango[0];
  let b = rango[1];
  let fa = van(v, a);
  let mid = a;
  for (let k = 0; k < 100; k += 1) {
    mid = (a + b) / 2;
    const fm = van(v, mid);
    if (Math.abs(fm) < 1e-7 || b - a < 1e-12) break;
    if (fa * fm < 0) { b = mid; } else { a = mid; fa = fm; }
  }
  return mid;
}

export function tirMensual(vector) {
  const v = vector || [];
  if (v.length < 2) return { valor: null, motivo: 'sin_flujo' };
  if (cambiosDeSigno(v) === 0) return { valor: null, motivo: 'sin_cambio_signo' };

  // Un flujo de proyecto casi siempre cambia de signo más de una vez
  // (capital de inicio, obra, cierre de ventas), y descartarlo por eso
  // dejaría sin TIR a proyectos perfectamente calculables. Lo que se hace
  // es buscar TODAS las raíces y quedarse solo con las que tienen sentido
  // financiero: aquellas donde el VAN va bajando (a más tasa, menos valor).
  // Las otras son artefactos matemáticos —el flujo empieza en positivo por
  // el capital de inicio— y devolver una de ellas sería inventar una TIR.
  const raices = [...cruces(v, 0, 1, 200), ...cruces(v, -0.95, 0, 200)]
    .map((r) => resolverEnRango(v, r))
    .filter((x) => dVan(v, x) < 0)
    .filter((x, idx, arr) => arr.findIndex((y) => Math.abs(y - x) < 1e-6) === idx);

  if (raices.length === 0) return { valor: null, motivo: 'no_converge' };
  // Dos tasas distintas anulan el VAN con la misma pendiente: la TIR es
  // ambigua y mostrar una de las dos sería elegir la que más conviene.
  if (raices.length > 1) return { valor: null, motivo: 'signos_multiples' };
  return { valor: raices[0], motivo: 'ok' };
}

const anualizar = (mensual) => (mensual == null ? null : Math.pow(1 + mensual, 12) - 1);

// ---------- VECTOR DEL INVERSIONISTA ----------
/**
 * Flujo neto mensual del proyecto desde el punto de vista de quien pone
 * el dinero. Se puede pasar `flujo`/`params` ya calculados (panel en vivo)
 * o dejar que se deriven de la versión guardada.
 * @returns {{vector:number[], supuestos:Array, completo:boolean}}
 */
export function construirFlujoInversionista(opts) {
  const o = opts || {};
  const datos = o.datos || {};
  const r = o.resultado || {};
  const supuestos = [];

  if (!hayFlujoConfigurado(datos) && !o.flujo) {
    return { vector: [], supuestos, completo: false, motivo: 'sin_flujo' };
  }

  const params = o.params || derivarParamsGuardados(datos);
  const obraMaster = obraDelMaster(datos, o.tipo, r);
  const ingresosMaster = n(r.totalIngresos);
  // El cierre amortiza la línea, así que el motor necesita los ingresos
  // del Master ANTES de calcular el interés. Sin esto, TIR y VAN se
  // computarían sobre un costo financiero subestimado.
  const flujo = o.flujo || calcularFlujoCaja(
    datos.flujoActividades || [],
    { ...params, montoObra: obraMaster },
    { ingresosMaster }
  );

  const costoTotal = n(r.costoTotal);
  if (ingresosMaster <= 0 || costoTotal <= 0 || flujo.totalCostos <= 0) {
    return { vector: [], supuestos, completo: false, motivo: 'sin_master' };
  }

  // --- Cierre de ventas ---
  // Si la capa de caja está encendida, el cierre ya está modelado y se usa
  // tal cual. Si no lo está, el ingreso final viene del Master y se reparte
  // en una ventana comercial supuesta. Ese supuesto se declara en pantalla.
  const caja = calcularSaldoCaja(flujo, params, { ingresosMaster });
  const yaCobrado = flujo.meses.reduce((a, m) => a + n(m.ingreso), 0);
  const cierreTotal = Math.max(0, ingresosMaster - yaCobrado);
  const mesInicioCierre = caja
    ? caja.mesInicioCierre
    : Math.max(1, Math.round(n(params.plazoObra)));
  const mesesCierre = caja
    ? caja.mesesCierre
    : Math.max(1, Math.round(n(params.cajaMeses)) || MESES_CIERRE_DEFAULT);

  const H = Math.max(flujo.horizonte, mesInicioCierre + mesesCierre);

  // --- Costos del Master que el flujo no reparte ---
  // El cronograma solo modela obra e indirectos de construcción. Terreno,
  // administración, comisiones, publicidad, impuestos e interés viven en
  // el Master. Se prorratean uniformemente: es un supuesto, no un dato.
  const otrosCostos = Math.max(0, costoTotal - n(flujo.totalCostos));
  const otrosPorMes = otrosCostos / H;

  const vector = [];
  const cierrePorMes = cierreTotal / mesesCierre;
  for (let m = 0; m < H; m += 1) {
    const base = flujo.meses[m] || { egreso: 0, ingreso: 0 };
    const cierre = caja
      ? n(caja.meses[m] && caja.meses[m].cierre)
      : (m >= mesInicioCierre && m < mesInicioCierre + mesesCierre ? cierrePorMes : 0);
    vector.push(n(base.ingreso) + cierre - n(base.egreso) - otrosPorMes);
  }

  supuestos.push(
    { k: 'ret.sup.egresos', p: { total: flujo.totalCostos, modo: flujo.modoEstandar ? 'estandar' : 'actividades' } },
    { k: 'ret.sup.otros', p: { monto: otrosCostos, meses: H } },
    { k: caja ? 'ret.sup.cierreCaja' : 'ret.sup.cierreSupuesto', p: { monto: cierreTotal, mes: mesInicioCierre, meses: mesesCierre } },
    { k: 'ret.sup.enObra', p: { monto: yaCobrado } },
    { k: 'ret.sup.capital', p: {} },
    { k: 'ret.sup.tasa', p: { tasa: n(o.tasaDescuento) || n(params.tasaAnual) } },
  );

  const sumaVector = vector.reduce((a, x) => a + x, 0);
  const utilidad = ingresosMaster - costoTotal;
  return {
    vector,
    supuestos,
    completo: true,
    motivo: null,
    horizonte: H,
    tasaAnual: n(params.tasaAnual),
    utilidad,
    // Identidad auditable: el vector debe sumar la utilidad del Master.
    identidad: { sumaVector, utilidad, cuadra: Math.abs(sumaVector - utilidad) < 1 },
  };
}

// ---------- MÉTRICAS ----------
export function calcularMetricasRetorno(opts) {
  const base = construirFlujoInversionista(opts);
  if (!base.completo) {
    return { ...base, metricas: null, acumulado: [], acumuladoDescontado: [] };
  }

  const v = base.vector;
  const tasaDescuento = n((opts || {}).tasaDescuento) || base.tasaAnual;
  const im = tasaDescuento / 12;

  const acumulado = [];
  const acumuladoDescontado = [];
  let ac = 0;
  let acd = 0;
  let minAc = Infinity;
  let mesMinAc = 0;
  let paybackSimple = null;
  let paybackDescontado = null;
  v.forEach((x, m) => {
    ac += x;
    acd += x / Math.pow(1 + im, m);
    acumulado.push(ac);
    acumuladoDescontado.push(acd);
    if (ac < minAc) { minAc = ac; mesMinAc = m; }
    if (paybackSimple == null && ac >= 0 && m > 0 && minAc < 0) paybackSimple = m;
    if (paybackDescontado == null && acd >= 0 && m > 0 && minAc < 0) paybackDescontado = m;
  });

  const tirM = tirMensual(v);
  const capitalPropioMax = minAc < 0 ? -minAc : 0;
  const multiplo = capitalPropioMax > 0 ? base.utilidad / capitalPropioMax : null;
  const anios = base.horizonte / 12;

  return {
    ...base,
    acumulado,
    acumuladoDescontado,
    metricas: {
      tirMensual: tirM.valor,
      tirAnual: anualizar(tirM.valor),
      tirMotivo: tirM.motivo,
      van: acd,
      tasaDescuento,
      paybackSimple,
      paybackDescontado,
      capitalPropioMax: capitalPropioMax > 0 ? capitalPropioMax : null,
      mesCapitalPropioMax: capitalPropioMax > 0 ? mesMinAc : null,
      multiploCapital: multiplo,
      roeProyecto: multiplo != null && anios > 0 ? multiplo / anios : null,
    },
  };
}

// Aplana las métricas sobre el resultado del Master para que el catálogo
// del analizador y los comparadores las lean como cualquier otra métrica.
// Sin flujo, todos los campos quedan en null (nunca en 0).
export function conMetricasRetorno(datos, resultado, tipo) {
  if (!resultado) return resultado;
  const vacio = {
    tirAnual: null, vanProyecto: null, paybackMeses: null, paybackDescontadoMeses: null,
    capitalPropioMax: null, multiploCapital: null, roeProyecto: null, retornoCompleto: false,
  };
  try {
    const res = calcularMetricasRetorno({ datos, resultado, tipo });
    if (!res.completo || !res.metricas) return { ...resultado, ...vacio };
    const m = res.metricas;
    return {
      ...resultado,
      tirAnual: m.tirAnual,
      vanProyecto: m.van,
      paybackMeses: m.paybackSimple,
      paybackDescontadoMeses: m.paybackDescontado,
      capitalPropioMax: m.capitalPropioMax,
      multiploCapital: m.multiploCapital,
      roeProyecto: m.roeProyecto,
      retornoCompleto: true,
    };
  } catch {
    // Un fallo aquí jamás debe tumbar la vista de factibilidad.
    return { ...resultado, ...vacio };
  }
}