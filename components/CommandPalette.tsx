"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, ArrowRight, Sparkles, LayoutDashboard, SearchX } from "lucide-react";
import { useRouter } from "next/navigation";
import { EDIFICIOS } from "@/lib/data";
import { pct } from "@/lib/format";
import { cx, MEDIO, RAPIDO, useSinScroll } from "@/lib/ui";

/**
 * La paleta de comandos.
 *
 * Se quedó atrás en dos cosas.
 *
 * La primera era el color: seguía escrita contra la paleta puente —`bg-navy-950`,
 * `border-line`, `text-ink-400`, `shadow-pop`—, que son los nombres viejos
 * reapuntados a los nuevos. Funcionaba, pero por caminos distintos que el resto
 * del panel, así que sus grises no eran exactamente los mismos y su canto
 * tampoco.
 *
 * La segunda era el foco. Con la paleta abierta, el tabulador recorría la página
 * de detrás: quien navega con teclado se quedaba pulsando sobre elementos
 * tapados por el velo, y al cerrar no volvía a donde estaba.
 *
 * Aquí el foco no se atrapa con el gancho general sino a mano, y por un motivo:
 * el campo de búsqueda tiene que conservarlo siempre —se escribe mientras las
 * flechas mueven la selección— así que el tabulador no debe repartirlo entre las
 * filas. Sólo hay un elemento enfocable, y las flechas hacen el resto.
 */

type Cmd = { g: string; t: string; hint?: string; sw?: string; ic?: "nav" | "ia"; run: () => void };

export function CommandPalette({
  open, onOpenChange, onOpenCopilot,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; onOpenCopilot: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const previo = useRef<HTMLElement | null>(null);

  const cmds = useMemo<Cmd[]>(() => [
    ...([["/proyectos","Proyectos"],["/mapa","Mapa"],["/simulador","Simulador"],["/graficos","Gráficos"],
         ["/hitos","Hitos"],["/recursos","Recursos"],["/alertas","Alertas"],
         ["/configuracion","Configuración"],["/","Portada"],["/wild","Portada Wild"],
         ["/clasico","Portada clásica"],["/entrar","Entrar"]] as const).map(([h, t]) => ({
      g: "Ir a", t, ic: "nav" as const, hint: h, run: () => router.push(h),
    })),
    { g: "Ir a", t: "Abrir el copiloto", ic: "ia", hint: "⌘J", run: onOpenCopilot },
    ...EDIFICIOS.map((e) => ({
      g: "Proyectos", t: e.nombre, sw: e.color,
      hint: `${e.id} · ${pct(e.margen)}`,
      run: () => router.push(`/proyectos/${e.id}`),
    })),
  ], [router, onOpenCopilot]);

  const res = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return cmds;
    return cmds.filter((c) => {
      const e = EDIFICIOS.find((x) => x.nombre === c.t);
      const extra = e ? `${e.id} ${e.distrito} ${e.tipo} ${e.etapa}` : "";
      return `${c.t} ${c.g} ${c.hint ?? ""} ${extra}`.toLowerCase().includes(s);
    });
  }, [q, cmds]);

  useEffect(() => { setI(0); }, [q]);
  useEffect(() => { if (open) { setQ(""); setI(0); } }, [open]);
  useSinScroll(open);

  /* El foco entra al campo al abrir y vuelve a su sitio al cerrar. Sin la
     segunda mitad, cerrar la paleta deja el foco en el cuerpo del documento y
     el siguiente tabulador arranca desde el principio de la página. */
  useEffect(() => {
    if (!open) return;
    previo.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => campo.current?.focus(), 20);
    return () => { clearTimeout(t); previo.current?.focus?.(); };
  }, [open]);

  const cerrar = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); onOpenChange(!open); return;
      }
      if (!open) return;
      if (e.key === "Escape") { e.preventDefault(); cerrar(); }
      /* El tabulador no reparte el foco: sólo hay un destino y ya lo tiene. */
      if (e.key === "Tab") { e.preventDefault(); campo.current?.focus(); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setI((p) => (p + (e.key === "ArrowDown" ? 1 : -1) + res.length) % Math.max(1, res.length));
      }
      if (e.key === "Enter") { e.preventDefault(); res[i]?.run(); cerrar(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, res, i, onOpenChange, cerrar]);

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [i]);

  let grupo = "";
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={RAPIDO}
          className="fixed inset-0 z-[300] flex items-start justify-center bg-tinta-950/45
                     px-4 pt-[12vh] backdrop-blur-[3px]"
          onClick={cerrar}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={MEDIO}
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label="Paleta de comandos"
            className="w-full max-w-[640px] overflow-hidden rounded-[14px] border border-trazo-fino
                       bg-hueso-alto shadow-flota"
          >
            <div className="flex items-center gap-3 border-b border-trazo-fino px-4 py-3.5">
              <Search className="h-[17px] w-[17px] shrink-0 text-tinta-400" aria-hidden />
              <input
                ref={campo}
                value={q} onChange={(e) => setQ(e.target.value)}
                aria-label="Buscar"
                aria-controls="paleta-lista"
                aria-activedescendant={res[i] ? `paleta-${i}` : undefined}
                placeholder="Buscar promociones, ir a una sección…"
                className="flex-1 bg-transparent text-[15px] text-tinta-950 outline-none
                           placeholder:text-tinta-400"
              />
              <kbd className="rounded-[5px] border border-trazo-fino px-1.5 py-0.5
                              font-mono text-[10px] text-tinta-400">ESC</kbd>
            </div>

            <div ref={listRef} id="paleta-lista" role="listbox" aria-label="Resultados"
                 className="max-h-[min(52vh,430px)] overflow-y-auto p-1.5">
              {res.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                  <SearchX className="h-5 w-5 text-tinta-400" aria-hidden />
                  <p className="text-[13.5px] font-medio text-tinta-950">Nada coincide con «{q}»</p>
                  <p className="text-[12.5px] text-tinta-500">
                    Busca por nombre de promoción, código, distrito o etapa.
                  </p>
                </div>
              )}
              {res.map((c, k) => {
                const head = c.g !== grupo ? ((grupo = c.g), true) : false;
                return (
                  <div key={c.t + k}>
                    {head && (
                      <div className="nota px-2.5 pb-1 pt-2.5 text-tinta-400">{c.g}</div>
                    )}
                    <button
                      id={`paleta-${k}`}
                      role="option" aria-selected={k === i}
                      onMouseEnter={() => setI(k)}
                      onClick={() => { c.run(); cerrar(); }}
                      className={cx(
                        "flex w-full items-center gap-3 rounded-[8px] px-2.5 py-2 text-left transition-colors",
                        k === i ? "bg-hueso-mesa" : "hover:bg-hueso-mesa/60",
                      )}
                    >
                      <span className="grid h-[18px] w-[18px] shrink-0 place-items-center">
                        {c.sw ? (
                          <span aria-hidden className="h-2 w-2 rounded-[3px]" style={{ background: c.sw }} />
                        ) : c.ic === "ia" ? (
                          <Sparkles className="h-[15px] w-[15px] text-minio-500" aria-hidden />
                        ) : (
                          <LayoutDashboard className="h-[15px] w-[15px] text-tinta-400" aria-hidden />
                        )}
                      </span>
                      <span className="truncate text-[13.5px] text-tinta-900">{c.t}</span>
                      {c.hint && (
                        <span className="ml-auto shrink-0 font-mono text-[11px] text-tinta-400">{c.hint}</span>
                      )}
                      {k === i && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-tinta-500" aria-hidden />}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 border-t border-trazo-fino bg-hueso px-4 py-2
                            text-[11px] text-tinta-400">
              <span><b className="font-mono text-tinta-700">↑↓</b> navegar</span>
              <span><b className="font-mono text-tinta-700">↵</b> abrir</span>
              <span className="ml-auto"><b className="font-mono text-tinta-700">⌘K</b></span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
