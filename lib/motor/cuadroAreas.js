// ============================================================
// Cuadro de áreas — modelado de unidades de venta (torre / casas)
// Se guarda dentro de datos.cuadroAreas de cada versión.
// ============================================================

const uid = () => Math.random().toString(36).slice(2, 10);

export const ESTADOS_UNIDAD = ['disponible', 'separado', 'reservado', 'vendido'];

export const COLOR_ESTADO = {
  disponible: '#94a3b8',
  separado: '#0284c7',
  reservado: '#d97706',
  vendido: '#15803d',
};

const PALETA = ['#2563eb', '#0891b2', '#7c3aed', '#db2777', '#ea580c', '#65a30d', '#0f766e', '#b45309'];

export const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

export function nuevaTipologia(nombre, i = 0) {
  return { id: uid(), nombre, m2: 0, precioM2: 0, precio: 0, color: PALETA[i % PALETA.length] };
}

export function nuevaUnidad(tipologiaId = null, extra = {}) {
  return {
    id: uid(), codigo: '', tipologiaId, m2: 0, precio: 0,
    estado: 'disponible', cliente: '', fechaVenta: '',
    // Alta de la unidad: solo alimenta el mapa de calor de tiempo en
    // inventario. No participa en ningún total.
    creadoEn: new Date().toISOString().slice(0, 10),
    descuento: 0, descuentoTipo: 'monto',
    campos: {}, x: 20, y: 20, ...extra,
  };
}

export function nuevoNivel(nombre) {
  return { id: uid(), nombre, unidades: [] };
}

export function nuevaColumna(nombre) {
  return { id: uid(), nombre, tipo: 'texto' };
}

const cuadroVacio = (esCasas) => ({
  tipologias: [nuevaTipologia(esCasas ? 'Modelo A' : 'Tipo A', 0)],
  niveles: [nuevoNivel(esCasas ? 'Lotes' : 'Piso 1')],
  columnas: [],
});

export function leerCuadro(datos, esCasas) {
  const c = datos?.cuadroAreas;
  if (!c || !Array.isArray(c.niveles) || c.niveles.length === 0) return cuadroVacio(esCasas);
  return {
    ...c,
    tipologias: Array.isArray(c.tipologias) ? c.tipologias : [],
    niveles: c.niveles.map((n) => ({ ...n, unidades: Array.isArray(n.unidades) ? n.unidades : [] })),
    columnas: Array.isArray(c.columnas) ? c.columnas : [],
  };
}

export function escribirCuadro(datos, cuadro) {
  return { ...(datos || {}), cuadroAreas: cuadro };
}

export function tipologiaDe(cuadro, id) {
  return (cuadro.tipologias || []).find((t) => t.id === id) || null;
}

// El m2 de la unidad manda; si está vacío, hereda el de su tipología.
export function m2De(cuadro, u) {
  return num(u.m2) > 0 ? num(u.m2) : num(tipologiaDe(cuadro, u.tipologiaId)?.m2);
}

// Orden de resolución del precio: precio propio de la unidad → m² × precio
// por m² del modelo → precio fijo del modelo.
export function precioDe(cuadro, u) {
  if (num(u.precio) > 0) return num(u.precio);
  const t = tipologiaDe(cuadro, u.tipologiaId);
  const m2 = num(u.m2) > 0 ? num(u.m2) : num(t?.m2);
  if (num(t?.precioM2) > 0 && m2 > 0) return Math.round(num(t.precioM2) * m2 * 100) / 100;
  return num(t?.precio);
}

// --- Descuento y precio neto (añadidos, NO alteran ningún total) ---
// DECISIÓN EXPLÍCITA: precioDe() sigue devolviendo el PRECIO DE LISTA y es el
// único que alimenta totalesCuadro y la factibilidad. El neto vive aparte en
// precioNetoDe() y solo se usa en la interfaz, siempre rotulado como tal.
export const descuentoDe = (u) => num(u?.descuento ?? 0);
export const descuentoTipoDe = (u) => (u?.descuentoTipo === 'pct' ? 'pct' : 'monto');

export function descuentoMontoDe(cuadro, u) {
  const d = descuentoDe(u);
  if (d <= 0) return 0;
  const lista = precioDe(cuadro, u);
  return descuentoTipoDe(u) === 'pct'
    ? Math.round(lista * Math.min(100, d) / 100 * 100) / 100
    : Math.min(lista, d);
}

export function precioNetoDe(cuadro, u) {
  return Math.round((precioDe(cuadro, u) - descuentoMontoDe(cuadro, u)) * 100) / 100;
}

// Precio de venta calculado de un modelo (m² × precio por m²).
export function precioTipologia(tp) {
  if (num(tp?.precioM2) > 0 && num(tp?.m2) > 0) return Math.round(num(tp.precioM2) * num(tp.m2) * 100) / 100;
  return num(tp?.precio);
}

export function todasUnidades(cuadro) {
  return (cuadro.niveles || []).flatMap((n) => n.unidades.map((u) => ({ ...u, nivelId: n.id, nivelNombre: n.nombre })));
}

export function totalesCuadro(cuadro) {
  const list = todasUnidades(cuadro);
  const t = {
    unidades: list.length, m2Vendible: 0,
    vendidas: 0, m2Vendidos: 0, montoVendido: 0,
    reservadas: 0, separadas: 0, disponibles: 0, valorTotal: 0,
    porTipologia: [],
  };
  list.forEach((u) => {
    const m2 = m2De(cuadro, u);
    const precio = precioDe(cuadro, u);
    t.m2Vendible += m2;
    t.valorTotal += precio;
    if (u.estado === 'vendido') { t.vendidas += 1; t.m2Vendidos += m2; t.montoVendido += precio; }
    else if (u.estado === 'reservado') t.reservadas += 1;
    else if (u.estado === 'separado') t.separadas += 1;
    else t.disponibles += 1;
  });
  t.porTipologia = (cuadro.tipologias || []).map((tp) => {
    const us = list.filter((u) => u.tipologiaId === tp.id);
    const vend = us.filter((u) => u.estado === 'vendido');
    return {
      id: tp.id, nombre: tp.nombre, color: tp.color,
      unidades: us.length,
      m2: us.reduce((a, u) => a + m2De(cuadro, u), 0),
      vendidas: vend.length,
      m2Vendidos: vend.reduce((a, u) => a + m2De(cuadro, u), 0),
      montoVendido: vend.reduce((a, u) => a + precioDe(cuadro, u), 0),
    };
  });
  return t;
}

// --- Edición del árbol ---
export const mapUnidad = (cuadro, unidadId, fn) => ({
  ...cuadro,
  niveles: cuadro.niveles.map((n) => ({
    ...n,
    unidades: n.unidades.map((u) => (u.id === unidadId ? fn(u) : u)),
  })),
});

export const quitarUnidad = (cuadro, unidadId) => ({
  ...cuadro,
  niveles: cuadro.niveles.map((n) => ({ ...n, unidades: n.unidades.filter((u) => u.id !== unidadId) })),
});

export const ANCHO_UNIDAD = 110;
export const ALTO_UNIDAD = 64;
const POR_FILA = 8;

export const dimsDe = () => ({ w: ANCHO_UNIDAD, h: ALTO_UNIDAD });

export const posicionGrid = (i) => ({
  x: 20 + (i % POR_FILA) * (ANCHO_UNIDAD + 14),
  y: 20 + Math.floor(i / POR_FILA) * (ALTO_UNIDAD + 14),
});

// Busca la primera casilla libre de la grilla (sin solaparse con otra unidad).
export function posicionLibre(cuadro, ocupadasExtra = []) {
  const paso = { x: ANCHO_UNIDAD + 14, y: ALTO_UNIDAD + 14 };
  const ocupadas = [...todasUnidades(cuadro), ...ocupadasExtra];
  const choca = (x, y) => ocupadas.some((u) => Math.abs((u.x || 0) - x) < ANCHO_UNIDAD && Math.abs((u.y || 0) - y) < ALTO_UNIDAD);
  for (let i = 0; i < 5000; i++) {
    const x = 20 + (i % 30) * paso.x;
    const y = 20 + Math.floor(i / 30) * paso.y;
    if (!choca(x, y)) return { x, y };
  }
  return { x: 20, y: 20 };
}

// Inserta unidades ya construidas en el primer nivel.
export const agregarUnidades = (cuadro, nuevas) => ({
  ...cuadro,
  niveles: cuadro.niveles.map((n, i) => (i === 0 ? { ...n, unidades: [...n.unidades, ...nuevas] } : n)),
});

// Aplica nuevas coordenadas a un conjunto de unidades (en cualquier nivel).
export const moverUnidades = (cuadro, posiciones) => ({
  ...cuadro,
  niveles: cuadro.niveles.map((n) => ({
    ...n,
    unidades: n.unidades.map((u) => (posiciones[u.id] ? { ...u, ...posiciones[u.id] } : u)),
  })),
});

// Cuenta las unidades de un modelo en todo el cuadro.
export function contarTipologia(cuadro, tipologiaId) {
  return todasUnidades(cuadro).filter((u) => u.tipologiaId === tipologiaId).length;
}

// Números ya usados en los códigos que empiezan con la etiqueta dada.
function numerosUsados(cuadro, etiqueta) {
  const pre = (etiqueta || '').trim().toLowerCase();
  const usados = new Set();
  todasUnidades(cuadro).forEach((u) => {
    const c = (u.codigo || '').trim().toLowerCase();
    if (!c.startsWith(pre)) return;
    const n = parseInt(c.slice(pre.length).trim(), 10);
    if (!isNaN(n)) usados.add(n);
  });
  return usados;
}

// Nomenclatura consecutiva y sin duplicados: toma el primer número libre.
export function siguienteNumero(cuadro, etiqueta) {
  const usados = numerosUsados(cuadro, etiqueta);
  let i = 1;
  while (usados.has(i)) i += 1;
  return i;
}

// Ajusta la cantidad de unidades de un modelo (crea o quita las últimas).
export function ajustarCantidadTipologia(cuadro, tipologiaId, cantidad, etiqueta = 'Casa') {
  const objetivo = Math.max(0, Math.round(num(cantidad)));
  const nivel = cuadro.niveles[0];
  if (!nivel) return cuadro;
  const actuales = nivel.unidades.filter((u) => u.tipologiaId === tipologiaId);
  const dif = objetivo - actuales.length;
  let unidades = [...nivel.unidades];
  if (dif > 0) {
    const usados = numerosUsados(cuadro, etiqueta);
    let n = 1;
    for (let i = 0; i < dif; i++) {
      while (usados.has(n)) n += 1;
      usados.add(n);
      unidades.push(nuevaUnidad(tipologiaId, { codigo: `${etiqueta} ${n}`, ...posicionGrid(unidades.length) }));
    }
  } else if (dif < 0) {
    const quitar = new Set(actuales.slice(dif).map((u) => u.id));
    unidades = unidades.filter((u) => !quitar.has(u.id));
  }
  return { ...cuadro, niveles: cuadro.niveles.map((n, i) => (i === 0 ? { ...n, unidades } : n)) };
}

// Duplica un conjunto de unidades desplazándolas para que queden visibles.
export function duplicarUnidades(cuadro, ids, dx = ANCHO_UNIDAD + 14, dy = 0) {
  const set = new Set(ids);
  const copias = [];
  const niveles = cuadro.niveles.map((n) => {
    const nuevas = n.unidades.filter((u) => set.has(u.id)).map((u) => {
      const copia = { ...u, id: uid(), x: (u.x || 0) + dx, y: (u.y || 0) + dy };
      copias.push(copia.id);
      return copia;
    });
    return { ...n, unidades: [...n.unidades, ...nuevas] };
  });
  return { cuadro: { ...cuadro, niveles }, nuevosIds: copias };
}

export const quitarUnidades = (cuadro, ids) => {
  const set = new Set(ids);
  return { ...cuadro, niveles: cuadro.niveles.map((n) => ({ ...n, unidades: n.unidades.filter((u) => !set.has(u.id)) })) };
};

export const mapUnidades = (cuadro, ids, cambios) => {
  const set = new Set(ids);
  return {
    ...cuadro,
    niveles: cuadro.niveles.map((n) => ({
      ...n,
      unidades: n.unidades.map((u) => (set.has(u.id) ? { ...u, ...cambios } : u)),
    })),
  };
};

// Reacomoda unidades en una cuadrícula configurable. `direccion` horizontal
// llena por filas (porLinea = columnas); vertical llena por columnas.
export function organizarEnCuadricula(cuadro, opciones = {}) {
  const { ids = null, porLinea = 8, direccion = 'horizontal', espacioX = 14, espacioY = 14 } = opciones;
  const set = ids && ids.length ? new Set(ids) : null;
  const lista = todasUnidades(cuadro).filter((u) => !set || set.has(u.id));
  const linea = Math.max(1, Math.round(num(porLinea)));

  const origenX = lista.length ? Math.min(...lista.map((u) => u.x || 0)) : 20;
  const origenY = lista.length ? Math.min(...lista.map((u) => u.y || 0)) : 20;

  const posiciones = {};
  lista.forEach((u, i) => {
    const col = direccion === 'horizontal' ? i % linea : Math.floor(i / linea);
    const fila = direccion === 'horizontal' ? Math.floor(i / linea) : i % linea;
    const d = dimsDe(u);
    posiciones[u.id] = {
      x: Math.round(origenX + col * (d.w + num(espacioX))),
      y: Math.round(origenY + fila * (d.h + num(espacioY))),
    };
  });
  return moverUnidades(cuadro, posiciones);
}

export const duplicarNivel = (nivel, sufijo) => ({
  id: uid(), nombre: `${nivel.nombre} ${sufijo}`,
  unidades: nivel.unidades.map((u) => ({ ...u, id: uid() })),
});

// --- Integración con la factibilidad ---
// Torre: cantidad de apartamentos, m2 vendibles y la hipótesis comercial.
// Casas: cantidad de viviendas y m2 por modelo (empatando por nombre) más
// los datos comerciales globales.
export function aplicarCuadroAFactibilidad(datos, cuadro, tipo) {
  const t = totalesCuadro(cuadro);
  if (tipo === 'torre') {
    return {
      ...datos,
      inputs: {
        ...(datos.inputs || {}),
        cantApartamentos: t.unidades,
        areaVentaApt: Math.round(t.m2Vendible * 100) / 100,
        unidadesVendidas: t.vendidas,
        m2Vendidos: Math.round(t.m2Vendidos * 100) / 100,
        ventaApartamentos: Math.round(t.montoVendido * 100) / 100,
      },
    };
  }
  const buscarTp = (nombre) => t.porTipologia.find(
    (x) => (x.nombre || '').trim().toLowerCase() === (nombre || '').trim().toLowerCase(),
  );
  const modelos = (datos.modelos || []).map((m) => {
    const tp = buscarTp(m.nombre);
    if (!tp || tp.unidades === 0) return m;
    return {
      ...m,
      cantViviendas: tp.unidades,
      m2ConstViv: Math.round((tp.m2 / tp.unidades) * 100) / 100,
    };
  });
  // Vendido por modelo: viene directo del estado de cada vivienda del mapa.
  const porModelo = (datos.modelos || []).map((m) => {
    const tp = buscarTp(m.nombre);
    return {
      unidadesVendidas: tp?.vendidas || 0,
      totalVendido: Math.round((tp?.montoVendido || 0) * 100) / 100,
    };
  });
  return {
    ...datos,
    modelos,
    comercial: {
      ...(datos.comercial || {}),
      porModelo,
      unidadesVendidas: t.vendidas,
      m2Vendidos: Math.round(t.m2Vendidos * 100) / 100,
      totalVendido: Math.round(t.montoVendido * 100) / 100,
    },
  };
}

// --- Modelos de factibilidad → tipologías de Viviendas ---
// Cada modelo de casa existe como una tipología con su m², precio y cantidad
// de unidades. Empata por nombre; crea las que falten y ajusta las cantidades.
export function sincronizarTipologiasDesdeModelos(cuadro, datos) {
  const modelos = datos?.modelos || [];
  if (!modelos.length) return cuadro;
  const precioM2Proyecto = num(datos?.precioListaM2);
  let out = { ...cuadro, tipologias: [...(cuadro.tipologias || [])] };

  modelos.forEach((m, i) => {
    const nombre = (m.nombre || `Modelo ${i + 1}`).trim();
    let tp = out.tipologias.find(
      (x) => (x.nombre || '').trim().toLowerCase() === nombre.toLowerCase(),
    );
    if (!tp) {
      tp = { ...nuevaTipologia(nombre, out.tipologias.length) };
      out.tipologias = [...out.tipologias, tp];
    }
    const actualizada = {
      ...tp,
      nombre,
      m2: num(m.m2ConstViv) || num(tp.m2),
      precioM2: precioM2Proyecto || num(tp.precioM2),
      precio: num(m.precioUnidad) || num(tp.precio),
    };
    out.tipologias = out.tipologias.map((x) => (x.id === tp.id ? actualizada : x));
    const cant = Math.round(num(m.cantViviendas));
    if (cant > 0 && contarTipologia(out, tp.id) !== cant) {
      out = ajustarCantidadTipologia(out, tp.id, cant, nombre);
    }
  });

  // Los modelos de factibilidad son la única fuente: se descartan las
  // tipologías que ya no existen allí (y las unidades que las usaban).
  const validos = new Set(modelos.map((m, i) => (m.nombre || `Modelo ${i + 1}`).trim().toLowerCase()));
  const sobrantes = new Set(
    out.tipologias.filter((x) => !validos.has((x.nombre || '').trim().toLowerCase())).map((x) => x.id),
  );
  if (sobrantes.size) {
    out = {
      ...out,
      tipologias: out.tipologias.filter((x) => !sobrantes.has(x.id)),
      niveles: (out.niveles || []).map((n) => ({
        ...n,
        unidades: (n.unidades || []).filter((u) => !sobrantes.has(u.tipologiaId)),
      })),
    };
  }
  return out;
}