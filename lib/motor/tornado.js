// Tornado de sensibilidad: mueve cada variable ±rango% y ordena las variables
// por cuánto mueven el margen. Contesta "¿dónde tengo que poner la atención?".
import { calcularFactibilidad } from "./calculations.js";
import { VARIABLES, referenciasSimulador, aplicarOverrides, varsParaVariacion } from "./simuladorVariables.js";

export const RANGOS = [5, 10, 20];

/**
 * @returns {Array<{id,labelKey,mejor,baja,alta,amplitud,margenBaja,margenAlta}>}
 * ordenado de mayor a menor amplitud. `baja`/`alta` son puntos de margen
 * (0,01 = 1 punto) respecto del margen base.
 */
export function calcularTornado(datos, tipo, rango = 10, resultadoBase = null) {
  if (!datos || !tipo) return [];
  const base = resultadoBase || calcularFactibilidad(datos, tipo);
  const margenBase = base?.margen ?? 0;
  const refs = referenciasSimulador(datos, tipo, base);

  const filas = [];
  VARIABLES.forEach((variable) => {
    const varsBaja = varsParaVariacion(variable, -rango, refs);
    const varsAlta = varsParaVariacion(variable, rango, refs);
    // Una variable sin valor de referencia no se puede variar: se omite en
    // vez de dibujar una barra de longitud cero que parecería "no influye".
    if (!varsBaja || !varsAlta) return;

    const mBaja = calcularFactibilidad(aplicarOverrides(datos, tipo, varsBaja), tipo)?.margen ?? 0;
    const mAlta = calcularFactibilidad(aplicarOverrides(datos, tipo, varsAlta), tipo)?.margen ?? 0;
    const baja = mBaja - margenBase;
    const alta = mAlta - margenBase;
    const amplitud = Math.abs(alta - baja);
    if (amplitud < 1e-9) return;

    filas.push({
      id: variable.id,
      labelKey: variable.labelKey,
      mejor: variable.mejor,
      baja,
      alta,
      margenBaja: mBaja,
      margenAlta: mAlta,
      amplitud,
    });
  });

  return filas.sort((a, b) => b.amplitud - a.amplitud);
}