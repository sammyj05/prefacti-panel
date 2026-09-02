// Curva de absorción: convierte las fechaVenta ya capturadas en ritmo de
// ventas, proyección y alerta temprana. Todo es lectura: no toca el cuadro.
import { todasUnidades, m2De, precioDe, precioNetoDe, tipologiaDe, num } from "./cuadroAreas.js";

export const MIN_PUNTOS = 3;

// Una unidad cuenta en la curva cuando tiene fecha de venta válida.
export const vendidasConFecha = (cuadro) => todasUnidades(cuadro)
  .filter((u) => /^\d{4}-\d{2}/.test(u.fechaVenta || ''))
  .sort((a, b) => a.fechaVenta.localeCompare(b.fechaVenta));

const mesDe = (f) => String(f).slice(0, 7);
export const mesActual = () => new Date().toISOString().slice(0, 7);

export function mesesEntre(desde, hasta) {
  const [a1, m1] = desde.split('-').map(Number);
  const [a2, m2] = hasta.split('-').map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
}

export function sumarMeses(mes, n) {
  const [a, m] = mes.split('-').map(Number);
  const total = a * 12 + (m - 1) + n;
  return `${String(Math.floor(total / 12)).padStart(4, '0')}-${String((total % 12) + 1).padStart(2, '0')}`;
}

// Serie mensual continua (sin huecos) desde la primera venta hasta hoy.
export function serieAbsorcion(cuadro, opciones = {}) {
  const { meses = 0 } = opciones;
  const list = vendidasConFecha(cuadro);
  if (!list.length) return [];
  const inicio = mesDe(list[0].fechaVenta);
  const fin = mesDe(list[list.length - 1].fechaVenta);
  const hoy = mesActual();
  const ultimo = fin > hoy ? fin : hoy;
  const puntos = [];
  let acumUnidades = 0;
  let acumMonto = 0;
  for (let m = inicio; mesesEntre(m, ultimo) >= 0; m = sumarMeses(m, 1)) {
    const delMes = list.filter((u) => mesDe(u.fechaVenta) === m);
    const monto = delMes.reduce((a, u) => a + precioNetoDe(cuadro, u), 0);
    acumUnidades += delMes.length;
    acumMonto += monto;
    puntos.push({ mes: m, unidades: delMes.length, monto, acumUnidades, acumMonto });
  }
  return meses > 0 ? puntos.slice(-meses) : puntos;
}

// Promedio de unidades/mes de los últimos n meses calendario (incluye ceros).
export function ritmoUltimos(cuadro, n) {
  const list = vendidasConFecha(cuadro);
  if (!list.length) return 0;
  const desde = sumarMeses(mesActual(), -(n - 1));
  const c = list.filter((u) => mesDe(u.fechaVenta) >= desde).length;
  return Math.round((c / n) * 100) / 100;
}

export function ritmosHistoricos(cuadro) {
  return { m3: ritmoUltimos(cuadro, 3), m6: ritmoUltimos(cuadro, 6), m12: ritmoUltimos(cuadro, 12) };
}

// Ritmo requerido para agotar el inventario en la fecha objetivo del proyecto.
export function ritmoRequerido(cuadro, fechaObjetivo) {
  const total = todasUnidades(cuadro).length;
  const vendidas = todasUnidades(cuadro).filter((u) => u.estado === 'vendido').length;
  const pendientes = Math.max(0, total - vendidas);
  if (!fechaObjetivo) return { pendientes, meses: null, ritmo: null };
  const meses = mesesEntre(mesActual(), mesDe(fechaObjetivo));
  if (meses <= 0) return { pendientes, meses, ritmo: null };
  return { pendientes, meses, ritmo: Math.round((pendientes / meses) * 100) / 100 };
}

// Proyección de agotamiento al ritmo histórico de 6 meses (o el disponible).
export function proyeccionAgotamiento(cuadro) {
  const ritmo = ritmoUltimos(cuadro, 6) || ritmoUltimos(cuadro, 12);
  const { pendientes } = ritmoRequerido(cuadro, null);
  if (!ritmo || !pendientes) return null;
  const meses = Math.ceil(pendientes / ritmo);
  return { meses, mes: sumarMeses(mesActual(), meses), ritmo };
}

// Alerta temprana: el requerido supera al histórico de 6 meses en +30 %.
export const UMBRAL_ALERTA = 1.3;
export function alertaRitmo(cuadro, fechaObjetivo) {
  const req = ritmoRequerido(cuadro, fechaObjetivo).ritmo;
  const hist = ritmoUltimos(cuadro, 6);
  if (req == null) return null;
  if (hist > 0 && req <= hist * UMBRAL_ALERTA) return null;
  return { requerido: req, historico: hist };
}

// Serie por tipología para el gráfico multilínea (acumulado por modelo).
export function serieporTipologia(cuadro, meses = 0) {
  const base = serieAbsorcion(cuadro, { meses: 0 });
  if (!base.length) return { puntos: [], tipologias: [] };
  const tps = (cuadro.tipologias || []);
  const list = vendidasConFecha(cuadro);
  const acum = {};
  const puntos = base.map((p) => {
    const fila = { mes: p.mes };
    tps.forEach((tp) => {
      const n = list.filter((u) => mesDe(u.fechaVenta) === p.mes && u.tipologiaId === tp.id).length;
      acum[tp.id] = (acum[tp.id] || 0) + n;
      fila[tp.id] = acum[tp.id];
    });
    return fila;
  });
  return { puntos: meses > 0 ? puntos.slice(-meses) : puntos, tipologias: tps };
}

// Tabla de rotación por tipología: ritmo propio y meses restantes al ritmo actual.
export function rotacionPorTipologia(cuadro, ventanaMeses = 6) {
  const list = todasUnidades(cuadro);
  const desde = sumarMeses(mesActual(), -(ventanaMeses - 1));
  return (cuadro.tipologias || []).map((tp) => {
    const us = list.filter((u) => u.tipologiaId === tp.id);
    const vendidas = us.filter((u) => u.estado === 'vendido').length;
    const recientes = us.filter((u) => /^\d{4}-\d{2}/.test(u.fechaVenta || '') && mesDe(u.fechaVenta) >= desde).length;
    const ritmo = Math.round((recientes / ventanaMeses) * 100) / 100;
    const pendientes = us.length - vendidas;
    return {
      id: tp.id, nombre: tp.nombre, color: tp.color,
      unidades: us.length,
      vendidas,
      pendientes,
      pct: us.length ? Math.round((vendidas / us.length) * 100) : 0,
      ritmo,
      mesesRestantes: ritmo > 0 && pendientes > 0 ? Math.ceil(pendientes / ritmo) : null,
    };
  });
}

// Precio logrado (neto) vs precio de lista, por m² y por tipología.
export function preciosPorTipologia(cuadro) {
  const list = todasUnidades(cuadro);
  return (cuadro.tipologias || []).map((tp) => {
    const us = list.filter((u) => u.tipologiaId === tp.id);
    const vend = us.filter((u) => u.estado === 'vendido');
    const sum = (arr, fn) => arr.reduce((a, u) => a + fn(u), 0);
    const m2Vend = sum(vend, (u) => m2De(cuadro, u));
    const listaVend = sum(vend, (u) => precioDe(cuadro, u));
    const netoVend = sum(vend, (u) => precioNetoDe(cuadro, u));
    const m2Todas = sum(us, (u) => m2De(cuadro, u));
    return {
      id: tp.id, nombre: tp.nombre, color: tp.color,
      vendidas: vend.length,
      listaM2: m2Todas > 0 ? Math.round((sum(us, (u) => precioDe(cuadro, u)) / m2Todas) * 100) / 100 : 0,
      logradoM2: m2Vend > 0 ? Math.round((netoVend / m2Vend) * 100) / 100 : 0,
      descuentoTotal: Math.round((listaVend - netoVend) * 100) / 100,
      descuentoPct: listaVend > 0 ? Math.round(((listaVend - netoVend) / listaVend) * 1000) / 10 : 0,
    };
  });
}

// Vista "quién compró qué" — sin embudo, sin seguimientos.
export function clientesDe(cuadro) {
  const mapa = new Map();
  todasUnidades(cuadro).forEach((u) => {
    const nombre = (u.cliente || '').trim();
    if (!nombre) return;
    const clave = nombre.toLowerCase();
    const item = mapa.get(clave) || { nombre, unidades: [], monto: 0 };
    item.unidades.push({
      id: u.id,
      codigo: u.codigo,
      estado: u.estado,
      fechaVenta: u.fechaVenta,
      tipologia: tipologiaDe(cuadro, u.tipologiaId)?.nombre || '',
      neto: precioNetoDe(cuadro, u),
    });
    item.monto += precioNetoDe(cuadro, u);
    mapa.set(clave, item);
  });
  return Array.from(mapa.values()).sort((a, b) => b.monto - a.monto || a.nombre.localeCompare(b.nombre));
}

export const numSeguro = num;