// Catálogo ÚNICO de variables simulables. El simulador de escenarios, el
// tornado de sensibilidad y los escenarios guardados consumen este módulo:
// un catálogo paralelo se desincronizaría en silencio y dos pantallas darían
// respuestas distintas sobre el mismo proyecto.
//
// La lógica de aplicación de overrides se movió aquí TAL CUAL estaba en
// SimuladorEscenarios: mismo orden, mismas limpiezas de montos fijos.

const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

export const VARS_INICIALES = {
  pctPrecio: 0,
  pctDescuento: '',
  pctCostos: 0,
  pctTerreno: 0,
  pctImprevistos: '',
  pctGastosAdmin: '',
  pctComisiones: '',
  pctPublicidad: '',
  pctImpuestosVentas: '',
  pctInteres: 0,
};

// modo 'relativo': el valor del slider ya es un % de ajuste sobre el dato.
// modo 'absoluto': el valor es el porcentaje efectivo (vacío = sin cambio),
// por eso el tornado necesita su valor de referencia para variarlo.
export const VARIABLES = [
  { id: 'pctPrecio', labelKey: 'sim.varPrecio', modo: 'relativo', mejor: 'alta' },
  { id: 'pctDescuento', labelKey: 'sim.varDescuento', modo: 'absoluto', ref: 'descuento', mejor: 'baja' },
  { id: 'pctCostos', labelKey: 'sim.varCostos', modo: 'relativo', mejor: 'baja' },
  { id: 'pctTerreno', labelKey: 'sim.varTerreno', modo: 'relativo', mejor: 'baja' },
  { id: 'pctImprevistos', labelKey: 'sim.varImprevistos', modo: 'absoluto', ref: 'imprevistos', mejor: 'baja' },
  { id: 'pctGastosAdmin', labelKey: 'sim.varGastosAdmin', modo: 'absoluto', ref: 'gastosAdmin', mejor: 'baja' },
  { id: 'pctComisiones', labelKey: 'sim.varComisiones', modo: 'absoluto', ref: 'comisiones', mejor: 'baja' },
  { id: 'pctPublicidad', labelKey: 'sim.varPublicidad', modo: 'absoluto', ref: 'publicidad', mejor: 'baja' },
  { id: 'pctImpuestosVentas', labelKey: 'sim.varImpuestos', modo: 'absoluto', ref: 'impuestosVentas', mejor: 'baja' },
  { id: 'pctInteres', labelKey: 'sim.varInteres', modo: 'relativo', mejor: 'baja' },
];

// Valores actuales del proyecto para los sliders absolutos. Los defaults
// replican los del motor (PARAMS_TORRE / PARAMS_CASAS).
export function referenciasSimulador(datos, tipo, resultado) {
  const p = datos?.params || {};
  const esCasas = tipo === 'casas';
  return {
    imprevistos: (p.imprevistos ?? 0.03) * 100,
    gastosAdmin: (p.gastosAdmin ?? 0.03) * 100,
    comisiones: (p.comisiones ?? (esCasas ? 0.015 : 0.03)) * 100,
    publicidad: (p.publicidad ?? 0.01) * 100,
    impuestosVentas: (p.impuestosVentas ?? (esCasas ? 0.025 : 0.045)) * 100,
    descuento: num(resultado?.pctDescuento) * 100,
  };
}

/**
 * Aplica los overrides del simulador sobre una copia profunda de los datos.
 * No muta la entrada. Devuelve los datos listos para calcularFactibilidad.
 */
export function aplicarOverrides(datosOriginal, tipo, vars) {
  if (!datosOriginal) return null;
  const datos = JSON.parse(JSON.stringify(datosOriginal));
  const v = { ...VARS_INICIALES, ...(vars || {}) };
  const esCasas = tipo === 'casas';

  // Overrides de parámetros (costos indirectos porcentuales).
  // Si el proyecto tiene un monto fijo definido para un concepto, ese monto
  // tiene prioridad sobre el porcentaje (ver montoOFijo en calculations.js).
  // Al simular un porcentaje, limpiamos el monto fijo correspondiente para que
  // el slider realmente tome efecto, sin importar cómo esté configurado el proyecto.
  const overrides = {};
  if (v.pctImprevistos !== '') overrides.imprevistos = num(v.pctImprevistos) / 100;
  if (v.pctGastosAdmin !== '') { overrides.gastosAdmin = num(v.pctGastosAdmin) / 100; overrides.gastosAdminMonto = 0; }
  if (v.pctComisiones !== '') { overrides.comisiones = num(v.pctComisiones) / 100; overrides.comisionesMonto = 0; }
  if (v.pctPublicidad !== '') { overrides.publicidad = num(v.pctPublicidad) / 100; overrides.publicidadMonto = 0; }
  if (v.pctImpuestosVentas !== '') { overrides.impuestosVentas = num(v.pctImpuestosVentas) / 100; overrides.impuestosVentasMonto = 0; }
  if (Object.keys(overrides).length) {
    datos.params = { ...(datos.params || {}), ...overrides };
  }

  const aplicarInteres = (val) => (v.pctInteres ? num(val) * (1 + v.pctInteres / 100) : val);

  if (esCasas) {
    // Los COSTOS de casas viven en las etapas cuando el proyecto las usa
    // (calculations.js: `usaEtapas(datos) ? etapasCalculables(datos) : datos.modelos`).
    // Escribir sólo sobre `modelos` dejaba los sliders de costos, terreno e
    // interés sin efecto en todo proyecto con etapas. Se escribe sobre AMBAS
    // listas: el motor lee una sola, y así los datos mixtos o antiguos también
    // quedan cubiertos sin ramificar por versión de esquema.
    const portadoresCosto = [...(datos.etapas || []), ...(datos.modelos || [])];

    if (v.pctPrecio) {
      // El precio por vivienda vive en `modelos[].precioUnidad`; el ingreso de
      // la etapa se DERIVA de él (casasEtapas.precioUnidadModelo). Los datos
      // antiguos guardaban el ingreso total en `ingresosViv`. Se escalan los
      // dos: cada ruta de cálculo lee sólo uno, así que no hay doble conteo.
      const factor = 1 + v.pctPrecio / 100;
      const m2ConstTotal = (datos.modelos || []).reduce((a, m) => a + num(m.cantViviendas) * num(m.m2ConstViv), 0);
      const ingrTotal = (datos.modelos || []).reduce((a, m) => a + num(m.ingresosViv), 0);
      const precioBase = num(datos.precioListaM2) || (m2ConstTotal ? ingrTotal / m2ConstTotal : 0);
      datos.precioListaM2 = precioBase * factor;
      (datos.modelos || []).forEach((m) => {
        if (m.precioUnidad !== undefined && m.precioUnidad !== '' && m.precioUnidad !== null) {
          m.precioUnidad = num(m.precioUnidad) * factor;
        }
        m.ingresosViv = num(m.ingresosViv) * factor;
      });
      (datos.etapas || []).forEach((e) => { e.ingresosViv = num(e.ingresosViv) * factor; });
    }
    if (v.pctCostos) {
      // Alcance decidido: costo de construcción + indirectos de obra.
      // La infraestructura (infraOriginario / infraVida) queda FUERA a
      // propósito: se contrata aparte y no escala con el costo de vivienda.
      const factor = 1 + v.pctCostos / 100;
      portadoresCosto.forEach((x) => {
        x.costoConstTipo = num(x.costoConstTipo) * factor;
        x.costoIndTipo = num(x.costoIndTipo) * factor;
      });
    }
    if (v.pctTerreno) {
      const factor = 1 + v.pctTerreno / 100;
      portadoresCosto.forEach((x) => { x.valorTerreno = num(x.valorTerreno) * factor; });
    }
    if (v.pctInteres) {
      portadoresCosto.forEach((x) => { x.interesBancario = aplicarInteres(x.interesBancario); });
    }
    if (v.pctDescuento !== '') {
      // El descuento puede estar capturado como monto en la etapa o el modelo:
      // se limpia para que el porcentaje simulado sea el que manda.
      const pct = num(v.pctDescuento) / 100;
      datos.pctDescuento = pct;
      datos.params = { ...(datos.params || {}), descuento: pct };
      portadoresCosto.forEach((x) => { delete x.descuentoViv; });
    }
    // Limpiar imprevistos manuales para que aplique el param override
    if (v.pctImprevistos !== '') {
      portadoresCosto.forEach((x) => { delete x.imprevistos; });
    }
  } else {
    const inp = datos.inputs || (datos.inputs = {});
    if (v.pctPrecio) {
      const factor = 1 + v.pctPrecio / 100;
      if (num(inp.precioListaM2) > 0) {
        // El proyecto captura precio de lista: se escala el precio y el
        // ingreso ya vendido (ese monto no depende del precio de lista).
        inp.precioListaM2 = num(inp.precioListaM2) * factor;
        inp.ventaApartamentos = num(inp.ventaApartamentos) * factor;
      } else {
        // El precio se DERIVA de los ingresos registrados. Fijar un precio de
        // lista aquí duplicaría el ingreso, así que se escalan directamente
        // los ingresos capturados.
        inp.ventaApartamentos = num(inp.ventaApartamentos) * factor;
        if (inp.ingresosApt !== undefined && inp.ingresosApt !== '') {
          inp.ingresosApt = num(inp.ingresosApt) * factor;
        }
      }
    }
    if (v.pctDescuento !== '') inp.pctDescuento = num(v.pctDescuento) / 100;
    if (v.pctCostos) {
      inp.costoConstruccion = num(inp.costoConstruccion) * (1 + v.pctCostos / 100);
      inp.costosPromotora = num(inp.costosPromotora) * (1 + v.pctCostos / 100);
    }
    if (v.pctTerreno) inp.valorTerreno = num(inp.valorTerreno) * (1 + v.pctTerreno / 100);
    if (v.pctInteres) inp.interesBancario = aplicarInteres(inp.interesBancario);
    if (v.pctImprevistos !== '') delete inp.imprevistos;
  }

  return datos;
}

/**
 * Traduce "variar la variable X un ±pct%" al objeto de overrides que entiende
 * aplicarOverrides. Para las variables absolutas se mueve su valor de
 * referencia; si no hay referencia (p. ej. descuento 0) no hay nada que variar
 * y se devuelve null: el tornado la omite en vez de dibujar una barra falsa.
 */
export function varsParaVariacion(variable, pct, refs) {
  if (variable.modo === 'relativo') return { [variable.id]: pct };
  const base = num(refs?.[variable.ref]);
  if (!base) return null;
  return { [variable.id]: base * (1 + pct / 100) };
}