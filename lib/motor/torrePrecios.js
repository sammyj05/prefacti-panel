// Entrelaza el precio de lista por m² con la venta total de apartamentos.
// Venta de apartamentos = precio de lista por m² × área de ventas de
// apartamentos. Al editar cualquiera de los dos, el otro se recalcula; si
// cambia el área vendible, se refresca el total de venta.

const num = (v) => {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

export function entrelazarPrecioTorre(inputs, campo, valor) {
  const next = { ...(inputs || {}), [campo]: valor };
  const area = num(next.areaVentaApt);
  if (area <= 0) return next;

  if (campo === 'ventaTotalApt') {
    next.precioListaM2 = +(num(valor) / area).toFixed(2);
  } else if (campo === 'precioListaM2' || campo === 'areaVentaApt') {
    next.ventaTotalApt = +(num(next.precioListaM2) * area).toFixed(2);
  }
  return next;
}