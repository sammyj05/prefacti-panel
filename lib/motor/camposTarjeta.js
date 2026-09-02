// Indicadores configurables de las tarjetas de proyectos del panel.
// Los 9 financieros son la vista preestablecida (CAMPOS_DEFAULT); los de
// hipótesis comercial son opcionales y se activan bajo demanda. La
// preferencia del usuario se guarda en user.preferencias.campos_tarjeta.

export const CAMPOS_TARJETA = [
  // --- Financieros (preestablecidos) ---
  { key: 'totalIngresos', label: 'Total ingresos' },
  { key: 'precioNetoM2', label: 'Precio final / M² vendible' },
  { key: 'm2Construccion', label: 'M² construcción' },
  { key: 'costoTotal', label: 'Costo total' },
  { key: 'ctVendible', label: 'Costo / M² vendible' },
  { key: 'm2Venta', label: 'M² venta' },
  { key: 'utilidad', label: 'Utilidad' },
  { key: 'margen', label: 'Margen' },
  { key: 'ratio', label: 'Ratio eficiencia' },
  // --- Hipótesis comercial (opcionales) ---
  { key: 'totalVendido', label: 'Vendido' },
  { key: 'totalPorVender', label: 'Por vender' },
  { key: 'pctVendido', label: '% vendido' },
  { key: 'pctPorVender', label: '% por vender' },
  { key: 'm2Vendidos', label: 'M² vendidos' },
  { key: 'm2PorVender', label: 'M² por vender' },
  { key: 'unidadesVendidas', label: 'Unidades vendidas' },
  { key: 'unidadesPorVender', label: 'Unidades por vender' },
  { key: 'ritmoActual', label: 'Ritmo actual' },
  { key: 'absorcion', label: 'Absorción (años)' },
];

export const CAMPOS_DEFAULT = CAMPOS_TARJETA.filter((c) =>
  ['totalIngresos', 'precioNetoM2', 'm2Construccion', 'costoTotal', 'ctVendible', 'm2Venta', 'utilidad', 'margen', 'ratio'].includes(c.key)
).map((c) => c.key);

// Devuelve la lista de claves visibles respetando el orden preestablecido.
// Si no hay configuración (o está vacía) se muestran los 9 financieros.
export function getCamposVisibles(preferencias) {
  const cfg = preferencias?.campos_tarjeta;
  if (!Array.isArray(cfg) || cfg.length === 0) return CAMPOS_DEFAULT;
  return CAMPOS_TARJETA.map((c) => c.key).filter((k) => cfg.includes(k));
}