"use client";

import { useEffect, useMemo, useState } from "react";
import { Pin, X } from "lucide-react";
import { Boton, Casilla, Lista, Modal, Pestanas } from "@/components/ui";
import {
  AGRUPACIONES, METRICAS, TIPOS_GRAFICA, axisFmt, buildChartData, buildScatterData,
  fmtPorTipo, metricaPorId, tituloGrafica,
  type ConfigGrafica, type ProyectoAnalizable,
} from "@/lib/analizadorCartera";
import { leerLista, guardarLista } from "@/lib/estudioLocal";

/**
 * El analizador dinámico: cualquier métrica del catálogo, en cuatro formas
 * —barras, torta, dispersión, tabla—, agrupada y filtrada como se quiera. Una
 * gráfica que responde una pregunta recurrente se fija y queda arriba, en este
 * navegador, con su configuración: al abrir mañana se recalcula con los datos
 * de mañana.
 */

const ESTADOS = ["En estudio", "Activo", "Aprobado", "Finalizado", "Archivado"];
const CLAVE_FIJAS = "prefacti:graficas-fijas";

type Fija = { id: string; titulo: string; config: ConfigGrafica };

/* La serie de color de las barras: acento y dos apoyos, del sistema. */
const SERIE = ["rgb(var(--minio-600))", "rgb(var(--cian-700))", "rgb(var(--tenso))"];

export function Analizador({ proyectos }: { proyectos: ProyectoAnalizable[] }) {
  const [config, setConfig] = useState<ConfigGrafica>({
    tipoGrafica: "barras",
    seleccionadas: ["utilidad", "totalIngresos"],
    agrupar: "proyecto",
    filtroTipo: "todos",
    filtroEstado: "todos",
    metricaX: "costo_m2_vendible",
    metricaY: "precioNetoM2",
    orden: "desc",
  });
  const [metricasAbierto, setMetricasAbierto] = useState(false);
  const [fijas, setFijas] = useState<Fija[]>([]);

  useEffect(() => { setFijas(leerLista<Fija>(CLAVE_FIJAS)); }, []);

  const fijar = () => {
    const nueva: Fija = {
      id: Date.now().toString(36),
      titulo: tituloGrafica(config),
      config: JSON.parse(JSON.stringify(config)),
    };
    const lista = [nueva, ...fijas];
    setFijas(lista);
    guardarLista(CLAVE_FIJAS, lista);
  };

  const quitar = (id: string) => {
    const lista = fijas.filter(f => f.id !== id);
    setFijas(lista);
    guardarLista(CLAVE_FIJAS, lista);
  };

  return (
    <div className="space-y-5">
      {fijas.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2">
          {fijas.map(f => (
            <section key={f.id} className="seccion overflow-hidden rounded-caja">
              <header className="flex items-center gap-2 border-b border-trazo-fino px-5 py-3">
                <Pin className="h-3.5 w-3.5 shrink-0 text-tinta-400" aria-hidden />
                <h3 className="min-w-0 flex-1 truncate text-[14px] font-medio text-tinta-950">
                  {f.titulo}
                </h3>
                <button onClick={() => quitar(f.id)} title="Quitar gráfica"
                  className="grid h-7 w-7 place-items-center rounded-[7px] text-tinta-400 hover:bg-hueso-mesa hover:text-tinta-950">
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </header>
              <div className="p-4">
                <Grafica config={f.config} proyectos={proyectos} alto={230} />
              </div>
            </section>
          ))}
        </div>
      )}

      <section className="seccion overflow-hidden rounded-caja">
        <header className="flex flex-wrap items-center gap-3 border-b border-trazo-fino px-5 py-3.5">
          <h3 className="text-[15px] font-medio text-tinta-950">Analizador</h3>
          <Pestanas
            id="tipo-grafica" forma="pastilla"
            activa={config.tipoGrafica}
            alElegir={k => setConfig(c => ({ ...c, tipoGrafica: k }))}
            pestanas={TIPOS_GRAFICA.map(t => ({ k: t.id, t: t.label }))}
          />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {config.tipoGrafica !== "dispersion" && (
              <>
                <Boton talla="sm" onClick={() => setMetricasAbierto(true)}>
                  Métricas
                  <span className="tabular-nums text-tinta-400">{config.seleccionadas.length}</span>
                </Boton>
                <Lista value={config.agrupar} className="h-8 w-[130px] text-[13px]"
                  aria-label="Agrupar"
                  onChange={ev => setConfig(c => ({ ...c, agrupar: ev.target.value }))}>
                  {AGRUPACIONES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </Lista>
              </>
            )}
            {config.tipoGrafica === "dispersion" && (
              <>
                {(["metricaX", "metricaY"] as const).map(eje => (
                  <Lista key={eje} value={config[eje]} className="h-8 w-[170px] text-[13px]"
                    aria-label={eje === "metricaX" ? "Eje X" : "Eje Y"}
                    onChange={ev => setConfig(c => ({ ...c, [eje]: ev.target.value }))}>
                    {METRICAS.map(g => (
                      <optgroup key={g.grupo} label={g.grupo}>
                        {g.items.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </optgroup>
                    ))}
                  </Lista>
                ))}
              </>
            )}
            <Lista value={config.filtroTipo} className="h-8 w-[110px] text-[13px]"
              aria-label="Filtrar por tipo"
              onChange={ev => setConfig(c => ({ ...c, filtroTipo: ev.target.value }))}>
              <option value="todos">Todo tipo</option>
              <option value="torre">Torres</option>
              <option value="casas">Casas</option>
            </Lista>
            <Lista value={config.filtroEstado} className="h-8 w-[130px] text-[13px]"
              aria-label="Filtrar por estado"
              onChange={ev => setConfig(c => ({ ...c, filtroEstado: ev.target.value }))}>
              <option value="todos">Todo estado</option>
              {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
            </Lista>
            <Boton talla="sm" tono="solido" onClick={fijar}>
              <Pin className="h-3.5 w-3.5" aria-hidden /> Fijar
            </Boton>
          </div>
        </header>
        <div className="p-5">
          <Grafica config={config} proyectos={proyectos} alto={300} />
        </div>
      </section>

      <Modal abierto={metricasAbierto} alCerrar={() => setMetricasAbierto(false)}
        titulo="Métricas de la gráfica" ancho={560}>
        <p className="text-[13px] text-tinta-500">
          Hasta tres a la vez; en torta manda la primera. Las de retorno dependen del flujo:
          sin cronograma valen «—», nunca cero.
        </p>
        <div className="mt-3 max-h-[380px] overflow-y-auto pr-1">
          {METRICAS.map(g => (
            <div key={g.grupo} className="mb-2">
              <div className="nota mb-1">{g.grupo}</div>
              <div className="grid gap-0.5 sm:grid-cols-2">
                {g.items.map(m => {
                  const dentro = config.seleccionadas.includes(m.id);
                  return (
                    <Casilla key={m.id} marcada={dentro}
                      deshabilitada={!dentro && config.seleccionadas.length >= 3}
                      alCambiar={v => setConfig(c => ({
                        ...c,
                        seleccionadas: v
                          ? [...c.seleccionadas, m.id]
                          : c.seleccionadas.filter(x => x !== m.id),
                      }))}
                      rotulo={m.label} />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------- la gráfica */

export function Grafica({
  config, proyectos, alto,
}: {
  config: ConfigGrafica;
  proyectos: ProyectoAnalizable[];
  alto: number;
}) {
  const barras = useMemo(
    () => (config.tipoGrafica !== "dispersion" ? buildChartData(config, proyectos) : null),
    [config, proyectos],
  );
  const scatter = useMemo(
    () => (config.tipoGrafica === "dispersion" ? buildScatterData(config, proyectos) : null),
    [config, proyectos],
  );

  if (config.tipoGrafica === "dispersion" && scatter) {
    if (scatter.sinDatos) return <Vacia />;
    return <Dispersion d={scatter} alto={alto} />;
  }
  if (!barras || barras.sinDatos || !barras.metricas.length) return <Vacia />;

  const filas = [...barras.filas].sort((a, b) => {
    if (config.orden === "nombre") return a.label.localeCompare(b.label);
    const va = a.valores[0] ?? -Infinity;
    const vb = b.valores[0] ?? -Infinity;
    return config.orden === "asc" ? va - vb : vb - va;
  });

  if (config.tipoGrafica === "tabla") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-[13px]">
          <thead>
            <tr className="text-tinta-400">
              <th className="px-3 py-2 text-left font-libro">Grupo</th>
              {barras.metricas.map(m => (
                <th key={m.id} className="px-3 py-2 text-right font-libro">{m.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map(f => (
              <tr key={f.label} className="border-t border-trazo-fino">
                <td className="px-3 py-2 text-tinta-900">{f.label}</td>
                {f.valores.map((v, i) => (
                  <td key={i} className="px-3 py-2 text-right font-medio tabular-nums text-tinta-950">
                    {fmtPorTipo(v, barras.metricas[i].tipo)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (config.tipoGrafica === "torta") {
    const m = barras.metricas[0];
    const datos = filas
      .map(f => ({ label: f.label, v: f.valores[0] ?? 0 }))
      .filter(d => d.v > 0);
    const total = datos.reduce((a, d) => a + d.v, 0) || 1;
    let angulo = -Math.PI / 2;
    const R = 70, r = 42, cx = 90, cy = 90;
    return (
      <div className="flex flex-wrap items-center gap-6">
        <svg viewBox="0 0 180 180" width={alto * 0.6} height={alto * 0.6} role="img"
             aria-label={`${m.label} repartido`}>
          {datos.map((d, i) => {
            const a0 = angulo;
            const a1 = angulo + (d.v / total) * Math.PI * 2;
            angulo = a1;
            const grande = a1 - a0 > Math.PI ? 1 : 0;
            const p = (a: number, rad: number) => `${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`;
            return (
              <path key={d.label}
                d={`M${p(a0, R)} A${R},${R} 0 ${grande} 1 ${p(a1, R)} L${p(a1, r)} A${r},${r} 0 ${grande} 0 ${p(a0, r)} Z`}
                fill={SERIE[i % SERIE.length]} opacity={0.85 - (i % 3) * 0.13}>
                <title>{`${d.label}: ${fmtPorTipo(d.v, m.tipo)} (${((d.v / total) * 100).toFixed(1)} %)`}</title>
              </path>
            );
          })}
        </svg>
        <div className="grid gap-1.5">
          {datos.map((d, i) => (
            <div key={d.label} className="flex items-baseline gap-2 text-[13px]">
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 translate-y-[1px] rounded-[3px]"
                style={{ background: SERIE[i % SERIE.length], opacity: 0.85 - (i % 3) * 0.13 }} />
              <span className="text-tinta-700">{d.label}</span>
              <span className="font-medio tabular-nums text-tinta-950">{fmtPorTipo(d.v, m.tipo)}</span>
              <span className="tabular-nums text-tinta-400">{((d.v / total) * 100).toFixed(1)} %</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* Barras horizontales, hasta tres métricas por grupo. */
  const tope = Math.max(1e-9, ...filas.flatMap(f => f.valores.map(v => Math.abs(v ?? 0))));
  return (
    <div>
      <div className="space-y-3">
        {filas.map(f => (
          <div key={f.label} className="grid items-center gap-x-3 sm:grid-cols-[170px_minmax(0,1fr)]">
            <span className="truncate text-[13px] text-tinta-700" title={f.label}>{f.label}</span>
            <div className="grid gap-1">
              {f.valores.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-[14px] flex-1 overflow-hidden rounded-[4px] bg-hueso-mesa">
                    <div className="h-full rounded-[4px]"
                      style={{
                        width: `${(Math.abs(v ?? 0) / tope) * 100}%`,
                        background: SERIE[i % SERIE.length],
                        opacity: (v ?? 0) < 0 ? 0.45 : 0.9,
                      }} />
                  </div>
                  <span className="w-[92px] shrink-0 text-right text-[12px] font-medio tabular-nums text-tinta-950">
                    {fmtPorTipo(v, barras.metricas[i].tipo)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {barras.metricas.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-tinta-500">
          {barras.metricas.map((m, i) => (
            <span key={m.id} className="flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-2 rounded-[3px]" style={{ background: SERIE[i % SERIE.length] }} />
              {m.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Dispersion({
  d, alto,
}: {
  d: ReturnType<typeof buildScatterData>;
  alto: number;
}) {
  const ancho = 640;
  const m = 46;
  const xs = d.puntos.map(p => p.x);
  const ys = d.puntos.map(p => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const px = (v: number) => m + ((v - x0) / (x1 - x0 || 1)) * (ancho - m * 2);
  const py = (v: number) => alto - m - ((v - y0) / (y1 - y0 || 1)) * (alto - m * 2);
  const fx = axisFmt(d.tipoX, x1);
  const fy = axisFmt(d.tipoY, y1);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="min-w-[480px]" role="img"
           aria-label={`${d.labelY} contra ${d.labelX}`}>
        <line x1={m} x2={ancho - m} y1={alto - m} y2={alto - m} stroke="var(--trazo-medio)" />
        <line x1={m} x2={m} y1={m} y2={alto - m} stroke="var(--trazo-medio)" />
        {d.puntos.map(p => (
          <g key={p.id}>
            <circle cx={px(p.x)} cy={py(p.y)} r="7" fill="rgb(var(--minio-600) / .75)"
              stroke="rgb(var(--hueso-alto))" strokeWidth="1.5">
              <title>{`${p.label}: ${fmtPorTipo(p.x, d.tipoX)} · ${fmtPorTipo(p.y, d.tipoY)}`}</title>
            </circle>
            <text x={px(p.x) + 10} y={py(p.y) + 3.5} fontSize="10.5" className="fill-tinta-700">
              {p.label.length > 20 ? p.label.slice(0, 18) + "…" : p.label}
            </text>
          </g>
        ))}
        <text x={ancho - m} y={alto - 10} textAnchor="end" fontSize="10" className="fill-tinta-400">
          {d.labelX} → {fx(x1)}
        </text>
        <text x={12} y={m - 8} fontSize="10" className="fill-tinta-400">
          {d.labelY} ↑ {fy(y1)}
        </text>
      </svg>
    </div>
  );
}

function Vacia() {
  return (
    <p className="py-10 text-center text-[13.5px] text-tinta-400">
      Nada que graficar con los filtros puestos: afloja el filtro o elige otra métrica.
    </p>
  );
}
