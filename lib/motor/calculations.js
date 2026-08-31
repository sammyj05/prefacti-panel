// ============================================================
// Motor de cálculo — Control de Factibilidades Pacific Hills
// Fórmulas validadas AL CENTAVO contra los Master Finanzas.
// NO modificar sin revalidar contra los Excel de origen.
// ============================================================

import { getSimboloMoneda } from "./localizacion.js";
import { aplicarCustomTorreResultado, aplicarCustomCasasResultado, getMasterCustom } from "./masterCustom.js";
import { usaEtapas, etapasCalculables } from "./casasEtapas.js";

const num = (v) => {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};
const tieneValor = (v) => v !== undefined && v !== '' && v !== null;
// Si se provee un monto fijo (>0) lo usa directamente; si no, aplica el cálculo porcentual
const montoOFijo = (monto, pctCalc) => (tieneValor(monto) && num(monto) > 0 ? num(monto) : pctCalc);

// Parámetros porcentuales por defecto
export const PARAMS_TORRE = {
  descuento: 0.02, imprevistos: 0.03, gastosAdmin: 0.03, comisiones: 0.03,
  publicidad: 0.01, impuestoTerreno: 0.01, impuestosVentas: 0.045,
  gastosAdminMonto: 0, comisionesMonto: 0, publicidadMonto: 0,
  impuestoTerrenoMonto: 0, impuestosVentasMonto: 0,
};
export const PARAMS_CASAS = {
  descuento: 0.02, imprevistos: 0.03, gastosAdmin: 0.03, comisiones: 0.015,
  publicidad: 0.01, impuestoTerreno: 0.01, impuestosVentas: 0.045,
  gastosAdminMonto: 0, comisionesMonto: 0, publicidadMonto: 0,
  impuestoTerrenoMonto: 0, impuestosVentasMonto: 0,
};

export function calcularFactibilidad(datos, tipo) {
  if (!datos) return resultadoVacio();
  const custom = getMasterCustom(datos).custom || [];
  if (tipo === 'torre') {
    const P = { ...PARAMS_TORRE, ...(datos.params || {}) };
    const r = calcularTorre(datos.inputs || {}, P);
    if (custom.length) aplicarCustomTorreResultado(r, custom, P, datos.inputs || {});
    return r;
  }
  if (tipo === 'casas') {
    const params = { ...PARAMS_CASAS, ...(datos.params || {}) };
    const ctx = {
      precioListaM2: num(datos.precioListaM2),
      pctDescuento: tieneValor(datos.pctDescuento) ? num(datos.pctDescuento) : params.descuento,
    };
    // Las etapas son el corazón de la factibilidad: si existen, el total del
    // proyecto sale de ellas y los modelos sólo sirven para el desglose.
    const items = usaEtapas(datos) ? etapasCalculables(datos) : (datos.modelos || []);
    const r = calcularCasasGlobal(items, params, ctx, datos.ingresosExtras || []);
    if (custom.length) aplicarCustomCasasResultado(r, custom, params);
    return r;
  }
  return resultadoVacio();
}

function resultadoVacio() {
  return {
    totalIngresos: 0, costosDirectos: 0, costosIndirectos: 0, costoTotal: 0, terreno: 0,
    utilidad: 0, margen: 0, precioListaM2: 0, precioNetoM2: 0,
    ctVendible: 0, ctConstruccion: 0,
    total_ingresos: 0, costo_total: 0, precio_m2_vendible: 0, costo_m2_vendible: 0,
  };
}

// ---------------- TORRE ----------------
export function calcularTorre(inp, p = PARAMS_TORRE) {
  const areaConstruccion = num(inp.areaConstruccion);
  const cantApt = num(inp.cantApartamentos);
  const areaApt = num(inp.areaVentaApt);
  const areaLocales = num(inp.areaVentaLocales);

  // Ingresos adicionales (extras) con valor manual
  const ingresosExtrasList = Array.isArray(inp.ingresosExtras) ? inp.ingresosExtras : [];
  const ingresosExtras = ingresosExtrasList.reduce((a, e) => a + num(e.valor), 0);

  // Precio (manual) — con compatibilidad hacia atrás
  let precioListaM2 = num(inp.precioListaM2);
  const pctDesc = tieneValor(inp.pctDescuento) ? num(inp.pctDescuento) : p.descuento;
  const m2PorUnidad = cantApt ? areaApt / cantApt : 0;

  // Hipótesis comercial · Vendido (manual)
  const unidadesVendidas = num(inp.unidadesVendidas);
  const m2Vendidos = num(inp.m2Vendidos);
  const ventaApartamentos = num(inp.ventaApartamentos);
  const ventaEstacVend = num(inp.ventaEstacVend);
  const ventaDepositosVend = num(inp.ventaDepositosVend);
  const ventaLocalesVend = num(inp.ventaLocalesVend);

  // Calculados: Por vender
  const m2PorVender = Math.max(0, areaApt - m2Vendidos);
  const unidadesPorVender = Math.max(0, cantApt - unidadesVendidas);

  // Ingresos apartamentos = TODA el área de venta a precio de lista.
  // Lo ya vendido es una hipótesis comercial y no cambia el ingreso a precio
  // de lista del proyecto (antes se valoraba sólo lo por vender, lo que bajaba
  // el ingreso y aplicaba el descuento sobre una base parcial).
  // Compatibilidad: si no hay precioListaM2, derivarlo del ingreso disponible.
  let ingresosApt;
  if (precioListaM2 === 0 && tieneValor(inp.ingresosApt)) {
    // Dato viejo: ingresosApt manual
    ingresosApt = num(inp.ingresosApt);
  } else if (precioListaM2 === 0 && m2Vendidos > 0 && ventaApartamentos > 0) {
    // Sin precio pero hay m² vendidos: derivar del precio promedio vendido
    precioListaM2 = ventaApartamentos / m2Vendidos;
    ingresosApt = precioListaM2 * areaApt;
  } else if (precioListaM2 === 0 && ventaApartamentos > 0) {
    // Sin precio ni m² vendidos: ventaApartamentos es el ingreso total a precio lista
    ingresosApt = ventaApartamentos;
  } else {
    ingresosApt = precioListaM2 * areaApt;
  }
  // Derivar precioListaM2 si falta, para que precioNetoM2 y los KPIs sean correctos
  if (precioListaM2 === 0 && areaApt > 0 && ingresosApt > 0) {
    precioListaM2 = ingresosApt / areaApt;
  }
  const precioNetoM2 = precioListaM2 * (1 - pctDesc);
  const descuentoM2 = precioListaM2 - precioNetoM2;
  // El descuento se aplica sobre el ingreso completo de apartamentos.
  const descuentos = -(ingresosApt * pctDesc);

  // Ingresos locales/depósitos/estac (montos directos)
  const ingresosLocales = num(inp.ingresosLocales);
  const ingresosDepositos = num(inp.ingresosDepositos);
  const ingresosEstac = num(inp.ingresosEstac);

  const totalIngresos = ingresosApt + descuentos + ingresosLocales + ingresosDepositos + ingresosEstac + ingresosExtras;

  // Precios unitarios
  const precioListaUnidad = cantApt ? ingresosApt / cantApt : 0;
  const precioNetoUnidad = precioListaUnidad * (1 - pctDesc);

  // Costos
  const costoConstruccion = num(inp.costoConstruccion);
  const costosPromotora = num(inp.costosPromotora);
  const imprevistos = tieneValor(inp.imprevistos)
    ? num(inp.imprevistos)
    : p.imprevistos * (costoConstruccion + costosPromotora);
  const valorTerreno = num(inp.valorTerreno);

  const costosDirectos = costoConstruccion + costosPromotora + imprevistos + valorTerreno;

  const gastosAdmin = montoOFijo(p.gastosAdminMonto, p.gastosAdmin * (costosDirectos - valorTerreno));
  const comisiones = montoOFijo(p.comisionesMonto, p.comisiones * totalIngresos);
  const publicidad = montoOFijo(p.publicidadMonto, p.publicidad * totalIngresos);
  const impuestoTerreno = montoOFijo(p.impuestoTerrenoMonto, p.impuestoTerreno * totalIngresos);
  const impuestosVentas = montoOFijo(p.impuestosVentasMonto, p.impuestosVentas * totalIngresos);
  const interes = num(inp.interesBancario);
  const apartamentoModelo = num(inp.apartamentoModelo);
  const cuotaMantenimiento = num(inp.cuotaMantenimiento);
  const garantias = num(inp.garantias);

  const costosIndirectos = gastosAdmin + comisiones + publicidad + impuestoTerreno +
    impuestosVentas + interes + apartamentoModelo + cuotaMantenimiento + garantias;

  const costoTotal = costosDirectos + costosIndirectos;
  const utilidad = totalIngresos - costoTotal;
  const margen = totalIngresos ? utilidad / totalIngresos : 0;

  // Áreas
  const areaVendible = areaApt + areaLocales;

  // Totales vendido / por vender
  const totalVendido = ventaApartamentos + ventaEstacVend + ventaDepositosVend + ventaLocalesVend;
  const ventaAptDisp = m2PorVender * precioNetoM2;
  const ventaEstacDisp = Math.max(0, ingresosEstac - ventaEstacVend);
  const ventaDepositosDisp = Math.max(0, ingresosDepositos - ventaDepositosVend);
  const ventaLocalesDisp = Math.max(0, ingresosLocales - ventaLocalesVend);
  const totalPorVender = ventaAptDisp + ventaEstacDisp + ventaDepositosDisp + ventaLocalesDisp;

  // Porcentajes
  const pctVendido = areaApt ? m2Vendidos / areaApt : 0;
  const pctPorVender = 1 - pctVendido;

  // Precios promedio
  const precioVendidoM2 = m2Vendidos ? ventaApartamentos / m2Vendidos : 0;
  const precioPorVenderM2 = m2PorVender
    ? ((precioListaM2 * areaApt) - ventaApartamentos) / m2PorVender
    : 0;

  // Tiempo transcurrido y ritmo actual
  const fechaPreventa = inp.fechaPreventa;
  const hoy = new Date();
  const tiempoTranscurrido = fechaPreventa
    ? Math.max(0, (hoy - new Date(fechaPreventa + 'T00:00:00')) / (1000 * 60 * 60 * 24 * 30.5))
    : 0;
  const ritmoActual = tiempoTranscurrido > 0 ? unidadesVendidas / tiempoTranscurrido : 0;

  // Construcción y absorción
  const periodoConstruccion = num(inp.periodoConstruccion);

  const puntoEquilibrio = precioNetoUnidad ? costoTotal / precioNetoUnidad : 0;
  const pendientesAntes = Math.max(0, puntoEquilibrio - unidadesVendidas);
  const porVenderPosterior = Math.max(0, cantApt - unidadesVendidas - pendientesAntes);
  const ritmoObjetivo = (periodoConstruccion + 3) > 0
    ? pendientesAntes / (periodoConstruccion + 3)
    : 0;

  // Fecha absorción = permiso + (porVenderPosterior / ritmoObjetivo) * 30.5 días
  const permisoOcupacion = inp.permisoOcupacion;
  let fechaAbsorcion = '';
  let absorcion = 0;
  if (permisoOcupacion && ritmoObjetivo > 0) {
    const permisoDate = new Date(permisoOcupacion + 'T00:00:00');
    const diasAbsorcion = (porVenderPosterior / ritmoObjetivo) * 30.5;
    const fechaAbs = new Date(permisoDate.getTime() + diasAbsorcion * 86400000);
    fechaAbsorcion = fechaAbs.toISOString().split('T')[0];
    if (fechaPreventa) {
      const diasTotales = (fechaAbs - new Date(fechaPreventa + 'T00:00:00')) / 86400000;
      absorcion = diasTotales / 30.5 / 12;
    }
  }

  return {
    // Ingresos
    descuentos, totalIngresos, ingresosApt, ingresosLocales, ingresosDepositos, ingresosEstac,
    ingresosExtras,
    // Costos
    imprevistos, costosDirectos, costosPromotora, gastosAdmin, comisiones, publicidad,
    terreno: valorTerreno,
    impuestoTerreno, impuestosVentas, apartamentoModelo, cuotaMantenimiento, garantias, interes,
    costosIndirectos, costoTotal, utilidad, margen,
    // Precios
    precioListaM2, descuentoM2, precioNetoM2, pctDescuento: pctDesc,
    precioListaUnidad, precioNetoUnidad,
    // Áreas
    cdArea: areaConstruccion ? costosDirectos / areaConstruccion : 0,
    ctVendible: areaVendible ? costoTotal / areaVendible : 0,
    ctConstruccion: areaConstruccion ? costoTotal / areaConstruccion : 0,
    areaConstruccion, areaVendible,
    // Comercial — vendido
    m2Vendidos, unidadesVendidas, ventaApartamentos, ventaEstacVend, ventaDepositosVend,
    ventaLocalesVend, totalVendido, pctVendido, precioVendidoM2, tiempoTranscurrido, ritmoActual,
    // Comercial — por vender
    unidadesPorVender, m2PorVender, pctPorVender, precioPorVenderM2,
    ritmoObjetivo, ventaAptDisp, ventaEstacDisp, ventaDepositosDisp, ventaLocalesDisp,
    totalPorVender,
    // Construcción y absorción
    periodoConstruccion, puntoEquilibrio, pendientesAntes, porVenderPosterior,
    fechaAbsorcion, absorcion,
    // alias compatibles
    total_ingresos: totalIngresos, costo_total: costoTotal,
    precio_m2_vendible: precioNetoM2,
    costo_m2_vendible: areaVendible ? costoTotal / areaVendible : 0,
  };
}

// ---------------- TORRE · FASES (varias torres en un proyecto) ----------------
// Cada fase tiene la misma estructura de inputs que una torre individual.
// El total es la suma de las fases, con los promedios recalculados.
export function calcularTorreFases(fases, p = PARAMS_TORRE) {
  const parts = (fases || []).map((f) => ({
    nombre: f?.nombre || '',
    ...calcularTorre(f?.inputs || {}, p),
  }));
  const s = (k) => parts.reduce((a, x) => a + (num(x[k]) || 0), 0);

  const totalIngresos = s('totalIngresos');
  const costoTotal = s('costoTotal');
  const areaConstruccion = s('areaConstruccion');
  const areaVendible = s('areaVendible');
  const areaApt = s('m2Vendidos') + s('m2PorVender');
  const cantApt = s('unidadesVendidas') + s('unidadesPorVender');
  const ingresosApt = s('ingresosApt');
  const costosDirectos = s('costosDirectos');
  const terreno = s('terreno');
  const utilidad = totalIngresos - costoTotal;

  const precioListaM2 = areaApt ? ingresosApt / areaApt : 0;
  const pctDesc = ingresosApt ? Math.abs(s('descuentos')) / ingresosApt : p.descuento;
  const precioNetoM2 = precioListaM2 * (1 - pctDesc);
  const precioListaUnidad = cantApt ? ingresosApt / cantApt : 0;

  return {
    parts,
    ingresosApt, descuentos: s('descuentos'), ingresosLocales: s('ingresosLocales'),
    ingresosDepositos: s('ingresosDepositos'), ingresosEstac: s('ingresosEstac'),
    ingresosExtras: s('ingresosExtras'), totalIngresos,
    costosPromotora: s('costosPromotora'), imprevistos: s('imprevistos'),
    terreno, costosDirectos, gastosAdmin: s('gastosAdmin'), comisiones: s('comisiones'),
    publicidad: s('publicidad'), impuestoTerreno: s('impuestoTerreno'),
    impuestosVentas: s('impuestosVentas'), interes: s('interes'),
    apartamentoModelo: s('apartamentoModelo'), cuotaMantenimiento: s('cuotaMantenimiento'),
    garantias: s('garantias'), costosIndirectos: s('costosIndirectos'),
    costoTotal, utilidad, margen: totalIngresos ? utilidad / totalIngresos : 0,
    precioListaM2, precioNetoM2, descuentoM2: precioListaM2 - precioNetoM2,
    pctDescuento: pctDesc, precioListaUnidad, precioNetoUnidad: precioListaUnidad * (1 - pctDesc),
    areaConstruccion, areaVendible, cantApartamentos: cantApt, areaVentaApt: areaApt,
    cdArea: areaConstruccion ? costosDirectos / areaConstruccion : 0,
    ctVendible: areaVendible ? costoTotal / areaVendible : 0,
    ctConstruccion: areaConstruccion ? costoTotal / areaConstruccion : 0,
    m2Vendidos: s('m2Vendidos'), m2PorVender: s('m2PorVender'),
    unidadesVendidas: s('unidadesVendidas'), unidadesPorVender: s('unidadesPorVender'),
    totalVendido: s('totalVendido'), totalPorVender: s('totalPorVender'),
    total_ingresos: totalIngresos, costo_total: costoTotal,
    precio_m2_vendible: precioNetoM2,
    costo_m2_vendible: areaVendible ? costoTotal / areaVendible : 0,
  };
}

// Campos de torre que se suman entre fases (el resto son precios/fechas).
export const CAMPOS_SUMABLES_TORRE = [
  'areaConstruccion', 'cantApartamentos', 'areaVentaApt', 'areaVentaLocales',
  'ingresosLocales', 'ingresosDepositos', 'ingresosEstac',
  'costoConstruccion', 'costosPromotora', 'valorTerreno', 'interesBancario',
  'apartamentoModelo', 'cuotaMantenimiento', 'garantias',
  'unidadesVendidas', 'm2Vendidos', 'ventaApartamentos', 'ventaEstacVend',
  'ventaDepositosVend', 'ventaLocalesVend',
];

// Consolida los inputs de las fases en los datos del proyecto (vista global).
export function consolidarFasesTorre(datos) {
  const fases = datos?.fases || [];
  if (!fases.length) return datos;
  const base = { ...(datos.inputs || {}) };
  CAMPOS_SUMABLES_TORRE.forEach((k) => {
    base[k] = fases.reduce((a, f) => a + num(f?.inputs?.[k]), 0);
  });
  // Precio de lista ponderado por los m² de venta de cada fase.
  const m2 = fases.reduce((a, f) => a + num(f?.inputs?.areaVentaApt), 0);
  if (m2 > 0) {
    const ingresos = fases.reduce(
      (a, f) => a + num(f?.inputs?.precioListaM2) * num(f?.inputs?.areaVentaApt), 0,
    );
    base.precioListaM2 = +(ingresos / m2).toFixed(2);
  }
  return { ...datos, inputs: base };
}

export function faseVaciaTorre(nombre = '') {
  return { nombre, inputs: { ...defaultDatosTorre().inputs } };
}

// ---------------- CASAS ----------------
// Sirve igual para un MODELO o una ETAPA (misma estructura de campos)
export function calcularItemCasas(f, p = PARAMS_CASAS, ctx = {}) {
  const ingresos = num(f.ingresosViv);
  // El % de descuento del proyecto (ctx) manda; el parámetro global es el respaldo.
  const pctDescItem = tieneValor(ctx.pctDescuento) ? num(ctx.pctDescuento) : p.descuento;
  // Solo un monto de descuento capturado (> 0) sustituye al cálculo por %.
  // Un 0 o un campo vacío significan "usar el %", igual en modelos y en etapas.
  const descuentos = num(f.descuentoViv) > 0
    ? -Math.abs(num(f.descuentoViv))
    : -pctDescItem * ingresos;
  const totalIngresos = ingresos + descuentos;

  const cant = num(f.cantViviendas);
  const m2ConstViv = num(f.m2ConstViv);
  const m2LoteViv = num(f.m2LoteViv);
  const m2ConstTipo = cant * m2ConstViv;   // metros CONSTRUIDOS
  const m2LoteTipo = cant * m2LoteViv;     // metros de LOTE

  const cc = num(f.costoConstTipo);
  const cind = num(f.costoIndTipo);
  const imprevistos = tieneValor(f.imprevistos)
    ? num(f.imprevistos)
    : p.imprevistos * (cc + cind);

  const infraO = num(f.infraOriginario);
  const infraV = num(f.infraVida);
  const terreno = num(f.valorTerreno);

  const costosDirectos = cc + cind + imprevistos + infraO + infraV + terreno;

  // Gastos administrativos: SIEMPRE el % del proyecto sobre la misma base
  // (costo de construcción + costos indirectos de obra + imprevistos), tanto
  // en modelos como en etapas, para que ambas vistas del Master cuadren.
  const gastosAdmin = p.gastosAdmin * (cc + cind + imprevistos);
  const comisiones = p.comisiones * totalIngresos;
  const publicidad = p.publicidad * totalIngresos;
  const impuestoTerreno = p.impuestoTerreno * totalIngresos;
  const impuestosVentas = p.impuestosVentas * totalIngresos;
  const interes = num(f.interesBancario);

  const costosIndirectos = gastosAdmin + comisiones + publicidad + impuestoTerreno +
    impuestosVentas + interes;
  const costoTotal = costosDirectos + costosIndirectos;
  const utilidad = totalIngresos - costoTotal;

  // Precio por M² calculado desde los ingresos reales del modelo:
  // lista = ingresos brutos / m² construidos; neto = ingresos netos / m² construidos.
  const pctDesc = pctDescItem;
  const precioListaM2 = m2ConstTipo ? ingresos / m2ConstTipo : 0;
  const precioNetoM2 = m2ConstTipo ? totalIngresos / m2ConstTipo : 0;
  const descuentoM2 = precioListaM2 - precioNetoM2;

  return {
    nombre: f.nombre, cantViviendas: cant, m2ConstViv, m2LoteViv, m2ConstTipo, m2LoteTipo,
    ingresos, descuentos, totalIngresos,
    precioListaM2, descuentoM2, precioNetoM2, pctDescuento: pctDesc,
    precioListaUnidad: precioListaM2 * m2ConstViv,
    descuentoUnidad: descuentoM2 * m2ConstViv,
    precioNetoUnidad: precioNetoM2 * m2ConstViv,
    costoConst: cc, costoInd: cind, imprevistos, infraO, infraV, terreno,
    costosDirectos, gastosAdmin, comisiones, publicidad, impuestoTerreno,
    impuestosVentas, interes, costosIndirectos, costoTotal, utilidad,
    margen: totalIngresos ? utilidad / totalIngresos : 0,
    // ATENCIÓN: áreas cruzadas respecto a lo intuitivo
    ctVendible: m2ConstTipo ? costoTotal / m2ConstTipo : 0,      // vendible = construidos
    ctConstruccion: m2LoteTipo ? costoTotal / m2LoteTipo : 0,    // construcción = lotes
  };
}

// Suma de modelos (o etapas) = TOTAL PROYECTO
export function calcularCasasGlobal(items, p = PARAMS_CASAS, ctx = {}, extras = []) {
  const parts = (items || []).map((f) => calcularItemCasas(f, p, ctx));
  // Si se provee un monto fijo global para un costo indirecto, se escala
  // proporcionalmente entre los modelos según el cálculo porcentual original.
  const escalarMonto = (key, monto) => {
    if (!tieneValor(monto) || num(monto) <= 0) return;
    const suma = parts.reduce((a, x) => a + (x[key] || 0), 0);
    if (suma > 0) {
      const f = num(monto) / suma;
      parts.forEach((x) => { x[key] = (x[key] || 0) * f; });
    } else if (parts.length) {
      parts[0][key] = num(monto);
    }
  };
  escalarMonto('gastosAdmin', p.gastosAdminMonto);
  escalarMonto('comisiones', p.comisionesMonto);
  escalarMonto('publicidad', p.publicidadMonto);
  escalarMonto('impuestoTerreno', p.impuestoTerrenoMonto);
  escalarMonto('impuestosVentas', p.impuestosVentasMonto);
  parts.forEach((x) => {
    x.costosIndirectos = (x.gastosAdmin || 0) + (x.comisiones || 0) + (x.publicidad || 0) +
      (x.impuestoTerreno || 0) + (x.impuestosVentas || 0) + (x.interes || 0);
    x.costoTotal = (x.costosDirectos || 0) + x.costosIndirectos;
    x.utilidad = (x.totalIngresos || 0) - x.costoTotal;
    x.margen = x.totalIngresos ? x.utilidad / x.totalIngresos : 0;
  });
  const s = (k) => parts.reduce((a, x) => a + (x[k] || 0), 0);

  const ingresosExtrasList = Array.isArray(extras) ? extras : [];
  const ingresosExtras = ingresosExtrasList.reduce((a, e) => a + num(e.valor), 0);
  const totalIngresos = s('totalIngresos') + ingresosExtras;
  const costoTotal = s('costoTotal');
  const m2ConstTipo = s('m2ConstTipo');
  const m2LoteTipo = s('m2LoteTipo');
  const cant = s('cantViviendas');

  const pctDesc = tieneValor(ctx.pctDescuento) ? num(ctx.pctDescuento) : p.descuento;
  const precioListaM2 = m2ConstTipo ? s('ingresos') / m2ConstTipo : 0;
  const precioNetoM2 = m2ConstTipo ? totalIngresos / m2ConstTipo : 0;
  const descuentoM2 = precioListaM2 - precioNetoM2;
  const m2PorViv = cant ? m2ConstTipo / cant : 0;

  return {
    parts, cantViviendas: cant, m2ConstTipo, m2LoteTipo, m2ConstViv: m2PorViv,
    m2LoteViv: cant ? m2LoteTipo / cant : 0,
    ingresos: s('ingresos'), descuentos: s('descuentos'), totalIngresos,
    ingresosExtras,
    precioListaM2, descuentoM2, precioNetoM2, pctDescuento: pctDesc,
    precioListaUnidad: precioListaM2 * m2PorViv,
    descuentoUnidad: descuentoM2 * m2PorViv,
    precioNetoUnidad: precioNetoM2 * m2PorViv,
    costoConst: s('costoConst'), costoInd: s('costoInd'), imprevistos: s('imprevistos'),
    infraO: s('infraO'), infraV: s('infraV'), terreno: s('terreno'),
    costosDirectos: s('costosDirectos'), gastosAdmin: s('gastosAdmin'),
    comisiones: s('comisiones'), publicidad: s('publicidad'),
    impuestoTerreno: s('impuestoTerreno'), impuestosVentas: s('impuestosVentas'),
    interes: s('interes'), costosIndirectos: s('costosIndirectos'),
    costoTotal, utilidad: totalIngresos - costoTotal,
    margen: totalIngresos ? (totalIngresos - costoTotal) / totalIngresos : 0,
    ctVendible: m2ConstTipo ? costoTotal / m2ConstTipo : 0,
    ctConstruccion: m2LoteTipo ? costoTotal / m2LoteTipo : 0,
    total_ingresos: totalIngresos, costo_total: costoTotal,
    precio_m2_vendible: precioNetoM2,
    costo_m2_vendible: m2ConstTipo ? costoTotal / m2ConstTipo : 0,
  };
}

// Contexto de precios de una versión de casas
export function contextoPrecios(datos, params) {
  const p = { ...PARAMS_CASAS, ...(params || datos?.params || {}) };
  return {
    precioListaM2: num(datos?.precioListaM2),
    pctDescuento: tieneValor(datos?.pctDescuento) ? num(datos.pctDescuento) : p.descuento,
  };
}

// ---------------- CASAS: Comercial ----------------
// Calcula los campos derivados de la hipótesis comercial y absorción
// a partir de los inputs manuales + el resultado financiero global.
export function calcularComercialCasas(comercial, resultado) {
  const com = comercial || {};
  const r = resultado || {};

  const totalUnidades = num(r.cantViviendas);
  const m2ConstTotal = num(r.m2ConstTipo);
  const totalIngresos = num(r.totalIngresos);
  const costoTotal = num(r.costoTotal);
  const precioNetoUnidad = num(r.precioNetoUnidad);

  const unidadesVendidas = num(com.unidadesVendidas);
  const m2Vendidos = num(com.m2Vendidos);
  const totalVendido = num(com.totalVendido);
  const ritmoObjetivo = num(com.ritmoObjetivo);
  const periodoConstruccion = num(com.periodoConstruccion);
  const fechaPreventa = com.fechaPreventa;
  const inicioConstruccion = com.inicioConstruccion;

  // Calculados
  const unidadesPorVender = Math.max(0, totalUnidades - unidadesVendidas);
  const m2PorVender = Math.max(0, m2ConstTotal - m2Vendidos);
  const pctVendido = m2ConstTotal ? m2Vendidos / m2ConstTotal : 0;
  const pctPorVender = 1 - pctVendido;
  const totalPorVender = Math.max(0, totalIngresos - totalVendido);
  const precioVendidoM2 = m2Vendidos ? totalVendido / m2Vendidos : 0;

  // Tiempo y ritmo
  const hoy = new Date();
  const tiempoTranscurrido = fechaPreventa
    ? Math.max(0, (hoy - new Date(fechaPreventa + 'T00:00:00')) / (1000 * 60 * 60 * 24 * 30.5))
    : 0;
  const ritmoActual = tiempoTranscurrido > 0 ? unidadesVendidas / tiempoTranscurrido : 0;

  // Punto de equilibrio (fecha) = inicio + periodo * 30.5
  let permisoEquilibrio = '';
  if (inicioConstruccion) {
    const inicioDate = new Date(inicioConstruccion + 'T00:00:00');
    const permisoDate = new Date(inicioDate.getTime() + periodoConstruccion * 30.5 * 86400000);
    permisoEquilibrio = permisoDate.toISOString().split('T')[0];
  }

  // Pendientes = costoTotal / precioNetoUnidad - vendidas
  const pendientesAntes = precioNetoUnidad
    ? Math.max(0, costoTotal / precioNetoUnidad - unidadesVendidas)
    : 0;
  const porVenderPosterior = Math.max(0, totalUnidades - unidadesVendidas - pendientesAntes);

  // Fecha absorción = permiso + (porVenderPosterior / ritmoObjetivo) * 30.5
  let fechaAbsorcion = '';
  let absorcion = 0;
  if (permisoEquilibrio && ritmoObjetivo > 0) {
    const permisoDate = new Date(permisoEquilibrio + 'T00:00:00');
    const diasAbs = (porVenderPosterior / ritmoObjetivo) * 30.5;
    const fechaAbs = new Date(permisoDate.getTime() + diasAbs * 86400000);
    fechaAbsorcion = fechaAbs.toISOString().split('T')[0];
    if (fechaPreventa) {
      const diasTotales = (fechaAbs - new Date(fechaPreventa + 'T00:00:00')) / 86400000;
      absorcion = diasTotales / 30.5 / 12;
    }
  }

  return {
    fechaPreventa, unidadesVendidas, m2Vendidos, totalVendido, ritmoObjetivo,
    inicioConstruccion, periodoConstruccion,
    // Calculados
    ritmoActual, unidadesPorVender, m2PorVender, pctVendido, pctPorVender,
    totalPorVender, precioVendidoM2, tiempoTranscurrido,
    permisoEquilibrio, pendientesAntes, porVenderPosterior,
    fechaAbsorcion, absorcion,
  };
}

// ---------------- Plantillas vacías ----------------
export function defaultDatosTorre() {
  return {
    params: { ...PARAMS_TORRE },
    inputs: {
      areaConstruccion: 0, cantApartamentos: 0, areaVentaApt: 0, areaVentaLocales: 0,
      precioListaM2: 0, pctDescuento: 0.02,
      ingresosLocales: 0, ingresosDepositos: 0, ingresosEstac: 0,
      costoConstruccion: 0, costosPromotora: 0, imprevistos: '',
      valorTerreno: 0, interesBancario: 0, apartamentoModelo: 0, cuotaMantenimiento: 0,
      garantias: 0,
      fechaPreventa: '', unidadesVendidas: 0, m2Vendidos: 0,
      ventaApartamentos: 0, ventaEstacVend: 0, ventaDepositosVend: 0, ventaLocalesVend: 0,
      inicioConstruccion: '', permisoOcupacion: '', periodoConstruccion: 0,
      ingresosExtras: [],
    },
    fases: [],
  };
}

export function defaultDatosCasas() {
  return {
    params: { ...PARAMS_CASAS },
    precioListaM2: 0,
    pctDescuento: 0.02,
    ingresosExtras: [],
    modelos: [itemVacioCasas('Modelo 1')],
    etapas: [],
    comercial: {
      fechaPreventa: '', unidadesVendidas: 0, m2Vendidos: 0,
      totalVendido: 0, ritmoObjetivo: 0,
      inicioConstruccion: '', periodoConstruccion: 0,
    },
  };
}

export function itemVacioCasas(nombre = '') {
  return {
    nombre, cantViviendas: 0, m2LoteViv: 0, m2ConstViv: 0, ingresosViv: 0,
    precioUnidad: 0, descuentoViv: 0, costoConstTipo: 0, costoIndTipo: 0, imprevistos: '',
    infraOriginario: 0, infraVida: 0, valorTerreno: 0, interesBancario: 0,
    reparto: {},
  };
}

// ---------------- Formato ----------------
export function formatCurrency(value) {
  if (value == null || isNaN(value)) return '—';
  const neg = value < 0;
  const abs = Math.abs(value);
  const decimals = abs >= 100000 ? 0 : 2;
  const sym = (typeof getSimboloMoneda === 'function' && getSimboloMoneda()) || '$';
  const s = sym + new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(abs);
  return neg ? '(' + s + ')' : s;
}

export function formatNumber(value, decimals = 2) {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(value);
}

export function formatInt(value) {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

// El margen y todos los porcentajes se muestran con 2 decimales
export function formatPercent(value) {
  if (value == null || isNaN(value)) return '—';
  return (value * 100).toFixed(2) + '%';
}

export function margenColor(margen) {
  if (margen >= 0.25) return 'text-positive';
  if (margen >= 0.10) return 'text-warning';
  return 'text-negative';
}

// Métricas de área para el panel: metraje de construcción, metraje de venta
// y ratio de eficiencia (venta / construcción).
export function metricasArea(resultado, tipo) {
  const r = resultado || {};
  let construccion, venta;
  if (tipo === 'casas') {
    construccion = num(r.m2LoteTipo);
    venta = num(r.m2ConstTipo);
  } else {
    construccion = num(r.areaConstruccion);
    venta = num(r.areaVendible);
  }
  return { construccion, venta, ratio: construccion > 0 ? venta / construccion : 0 };
}

// Métricas comerciales unificadas (vendido / por vender) para torre y casas.
// En torre vienen incluidas en `resultado`; en casas se calculan aparte a
// partir de datos.comercial. Devuelve siempre el mismo shape para las tarjetas.
export function metricasComercial(resultado, datos, tipo) {
  const r = resultado || {};
  if (tipo === 'casas') {
    return calcularComercialCasas(datos?.comercial, r);
  }
  return {
    totalVendido: r.totalVendido, totalPorVender: r.totalPorVender,
    pctVendido: r.pctVendido, pctPorVender: r.pctPorVender,
    m2Vendidos: r.m2Vendidos, m2PorVender: r.m2PorVender,
    unidadesVendidas: r.unidadesVendidas, unidadesPorVender: r.unidadesPorVender,
    ritmoActual: r.ritmoActual, absorcion: r.absorcion,
  };
}