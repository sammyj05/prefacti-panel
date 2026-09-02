"use client";

/**
 * El analizador dinámico de la cartera.
 *
 * Es el catálogo de métricas y los armadores de datos del Dashboard del
 * producto (`src/lib/analizador.js`), adaptados a este panel: fuera los iconos
 * y la capa de idiomas —aquí los rótulos ya son los definitivos— y dentro las
 * mismas treinta y nueve métricas con sus mismos `get`, porque un catálogo
 * paralelo se desincroniza en silencio y dos pantallas darían respuestas
 * distintas sobre el mismo proyecto.
 *
 * Cada proyecto entra con su `resultado` calculado por el motor y aplanado con
 * las métricas de retorno (`conMetricasRetorno`): sin flujo configurado, TIR y
 * VAN valen null —nunca 0— y se pintan como «—».
 */

import type { Edificio } from "./data";
import { datosOriginales, tipoMotor } from "./estudioLocal";
import { calcularFactibilidad, metricasComercial, formatCurrency, formatPercent, formatNumber, formatInt } from "./motor/calculations.js";
import { conMetricasRetorno } from "./motor/metricasRetorno.js";

export type Res = Record<string, number | null>;
export type ProyectoAnalizable = {
  id: string; nombre: string; tipo: "torre" | "casas"; estado: string;
  resultado: Res;
};

export type Metrica = { id: string; label: string; tipo: string; get: (r: Res) => number | null };

const n = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);

export const METRICAS: { grupo: string; items: Metrica[] }[] = [
  { grupo: "Ingresos", items: [
    { id: "totalIngresos", label: "Ingresos totales", tipo: "moneda", get: r => n(r.totalIngresos) || n(r.total_ingresos) },
    { id: "ingresosApt", label: "Ingresos viviendas", tipo: "moneda", get: r => n(r.ingresosApt) || n(r.ingresos) },
    { id: "ingresosLocales", label: "Ingresos locales", tipo: "moneda", get: r => n(r.ingresosLocales) },
    { id: "descuentos", label: "Descuentos", tipo: "moneda", get: r => n(r.descuentos) },
    { id: "ingresoUnidad", label: "Ingreso por unidad", tipo: "moneda", get: r => { const u = n(r.cantApartamentos) || n(r.cantViviendas); return u ? (n(r.totalIngresos) || n(r.total_ingresos)) / u : 0; } },
  ]},
  { grupo: "Costos", items: [
    { id: "costosDirectos", label: "Costos directos", tipo: "moneda", get: r => n(r.costosDirectos) },
    { id: "costosIndirectos", label: "Costos indirectos", tipo: "moneda", get: r => n(r.costosIndirectos) },
    { id: "costoTotal", label: "Costo total", tipo: "moneda", get: r => n(r.costoTotal) || n(r.costo_total) },
    { id: "gastosAdmin", label: "Gastos administrativos", tipo: "moneda", get: r => n(r.gastosAdmin) },
    { id: "comisiones", label: "Comisiones", tipo: "moneda", get: r => n(r.comisiones) },
    { id: "publicidad", label: "Publicidad", tipo: "moneda", get: r => n(r.publicidad) },
    { id: "impuestosVentas", label: "Impuestos de ventas", tipo: "moneda", get: r => n(r.impuestosVentas) },
    { id: "interes", label: "Interés bancario", tipo: "moneda", get: r => n(r.interes) },
  ]},
  { grupo: "Resultado", items: [
    { id: "utilidad", label: "Utilidad", tipo: "moneda", get: r => n(r.utilidad) },
    { id: "margen", label: "Margen", tipo: "porcentaje", get: r => n(r.margen) },
    { id: "utilidadUnidad", label: "Utilidad por unidad", tipo: "moneda", get: r => { const u = n(r.cantApartamentos) || n(r.cantViviendas); return u ? n(r.utilidad) / u : 0; } },
    { id: "utilidadM2Vendible", label: "Utilidad m² vendible", tipo: "moneda", get: r => { const a = n(r.areaVendible) || n(r.m2ConstTipo); return a ? n(r.utilidad) / a : 0; } },
  ]},
  { grupo: "Precios m²", items: [
    { id: "precioListaM2", label: "Precio lista m²", tipo: "moneda", get: r => n(r.precioListaM2) },
    { id: "precioNetoM2", label: "Precio neto m²", tipo: "moneda", get: r => n(r.precioNetoM2) },
    { id: "costo_m2_vendible", label: "Costo m² vendible", tipo: "moneda", get: r => n(r.costo_m2_vendible) || n(r.ctVendible) },
    { id: "margenM2Vendible", label: "Margen m² vendible", tipo: "moneda", get: r => (n(r.precio_m2_vendible) || n(r.precioNetoM2)) - (n(r.costo_m2_vendible) || n(r.ctVendible)) },
    { id: "ratioPrecioCosto", label: "Ratio precio/costo m²", tipo: "numero", get: r => { const c = n(r.costo_m2_vendible) || n(r.ctVendible); return c ? (n(r.precio_m2_vendible) || n(r.precioNetoM2)) / c : 0; } },
  ]},
  { grupo: "Áreas", items: [
    { id: "m2Construccion", label: "m² construcción", tipo: "area", get: r => n(r.areaConstruccion) || n(r.m2LoteTipo) },
    { id: "m2Vendible", label: "m² vendible", tipo: "area", get: r => n(r.areaVendible) || n(r.m2ConstTipo) },
    { id: "unidades", label: "Unidades", tipo: "int", get: r => n(r.cantApartamentos) || n(r.cantViviendas) },
    { id: "m2Vendidos", label: "m² vendidos", tipo: "area", get: r => n(r.m2Vendidos) },
    { id: "unidadesVendidas", label: "Unidades vendidas", tipo: "int", get: r => n(r.unidadesVendidas) },
    { id: "ratioEficiencia", label: "Ratio eficiencia", tipo: "porcentaje", get: r => { const c = n(r.areaConstruccion) || n(r.m2LoteTipo); const v = n(r.areaVendible) || n(r.m2ConstTipo); return c ? v / c : 0; } },
  ]},
  { grupo: "Retorno", items: [
    { id: "tirAnual", label: "TIR anual", tipo: "porcentaje", get: r => (r.tirAnual == null ? null : r.tirAnual) },
    { id: "vanProyecto", label: "VAN del proyecto", tipo: "moneda", get: r => (r.vanProyecto == null ? null : r.vanProyecto) },
    { id: "paybackMeses", label: "Recuperación (meses)", tipo: "int", get: r => (r.paybackMeses == null ? null : r.paybackMeses) },
    { id: "capitalPropioMax", label: "Capital propio máximo", tipo: "moneda", get: r => (r.capitalPropioMax == null ? null : r.capitalPropioMax) },
    { id: "multiploCapital", label: "Múltiplo sobre capital", tipo: "numero", get: r => (r.multiploCapital == null ? null : r.multiploCapital) },
    { id: "roeProyecto", label: "ROE del proyecto", tipo: "porcentaje", get: r => (r.roeProyecto == null ? null : r.roeProyecto) },
  ]},
  { grupo: "Comercial", items: [
    { id: "totalVendido", label: "Total vendido", tipo: "moneda", get: r => n(r.totalVendido) },
    { id: "pctVendido", label: "% vendido", tipo: "porcentaje", get: r => n(r.pctVendido) },
    { id: "ritmoActual", label: "Ritmo actual (un/mes)", tipo: "numero", get: r => n(r.ritmoActual) },
    { id: "puntoEquilibrio", label: "Punto de equilibrio (un)", tipo: "int", get: r => n(r.puntoEquilibrio) },
    { id: "ventasPendientes", label: "Ventas pendientes", tipo: "moneda", get: r => Math.max(0, (n(r.totalIngresos) || n(r.total_ingresos)) - n(r.totalVendido)) },
  ]},
];

export const TODAS_METRICAS: Metrica[] = METRICAS.flatMap(g => g.items);
export const metricaPorId = (id: string) => TODAS_METRICAS.find(m => m.id === id);

export const TIPOS_GRAFICA = [
  { id: "barras", label: "Barras" },
  { id: "torta", label: "Torta" },
  { id: "dispersion", label: "Dispersión" },
  { id: "tabla", label: "Tabla" },
] as const;

export const AGRUPACIONES = [
  { id: "proyecto", label: "Por proyecto" },
  { id: "tipo", label: "Por tipo" },
  { id: "estado", label: "Por estado" },
] as const;

const NOMBRE_TIPO: Record<string, string> = { torre: "Torres", casas: "Casas" };

export function fmtPorTipo(valor: number | null, tipo: string) {
  if (valor == null || isNaN(valor)) return "—";
  if (tipo === "moneda") return formatCurrency(valor);
  if (tipo === "porcentaje") return formatPercent(valor);
  if (tipo === "area") return formatNumber(valor, 0) + " m²";
  if (tipo === "int") return formatInt(valor);
  return formatNumber(valor, 2);
}

export function axisFmt(tipo: string, maxValor = 0) {
  const abs = Math.abs(maxValor);
  return (v: number) => {
    if (v == null || isNaN(v)) return "";
    if (tipo === "moneda") {
      if (abs >= 1e6) return "$" + (v / 1e6).toFixed(1) + "M";
      if (abs >= 1e3) return "$" + (v / 1e3).toFixed(0) + "K";
      return "$" + formatInt(v);
    }
    if (tipo === "porcentaje") return (v * 100).toFixed(0) + "%";
    if (tipo === "area") return abs >= 1e3 ? (v / 1e3).toFixed(0) + "k" : formatNumber(v, 0);
    if (tipo === "int") return formatInt(v);
    return formatNumber(v, 1);
  };
}

export type ConfigGrafica = {
  tipoGrafica: string;
  seleccionadas: string[];
  agrupar?: string;
  filtroTipo?: string;
  filtroEstado?: string;
  incluirArchivados?: boolean;
  metricaX?: string;
  metricaY?: string;
  orden?: "desc" | "asc" | "nombre";
};

/** Los datos listos para graficar, con la agregación honesta del producto:
    el margen agrupado es utilidad entre ingresos, no una media de medias. */
export function buildChartData(config: ConfigGrafica, proyectos: ProyectoAnalizable[]) {
  const {
    tipoGrafica, agrupar = "proyecto", seleccionadas = [],
    filtroTipo = "todos", filtroEstado = "todos", incluirArchivados = false,
  } = config;

  const filtrados = proyectos.filter(p => {
    if (!incluirArchivados && p.estado === "Archivado") return false;
    if (filtroTipo !== "todos" && p.tipo !== filtroTipo) return false;
    if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false;
    return true;
  });

  const grupos = new Map<string, { label: string; items: ProyectoAnalizable[] }>();
  filtrados.forEach(p => {
    let clave: string, label: string;
    if (agrupar === "tipo") { clave = p.tipo; label = NOMBRE_TIPO[p.tipo] ?? p.tipo; }
    else if (agrupar === "estado") { clave = p.estado; label = p.estado; }
    else { clave = p.id; label = p.nombre.length > 18 ? p.nombre.slice(0, 16) + "…" : p.nombre; }
    if (!grupos.has(clave)) grupos.set(clave, { label, items: [] });
    grupos.get(clave)!.items.push(p);
  });

  const valorMetrica = (items: ProyectoAnalizable[], m: Metrica): number | null => {
    if (!items.length) return 0;
    if (m.id === "margen") {
      const util = items.reduce((s, p) => s + n(p.resultado.utilidad), 0);
      const ing = items.reduce((s, p) => s + (metricaPorId("totalIngresos")!.get(p.resultado) ?? 0), 0);
      return ing ? util / ing : 0;
    }
    const vals = items.map(p => m.get(p.resultado));
    if (vals.every(v => v == null)) return null;
    if (m.tipo === "porcentaje") {
      const con = vals.filter((v): v is number => v != null);
      return con.reduce((a, b) => a + b, 0) / (con.length || 1);
    }
    return vals.reduce<number>((s, v) => s + (v ?? 0), 0);
  };

  const lista = Array.from(grupos.values());
  const metricas = seleccionadas.map(metricaPorId).filter(Boolean) as Metrica[];
  const filas = lista.map(g => ({
    label: g.label,
    valores: metricas.map(m => valorMetrica(g.items, m)),
  }));
  const primeraTipo = metricas[0]?.tipo ?? "moneda";
  return { filas, metricas, primeraTipo, sinDatos: filas.length === 0, esTorta: tipoGrafica === "torta" };
}

/** Dispersión: un punto por proyecto — un punto agregado no significaría nada. */
export function buildScatterData(config: ConfigGrafica, proyectos: ProyectoAnalizable[]) {
  const {
    metricaX = "costo_m2_vendible", metricaY = "precioNetoM2",
    filtroTipo = "todos", filtroEstado = "todos", incluirArchivados = false,
  } = config;
  const mx = metricaPorId(metricaX);
  const my = metricaPorId(metricaY);
  const puntos = proyectos
    .filter(p => {
      if (!incluirArchivados && p.estado === "Archivado") return false;
      if (filtroTipo !== "todos" && p.tipo !== filtroTipo) return false;
      if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false;
      return true;
    })
    .map(p => ({
      id: p.id, label: p.nombre,
      x: mx?.get(p.resultado) ?? null,
      y: my?.get(p.resultado) ?? null,
    }))
    .filter(d => d.x != null && d.y != null && isFinite(d.x) && isFinite(d.y)) as
    { id: string; label: string; x: number; y: number }[];
  return {
    puntos,
    tipoX: mx?.tipo ?? "moneda", tipoY: my?.tipo ?? "moneda",
    labelX: mx?.label ?? "", labelY: my?.label ?? "",
    sinDatos: puntos.length === 0,
  };
}

export function tituloGrafica(config: ConfigGrafica) {
  const { tipoGrafica, agrupar = "proyecto", seleccionadas = [] } = config;
  if (tipoGrafica === "dispersion") {
    return `${metricaPorId(config.metricaY ?? "")?.label ?? ""} vs ${metricaPorId(config.metricaX ?? "")?.label ?? ""}`;
  }
  const agrupLabel = (AGRUPACIONES.find(a => a.id === agrupar)?.label ?? "").toLowerCase();
  const labels = seleccionadas.map(id => metricaPorId(id)?.label).filter(Boolean).join(" / ");
  return `${labels || "Métricas"} ${agrupLabel}`;
}

/**
 * La cartera con su resultado calculado por el motor y las métricas de retorno
 * aplanadas. Se llama una vez por pantalla; la TIR de cada proyecto es una
 * corrida completa de flujo, así que no es cosa de cada tecleo.
 */
export function proyectosAnalizables(edificios: Edificio[]): ProyectoAnalizable[] {
  return edificios.flatMap(e => {
    const datos = datosOriginales(e);
    if (!datos) return [];
    const tipo = tipoMotor(e);
    const r = calcularFactibilidad(datos, tipo) as Record<string, unknown>;
    /* En casas la hipótesis comercial vive aparte del resultado: se aplana con
       el mismo módulo del motor para que «vendido» y «ritmo» existan igual que
       en torre. */
    const base = tipo === "casas" ? { ...r, ...(metricasComercial(r, datos, tipo) as object) } : r;
    return [{
      id: e.id, nombre: e.nombre, tipo, estado: e.etapa,
      resultado: conMetricasRetorno(datos, base, tipo) as unknown as Res,
    }];
  });
}
