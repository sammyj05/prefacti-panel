"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, X, Send } from "lucide-react";
import { EDIFICIOS, TOTALES, estadoDe } from "@/lib/data";
import { money, moneyC, pct, num } from "@/lib/format";
import { Cajon } from "@/components/ui";
import { cx } from "@/lib/ui";

type Msg = { de: "yo" | "ia"; texto?: string; titulo?: string; filas?: [string, string][] };

/**
 * Analiza la cartera de forma determinista. Es un motor de reglas, no un modelo
 * de lenguaje: no hay red ni claves, y las mismas cifras dan siempre la misma
 * respuesta. Para respuestas generativas, sustituye `responder` por una llamada
 * a la API y conserva la misma forma de `Msg`.
 */
function responder(clave: string): Msg {
  const ordenado = [...EDIFICIOS].sort((a, b) => b.margen - a.margen);
  if (clave === "riesgo") {
    const peores = ordenado.slice(-3).reverse();
    return {
      de: "ia", titulo: "Dónde está el riesgo",
      filas: peores.map((e) => [e.nombre, `margen ${pct(e.margen)} · exp. ${moneyC(e.exposicion)}`]),
    };
  }
  if (clave === "top") {
    return {
      de: "ia", titulo: "Mayor VAN de la cartera",
      filas: [...EDIFICIOS].sort((a, b) => b.van - a.van).slice(0, 4)
        .map((e) => [e.nombre, `${moneyC(e.van)} · TIR ${e.tir === null ? "n/d" : pct(e.tir)}`]),
    };
  }
  if (clave === "exposicion") {
    return {
      de: "ia", titulo: "Exposición de capital",
      filas: [...EDIFICIOS].sort((a, b) => b.exposicion - a.exposicion).slice(0, 4)
        .map((e) => [e.nombre, `${moneyC(e.exposicion)} · ${e.etapa}`]),
    };
  }
  const st = estadoDe(TOTALES.margen);
  return {
    de: "ia", titulo: "Resumen de cartera",
    texto:
      `${EDIFICIOS.length} edificios, ${TOTALES.activos} activos, ${num(TOTALES.gba)} m² GBA y ` +
      `${num(TOTALES.uds)} unidades. Ventas por ${money(TOTALES.ventas)} contra ${money(TOTALES.costo)} ` +
      `de costo: ${money(TOTALES.utilidad)} de utilidad y ${pct(TOTALES.margen)} de margen — ${st.t.toLowerCase()}. ` +
      `El VAN agregado al 12 % es ${moneyC(TOTALES.van)} y la suma de picos de caja llega a ${moneyC(TOTALES.exp)}. ` +
      `El mejor margen es ${ordenado[0].nombre} con ${pct(ordenado[0].margen)}; el más ajustado, ` +
      `${ordenado[ordenado.length - 1].nombre} con ${pct(ordenado[ordenado.length - 1].margen)}.`,
  };
}

const RAPIDAS: [string, string][] = [
  ["resumen", "Resumen de la cartera"],
  ["riesgo", "¿Dónde está el riesgo?"],
  ["top", "Mayor VAN"],
  ["exposicion", "Exposición de capital"],
];

/**
 * El copiloto.
 *
 * Pasa a montarse sobre el cajón de las primitivas, y con él llegan las tres
 * cosas que le faltaban: trampa de foco, cierre con escape y devolución del foco
 * al salir. Antes había que cerrarlo con el ratón.
 *
 * De paso se va la última pantalla escrita contra la paleta puente —los nombres
 * viejos, `bg-paper-raised`, `border-line`, `text-ink-300`— y una clase de
 * animación, `animate-pulseRing`, que no existía en la configuración de
 * Tailwind: llevaba tiempo sin pintar nada.
 *
 * La entrada libre sigue desactivada, pero ya no como un campo apagado sin
 * explicación: dice por qué, que es lo que separa una función pendiente de una
 * rota.
 */
export function CopilotSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { de: "ia", texto: `Tengo las ${EDIFICIOS.length} promociones cargadas. Puedo resumir la cartera, señalarte las que están en riesgo o clasificarlas por VAN y exposición.` },
  ]);
  const [pensando, setPensando] = useState(false);
  const hilo = useRef<HTMLDivElement>(null);

  /* El hilo baja solo al llegar una respuesta. Sin esto, la respuesta aparece
     fuera de cuadro y parece que no ha pasado nada. */
  useEffect(() => {
    hilo.current?.scrollTo({ top: hilo.current.scrollHeight, behavior: "smooth" });
  }, [msgs, pensando]);

  function preguntar(clave: string, etiqueta: string) {
    setMsgs((m) => [...m, { de: "yo", texto: etiqueta }]);
    setPensando(true);
    setTimeout(() => { setPensando(false); setMsgs((m) => [...m, responder(clave)]); }, 420);
  }

  return (
    <Cajon abierto={open} alCerrar={() => onOpenChange(false)} ancho={420} rotulo="Asistente">
      <header className="flex shrink-0 items-center gap-3 border-b border-trazo-fino px-4 py-3.5">
        <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-minio-100
                         ring-1 ring-inset ring-minio-500/20">
          <Sparkles className="h-4 w-4 text-minio-600" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-medio leading-tight text-tinta-950">Asistente</h2>
          <p className="text-[12px] text-tinta-400">Análisis determinista sobre tus cifras</p>
        </div>
        <button onClick={() => onOpenChange(false)} aria-label="Cerrar el copiloto"
          className="-mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-[8px] text-tinta-400
                     transition hover:bg-hueso-mesa hover:text-tinta-950">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div ref={hilo} className="flex-1 space-y-3 overflow-y-auto p-4"
           aria-live="polite" aria-label="Conversación">
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={cx(
              "text-[13px] leading-relaxed",
              m.de === "yo"
                ? "ml-auto w-fit max-w-[85%] rounded-[12px] rounded-br-[4px] bg-tinta-950 px-3 py-2 text-hueso"
                : "max-w-full rounded-[12px] rounded-bl-[4px] border border-trazo-fino bg-hueso px-3.5 py-3 text-tinta-900",
            )}>
            {m.titulo && <h3 className="mb-2 text-[12.5px] font-medio text-tinta-950">{m.titulo}</h3>}
            {m.texto}
            {m.filas?.map(([k, v]) => (
              <div key={k}
                className="flex items-baseline justify-between gap-3 border-t border-trazo-fino
                           py-1.5 first:border-0">
                <span className="text-tinta-500">{k}</span>
                <span className="tnum shrink-0 font-mono text-[11.5px] text-tinta-950">{v}</span>
              </div>
            ))}
          </motion.div>
        ))}
        {pensando && (
          <div className="w-fit rounded-[12px] rounded-bl-[4px] border border-trazo-fino
                          bg-hueso px-3.5 py-3.5">
            <span className="sr-only">Pensando</span>
            {[0, 1, 2].map((d) => (
              <motion.span key={d} aria-hidden
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{ duration: 1.05, repeat: Infinity, delay: d * 0.16 }}
                className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-tinta-400" />
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-trazo-fino p-3">
        <p className="nota mb-2 px-0.5 text-tinta-400">Preguntas</p>
        <div className="flex flex-wrap gap-1.5">
          {RAPIDAS.map(([k, t]) => (
            <button key={k} onClick={() => preguntar(k, t)} disabled={pensando}
              className="rounded-full border border-trazo-medio bg-hueso-alto px-3 py-1.5
                         text-[12.5px] text-tinta-700 transition hover:bg-hueso-mesa
                         hover:text-tinta-950 disabled:pointer-events-none disabled:opacity-45">
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-trazo-fino bg-hueso p-3">
        <div className="flex items-center gap-2">
          <input id="copiloto-libre" placeholder="Pregunta sobre la cartera…" disabled
            aria-describedby="copiloto-nota"
            className="h-9 flex-1 rounded-[8px] border border-trazo-fino bg-hueso-alto px-3
                       text-[13px] outline-none placeholder:text-tinta-400 disabled:opacity-60" />
          <button disabled aria-label="Enviar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border
                       border-trazo-fino opacity-50">
            <Send className="h-4 w-4 text-tinta-500" aria-hidden />
          </button>
        </div>
        <p id="copiloto-nota" className="mt-2 text-[11.5px] leading-relaxed text-tinta-400">
          Motor de reglas local: sin red y sin claves, así que la pregunta libre
          queda desactivada hasta conectar una API. La forma de los mensajes ya
          está lista para ello.
        </p>
      </div>
    </Cajon>
  );
}
