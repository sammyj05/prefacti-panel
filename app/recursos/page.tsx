"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Table2, Image as ImgIcon, FileSpreadsheet, ChevronDown, Search, FolderOpen,
  FileSearch,
} from "lucide-react";
import { EDIFICIOS, tinte } from "@/lib/data";
import { Pagina } from "@/components/Pagina";
import { Boton, Entrada, Vacio } from "@/components/ui";

/**
 * Recursos.
 *
 * Era una rejilla de veintisiete tarjetas iguales. Veintisiete veces el mismo
 * icono, el mismo alto, la misma disposición, y el nombre del proyecto —que es
 * el único dato por el que alguien busca aquí— repetido en letra pequeña en
 * cada una. Encontrar los tres documentos de un proyecto obligaba a barrer la
 * rejilla entera tres veces.
 *
 * Los documentos cuelgan de un proyecto, así que la lista se organiza por
 * proyecto: una fila por promoción, plegada, con sus documentos dentro. Nueve
 * filas en vez de veintisiete tarjetas, y abrir una es una decisión, no un
 * barrido.
 *
 * El tipo de documento pasa de tarjeta a color de icono y extensión. Es
 * información secundaria: nadie busca «todos los CSV», busca «el flujo de caja
 * de Bahía Mar».
 */

/* Los cuatro tonos salen de la paleta, no de un hex suelto: eran los últimos
   colores del panel que no cambiaban con el tema, y en oscuro se quedaban
   apagados contra el fondo. */
const TIPOS = [
  { ic: FileSpreadsheet, t: "Presupuesto de obra", ext: "xlsx", tono: "rgb(var(--viable))" },
  { ic: FileText, t: "Permiso de construcción", ext: "pdf", tono: "rgb(var(--minio-600))" },
  { ic: Table2, t: "Flujo de caja", ext: "csv", tono: "rgb(var(--cian-700))" },
  { ic: ImgIcon, t: "Láminas de anteproyecto", ext: "pdf", tono: "rgb(var(--tenso))" },
];

const FECHA = new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", year: "numeric" });

/* La cartera con documentos. Se deriva una vez: es determinista y no depende
   de nada que cambie en pantalla. */
const CARPETAS = EDIFICIOS.slice(0, 9).map((e, i) => ({
  id: e.id,
  nombre: e.nombre,
  distrito: e.distrito,
  color: e.color,
  docs: TIPOS.slice(0, (i % 3) + 2).map((t, k) => ({
    ...t,
    peso: `${(0.4 + ((i * 7 + k * 3) % 47) / 10).toFixed(1)} MB`,
    fecha: new Date(2026, 7 - (i % 6), 2 + ((i * 5 + k) % 26)),
  })),
}));

const TOTAL = CARPETAS.reduce((s, c) => s + c.docs.length, 0);

export default function Recursos() {
  const [q, setQ] = useState("");
  /* Abre la primera al entrar: una lista donde todo está cerrado no enseña de
     qué va, y la primera fila es la que ya está bajo el ojo. */
  const [abierta, setAbierta] = useState<string | null>(CARPETAS[0]?.id ?? null);

  const lista = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return CARPETAS;
    return CARPETAS
      .map(c => ({
        ...c,
        docs: `${c.nombre} ${c.distrito}`.toLowerCase().includes(s)
          ? c.docs
          : c.docs.filter(d => d.t.toLowerCase().includes(s) || d.ext.includes(s)),
      }))
      .filter(c => c.docs.length > 0);
  }, [q]);

  return (
    <div>
      <Pagina
        icono={FolderOpen}
        titulo="Recursos"
        /* «Promociones», como en el resto del panel. Aquí ponía «proyectos» y
           en la pantalla de al lado «promociones», que son la misma cosa: dos
           palabras para un solo objeto obligan a comprobar cada vez que no es
           una tercera. */
        bajada={`${TOTAL} documentos en ${CARPETAS.length} promociones.`}
        acciones={
          /* El buscador deja de ser una pastilla. Era el último control del
             panel con canto redondo entero, y al lado de cualquier otro campo
             —los de la entrada, los del alta de empresa— se leía como de otra
             aplicación. Ahora es el mismo control que el resto, con su aro de
             foco y su altura. */
          <div className="relative w-full sm:w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4
                               -translate-y-1/2 text-tinta-400" aria-hidden />
            <Entrada
              type="search"
              aria-label="Buscar proyecto o documento"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar proyecto o documento…"
              className="pl-9"
            />
          </div>
        }
      />

      <div className="space-y-2.5">
        {lista.map((c, i) => {
          const abierto = abierta === c.id;
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.45 }}
              className="seccion overflow-hidden rounded-caja"
            >
              <button
                onClick={() => setAbierta(abierto ? null : c.id)}
                aria-expanded={abierto}
                className="flex w-full items-center gap-3.5 px-4 py-4 text-left transition
                           hover:bg-hueso-mesa/60 sm:gap-4 sm:px-5 sm:py-4"
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[9px]
                             text-[16px] font-medio leading-none"
                  style={{ background: tinte(c.color, 14), color: c.color }}
                  aria-hidden
                >
                  {c.nombre.charAt(0)}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medio text-tinta-950">
                    {c.nombre}
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] text-tinta-500">
                    {c.distrito}
                  </span>
                </span>

                <span className="shrink-0 rounded-full bg-hueso-mesa px-2.5 py-0.5 text-[12px]
                                 tabular-nums text-tinta-500">
                  {c.docs.length}
                </span>

                <motion.span
                  animate={{ rotate: abierto ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="shrink-0 text-tinta-400"
                >
                  <ChevronDown className="h-[18px] w-[18px]" />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {abierto && (
                  <motion.div
                    key="cuerpo"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    {/* En estrecho el nombre del documento ocupa su renglón y
                        los metadatos —fecha, extensión, peso— bajan a otro en
                        cuerpo menor. Apretados en una sola línea, el nombre se
                        quedaba en cuatro caracteres y un tipo de documento que
                        no se lee no sirve de nada. */}
                    <div className="border-t border-trazo-fino px-3 py-1.5 sm:px-5">
                      {c.docs.map((d, k) => (
                        <button
                          key={d.t + k}
                          className={`flex w-full items-center gap-3.5 rounded-[9px] px-2 py-3 text-left
                                      transition hover:bg-hueso-mesa/60
                                      ${k ? "border-t border-trazo-fino" : ""}`}
                        >
                          <span
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px]"
                            style={{ background: tinte(d.tono, 12) }}
                            aria-hidden
                          >
                            <d.ic className="h-[17px] w-[17px]" style={{ color: d.tono }} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] text-tinta-900">{d.t}</span>
                            <span className="mt-0.5 flex items-center gap-2 text-[12px] text-tinta-400 sm:hidden">
                              <span className="font-mono uppercase">{d.ext}</span>
                              <span aria-hidden>·</span>
                              <span className="tabular-nums">{d.peso}</span>
                              <span aria-hidden>·</span>
                              <span>{FECHA.format(d.fecha)}</span>
                            </span>
                          </span>
                          <span className="hidden shrink-0 text-[13px] text-tinta-400 sm:block">
                            {FECHA.format(d.fecha)}
                          </span>
                          <span className="hidden shrink-0 font-mono text-[11px] uppercase text-tinta-400 sm:block">
                            {d.ext}
                          </span>
                          <span className="hidden w-[62px] shrink-0 text-right font-mono text-[12px]
                                           tabular-nums text-tinta-500 sm:block">
                            {d.peso}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {lista.length === 0 && (
          <Vacio
            icono={FileSearch}
            titulo="Ningún documento coincide"
            detalle={`Nada en el archivo responde a «${q}». Busca por nombre de fichero, promoción o tipo.`}
            accion={<Boton onClick={() => setQ("")}>Quitar la búsqueda</Boton>}
          />
        )}
      </div>
    </div>
  );
}
