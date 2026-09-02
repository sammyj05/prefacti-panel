// Desglose por modelo de los ítems comerciales atribuibles a un tipo de casa.
// Si el usuario capturó el vendido por modelo (comercial.porModelo) se usa tal
// cual; si no, se reparte el total del proyecto según el peso de cada modelo.
const n = (v) => (typeof v === 'number' ? (isNaN(v) ? 0 : v) : parseFloat(v) || 0);

// Totales del proyecto a partir del desglose por modelo.
export function totalesVentasModelos(modelos, porModelo) {
  const lista = porModelo || [];
  let unidadesVendidas = 0, m2Vendidos = 0, totalVendido = 0;
  (modelos || []).forEach((m, i) => {
    const u = n(lista[i]?.unidadesVendidas);
    unidadesVendidas += u;
    m2Vendidos += u * n(m.m2ConstViv);
    totalVendido += n(lista[i]?.totalVendido);
  });
  return { unidadesVendidas, m2Vendidos, totalVendido };
}

export function comercialPorModelo(dataCols, com) {
  const cols = dataCols || [];
  const porModelo = Array.isArray(com?.porModelo) ? com.porModelo : null;
  const tieneDesglose = !!porModelo && porModelo.some(
    (x) => n(x?.unidadesVendidas) > 0 || n(x?.totalVendido) > 0,
  );

  const totalM2 = cols.reduce((a, c) => a + n(c.m2ConstTipo), 0);
  const totalUn = cols.reduce((a, c) => a + n(c.cantViviendas), 0);
  const m2VendidosT = n(com?.m2Vendidos);
  const unidadesVendidasT = n(com?.unidadesVendidas);
  const totalVendidoT = n(com?.totalVendido);

  return cols.map((c, i) => {
    let uVend, m2Vend, vendido;
    if (tieneDesglose) {
      uVend = n(porModelo[i]?.unidadesVendidas);
      m2Vend = uVend * n(c.m2ConstViv);
      vendido = n(porModelo[i]?.totalVendido);
    } else {
      const shareM2 = totalM2 ? n(c.m2ConstTipo) / totalM2 : 0;
      const shareUn = totalUn ? n(c.cantViviendas) / totalUn : 0;
      uVend = unidadesVendidasT * shareUn;
      m2Vend = m2VendidosT * shareM2;
      vendido = totalVendidoT * shareM2;
    }
    return {
      unidadesVendidas: uVend,
      m2Vendidos: m2Vend,
      precioVendidoM2: m2Vend ? vendido / m2Vend : 0,
      pctVendido: n(c.m2ConstTipo) ? m2Vend / n(c.m2ConstTipo) : 0,
      unidadesPorVender: Math.max(0, n(c.cantViviendas) - uVend),
      m2PorVender: Math.max(0, n(c.m2ConstTipo) - m2Vend),
      pctPorVender: n(c.m2ConstTipo) ? 1 - m2Vend / n(c.m2ConstTipo) : 0,
    };
  });
}