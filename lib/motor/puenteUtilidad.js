// Puente de utilidad entre dos versiones: cuánto del cambio de margen viene
// de cada causa.
//
// Método: sustitución secuencial. Se parte de los datos de A y se sustituye
// un grupo de variables a la vez por el de B, recalculando con
// calcularFactibilidad. El orden importa y produce residuos —el efecto de
// cambiar precio depende de si ya se cambió el área—, así que el sobrante se
// muestra explícitamente como "interacción" en vez de repartirlo en silencio
// entre los tramos. Un puente que cuadra por construcción miente.
import { calcularFactibilidad } from "./calculations.js";

// Campos por causa. Lo que no está en ningún grupo cae en la interacción.
const GRUPOS_TORRE = [
  { id: 'precio', campos: ['precioListaM2', 'pctDescuento', 'ventaApartamentos', 'ingresosApt', 'ventaEstacVend', 'ventaDepositosVend', 'ventaLocalesVend', 'ingresosExtras'] },
  { id: 'area', campos: ['areaConstruccion', 'areaVentaApt', 'areaVentaLocales', 'cantApartamentos', 'unidadesVendidas', 'm2Vendidos'] },
  { id: 'costoDirecto', campos: ['costoConstruccion', 'costosPromotora', 'valorTerreno'] },
  { id: 'costoIndirecto', campos: ['imprevistos', 'gastosAdmin', 'comisiones', 'publicidad', 'impuestoTerreno', 'impuestosVentas'] },
  { id: 'interes', campos: ['interesBancario'] },
];

const GRUPOS_CASAS = [
  { id: 'precio', campos: ['ingresosViv', 'descuentoViv'], raiz: ['precioListaM2', 'pctDescuento'] },
  { id: 'area', campos: ['cantViviendas', 'm2ConstViv', 'm2LoteViv', 'm2ConstTipo', 'm2LoteTipo'] },
  { id: 'costoDirecto', campos: ['costoConstTipo', 'valorTerreno'] },
  { id: 'costoIndirecto', campos: ['costoIndTipo', 'imprevistos'] },
  { id: 'interes', campos: ['interesBancario'] },
];

// Parámetros porcentuales de costos indirectos: viven en datos.params.
const PARAMS_INDIRECTOS = [
  'imprevistos', 'gastosAdmin', 'comisiones', 'publicidad', 'impuestoTerreno', 'impuestosVentas',
  'gastosAdminMonto', 'comisionesMonto', 'publicidadMonto', 'impuestoTerrenoMonto', 'impuestosVentasMonto',
];

const clonar = (o) => JSON.parse(JSON.stringify(o ?? {}));

function copiarCampos(destino, origen, campos) {
  if (!destino || !origen) return;
  campos.forEach((c) => {
    if (Object.prototype.hasOwnProperty.call(origen, c)) destino[c] = clonar(origen[c]);
    else delete destino[c];
  });
}

// Sustituye en `datos` los campos del grupo por los de `datosB`.
function sustituirGrupo(datos, datosB, tipo, grupo) {
  if (tipo === 'casas') {
    if (grupo.raiz) copiarCampos(datos, datosB, grupo.raiz);
    const listas = ['modelos', 'etapas'];
    listas.forEach((lista) => {
      if (!Array.isArray(datos[lista]) || !Array.isArray(datosB[lista])) return;
      datos[lista].forEach((item, i) => {
        const ref = datosB[lista][i];
        if (ref) copiarCampos(item, ref, grupo.campos);
      });
    });
  } else {
    datos.inputs = datos.inputs || {};
    copiarCampos(datos.inputs, datosB.inputs || {}, grupo.campos);
  }
  if (grupo.id === 'costoIndirecto') {
    datos.params = { ...(datos.params || {}) };
    copiarCampos(datos.params, datosB.params || {}, PARAMS_INDIRECTOS);
  }
}

/**
 * @returns {{
 *   margenA:number, margenB:number, utilidadA:number, utilidadB:number,
 *   tramos:Array<{id:string, puntos:number, monto:number}>,
 *   interaccion:{puntos:number, monto:number},
 *   completo:boolean
 * }}
 * `puntos` está en unidades de margen (0,01 = 1 punto).
 */
export function construirPuente(datosA, datosB, tipo) {
  if (!datosA || !datosB || !tipo) return null;
  const rA = calcularFactibilidad(datosA, tipo);
  const rB = calcularFactibilidad(datosB, tipo);
  if (!rA || !rB) return null;

  const grupos = tipo === 'casas' ? GRUPOS_CASAS : GRUPOS_TORRE;
  const acumulado = clonar(datosA);
  let margenPrev = rA.margen ?? 0;
  let utilidadPrev = rA.utilidad ?? 0;

  const tramos = grupos.map((g) => {
    sustituirGrupo(acumulado, datosB, tipo, g);
    const r = calcularFactibilidad(acumulado, tipo) || {};
    const margen = r.margen ?? 0;
    const utilidad = r.utilidad ?? 0;
    const tramo = { id: g.id, puntos: margen - margenPrev, monto: utilidad - utilidadPrev };
    margenPrev = margen;
    utilidadPrev = utilidad;
    return tramo;
  });

  // Residuo: todo lo que el recorrido por grupos no explica (orden de
  // sustitución + campos fuera del catálogo). Se muestra, no se reparte.
  const interaccion = {
    puntos: (rB.margen ?? 0) - margenPrev,
    monto: (rB.utilidad ?? 0) - utilidadPrev,
  };

  return {
    margenA: rA.margen ?? 0,
    margenB: rB.margen ?? 0,
    utilidadA: rA.utilidad ?? 0,
    utilidadB: rB.utilidad ?? 0,
    tramos,
    interaccion,
    completo: true,
  };
}