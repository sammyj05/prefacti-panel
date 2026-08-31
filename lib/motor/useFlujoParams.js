/**
 * Los parámetros del flujo, sacados del estudio.
 *
 * Es lo único que `metricasRetorno` necesita de `useFlujoParams`, que allá es
 * un gancho de React con media docena de dependencias más —sensibilidad,
 * escenarios, formato—. Traerlo entero por una función significaría arrastrar
 * React a un cálculo que no pinta nada, así que se copian las cuatro piezas que
 * hacen falta y nada más.
 *
 * Copia literal, como el resto de `lib/motor`: si el cálculo cambia allá, se
 * vuelve a copiar. Ver `LEEME.md`.
 */

import {
  horizonteDesdePlazo, plazoDelMaster, PARAMS_FLUJO_DEFAULT,
} from "./flujoCaja.js";

export function derivarParamsGuardados(datos) {
  const guardados = datos?.flujoParams || {};
  const plazo = guardados.plazoObra || plazoDelMaster(datos) || PARAMS_FLUJO_DEFAULT.plazoObra;
  const tieneActs = (datos?.flujoActividades || []).length > 0;
  const migrados = { ...guardados };
  if (migrados.aplicarAbonos && migrados.ventasObraActivar == null) {
    migrados.ventasObraActivar = true;
    migrados.ventasObraMontoTotal = migrados.ventasObraMontoTotal ?? migrados.ingresoTotalPreventa ?? 0;
    migrados.ventasObraPctAbono = migrados.ventasObraPctAbono ?? migrados.pctAbonoInicial ?? 0.10;
    migrados.ventasObraMesInicio = migrados.ventasObraMesInicio ?? migrados.mesInicioPreventa ?? 1;
    migrados.ventasObraMeses = migrados.ventasObraMeses ?? migrados.mesesPreventa ?? 24;
  }
  delete migrados.aplicarAbonos;
  delete migrados.pctAbonoInicial;
  delete migrados.ingresoTotalPreventa;
  delete migrados.mesInicioPreventa;
  delete migrados.mesesPreventa;
  return {
    ...PARAMS_FLUJO_DEFAULT,
    ...migrados,
    modo: migrados.modo || (tieneActs ? 'actividades' : 'estandar'),
    plazoObra: plazo,
    horizonteMeses: horizonteDesdePlazo(plazo),
  };
}
