/**
 * Rótulos y rangos del simulador.
 *
 * El catálogo de variables vive en el motor (`lib/motor/simuladorVariables.js`)
 * y es el mismo que consumen el tornado y los escenarios guardados. Aquí sólo
 * está lo que es de esta interfaz: cómo se llama cada variable en pantalla y
 * hasta dónde llega su deslizador — los mismos textos y rangos del producto.
 */

export const ETIQUETA_VAR: Record<string, string> = {
  pctPrecio: "Precio lista m² (%)",
  pctDescuento: "Descuento (%)",
  pctCostos: "Costos directos (%)",
  pctTerreno: "Valor terreno (%)",
  pctImprevistos: "Imprevistos (%)",
  pctGastosAdmin: "Gastos administrativos (%)",
  pctComisiones: "Comisiones de venta (%)",
  pctPublicidad: "Publicidad (%)",
  pctImpuestosVentas: "Impuestos sobre ventas (%)",
  pctInteres: "Interés bancario (%)",
};

/** Rango de cada deslizador, calcado del simulador del producto. */
export const RANGO_VAR: Record<string, { min: number; max: number; step: number }> = {
  pctPrecio: { min: -50, max: 50, step: 1 },
  pctDescuento: { min: 0, max: 20, step: 0.5 },
  pctCostos: { min: -50, max: 100, step: 1 },
  pctTerreno: { min: -50, max: 100, step: 1 },
  pctImprevistos: { min: 0, max: 15, step: 0.5 },
  pctGastosAdmin: { min: 0, max: 15, step: 0.5 },
  pctComisiones: { min: 0, max: 15, step: 0.5 },
  pctPublicidad: { min: 0, max: 10, step: 0.5 },
  pctImpuestosVentas: { min: 0, max: 15, step: 0.5 },
  pctInteres: { min: -100, max: 200, step: 5 },
};

/**
 * Overrides que realmente cambian algo respecto del estado neutro.
 * (Es la misma regla de `escenariosSimulador.js` del producto; se repite aquí
 * porque aquel módulo arrastra el cliente de Base44 y esto es puro dato.)
 */
export function overridesActivos(
  overrides: Record<string, number | string> | null | undefined,
  iniciales: Record<string, number | string>,
): [string, number | string][] {
  const o = { ...iniciales, ...(overrides || {}) };
  return Object.entries(o).filter(([k, v]) => {
    const base = iniciales[k];
    return v !== base && v !== "" && v !== 0;
  });
}

/** Secciones del panel de controles, en el mismo orden del producto. */
export const SECCIONES_SIM: { titulo: string; vars: string[] }[] = [
  { titulo: "Precios y ventas", vars: ["pctPrecio", "pctDescuento"] },
  { titulo: "Costos directos", vars: ["pctCostos", "pctTerreno"] },
  {
    titulo: "Costos indirectos y financiamiento",
    vars: [
      "pctImprevistos", "pctGastosAdmin", "pctComisiones",
      "pctPublicidad", "pctImpuestosVentas", "pctInteres",
    ],
  },
];
