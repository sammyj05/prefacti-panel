"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Check, Clock, Undo2, Bell, BellOff, Filter } from "lucide-react";
import { ALERTAS, SEV_TONO, type Alerta } from "@/lib/alertas";
import { EDIFICIOS, tinte } from "@/lib/data";
import { responsableDe } from "@/lib/equipo";
import { Pagina, Avatar } from "@/components/Pagina";
import { Boton, BotonIcono, Marbete, Pestanas, Vacio, useAviso } from "@/components/ui";

/**
 * Alertas.
 *
 * Era una lista. Una lista no es una bandeja: no se puede cerrar nada, no se
 * sabe de quién es cada cosa, y mañana enseña exactamente lo mismo que hoy —
 * que es la señal más clara de que una pantalla no está pensada para usarse,
 * sólo para verse.
 *
 * Lo que la convierte en herramienta son tres cosas: un dueño por aviso (que ya
 * está en el reparto de la cartera, no hay que inventarlo), la posibilidad de
 * cerrarlo o posponerlo, y un filtro por severidad. Las tres estaban a la vista
 * en los datos y ninguna se usaba.
 *
 * El estado vive en el navegador y se pierde al recargar. Es deliberado: no hay
 * servidor detrás, y guardarlo en `localStorage` haría creer que sí — el día
 * que alguien reabriera la pestaña en otro sitio y no encontrara sus avisos
 * cerrados, la mentira saldría cara.
 */

const SEVERIDADES = ["critica", "alta", "media", "info"] as const;
const ROTULO: Record<Alerta["sev"], string> = {
  critica: "Crítica", alta: "Alta", media: "Media", info: "Informativa",
};

type Estado = "abierta" | "resuelta" | "pospuesta";

export default function Alertas() {
  const [estados, setEstados] = useState<Record<string, Estado>>({});
  const aviso = useAviso();
  const [sev, setSev] = useState<Alerta["sev"] | "">("");
  const [verCerradas, setVerCerradas] = useState(false);

  const estadoDe = (id: string) => estados[id] ?? "abierta";
  /* Resolver una alerta la saca de la lista, y una fila que desaparece sin más
     no dice si se ha resuelto o si el filtro la ha escondido. El aviso lo
     confirma, y con el nombre de la promoción para que se vea cuál se fue. */
  const marcar = (id: string, e: Estado) => {
    setEstados(prev => ({ ...prev, [id]: e }));
    const a = ALERTAS.find(x => x.id === id);
    if (!a) return;
    if (e === "resuelta") aviso.bien("Alerta resuelta", a.proyecto);
    if (e === "pospuesta") aviso.info("Alerta pospuesta", `${a.proyecto} · vuelve al recalcular`);
    if (e === "abierta") aviso.info("Alerta reabierta", a.proyecto);
  };

  const porSev = useMemo(
    () => SEVERIDADES
      .map(s => ({ s, n: ALERTAS.filter(a => a.sev === s && estadoDe(a.id) === "abierta").length }))
      .filter(x => x.n > 0 || ALERTAS.some(a => a.sev === x.s)),
    [estados]);

  const lista = ALERTAS.filter(a =>
    (!sev || a.sev === sev) &&
    (verCerradas || estadoDe(a.id) === "abierta"));

  const abiertas = ALERTAS.filter(a => estadoDe(a.id) === "abierta").length;
  const cerradas = ALERTAS.length - abiertas;

  return (
    <div>
      <Pagina
        icono={Bell}
        titulo="Alertas"
        bajada={
          abiertas === 0
            ? "Ninguna alerta abierta. Se recalculan con el modelo: si un proyecto cambia, vuelven a aparecer."
            /* El participio concuerda con el número, como el sustantivo: con
               una sola alerta salía «1 alerta abierta, derivadas de las cifras
               del modelo». */
            : `${abiertas} ${abiertas === 1
                ? "alerta abierta, derivada"
                : "alertas abiertas, derivadas"} de las cifras del modelo.`
        }
        acciones={
          cerradas > 0 && (
            <Boton onClick={() => setVerCerradas(v => !v)}>
              {verCerradas ? "Ocultar cerradas" : `Ver ${cerradas} cerradas`}
            </Boton>
          )
        }
      >
        {/* El filtro por severidad pasa a la primitiva de pestañas: mismo
            indicador que viaja y mismo muelle que la banda y la cartera, y con
            él llegan las flechas del teclado. El punto de color delante es lo
            que distingue «crítica» de «alta» sin depender del color, que es lo
            que necesita quien no separa el rojo del ámbar. */}
        <Pestanas
          id="severidad"
          forma="pastilla"
          className="mt-8"
          activa={sev || "todas"}
          alElegir={k => setSev(k === "todas" ? "" : (k as Alerta["sev"]))}
          pestanas={[
            { k: "todas", t: "Todas", n: abiertas },
            ...porSev.map(({ s, n }) => ({
              k: s,
              n,
              t: (
                <span className="flex items-center gap-2">
                  <span aria-hidden className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: SEV_TONO[s] }} />
                  {ROTULO[s]}
                </span>
              ),
            })),
          ]}
        />
      </Pagina>

      {lista.length === 0 ? (
        <Vacio
          icono={abiertas === 0 ? BellOff : Filter}
          titulo={abiertas === 0 ? "Nada que revisar" : "Ninguna alerta con ese filtro"}
          detalle={
            abiertas === 0
              ? "Todas las promociones están dentro de los umbrales del comité."
              : "Prueba con otra severidad, o vuelve a todas."
          }
          accion={sev ? <Boton onClick={() => setSev("")}>Ver todas</Boton> : undefined}
        />
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {lista.map((a, i) => {
              const e = EDIFICIOS.find(x => x.nombre === a.proyecto);
              const est = estadoDe(a.id);
              const quien = e ? responsableDe(e.id) : null;
              const tono = SEV_TONO[a.sev];

              return (
                <motion.article
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: est === "abierta" ? 1 : 0.55, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.35 }}
                  className="seccion flex flex-wrap items-start gap-4 rounded-caja p-4 sm:p-5 md:flex-nowrap"
                >
                  <span
                    className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[9px]"
                    style={{ background: tinte(tono, 14) }}
                  >
                    <AlertTriangle className="h-[17px] w-[17px]" style={{ color: tono }} aria-hidden />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                      <h3 className="text-[15px] font-medio leading-snug text-tinta-950">{a.titulo}</h3>
                      <Marbete punto style={{ background: tinte(tono, 12),
                                              borderColor: "transparent", color: tono }}>
                        {ROTULO[a.sev]}
                      </Marbete>
                      {est !== "abierta" && (
                        <Marbete>{est === "resuelta" ? "Resuelta" : "Pospuesta"}</Marbete>
                      )}
                    </div>

                    <p className="mt-1.5 text-tinta-500">{a.detalle}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
                      <span className="font-medio tabular-nums" style={{ color: tono }}>{a.cifra}</span>
                      {e && (
                        <Link href={`/proyectos/${e.id}`}
                              className="text-tinta-700 underline decoration-trazo-medio underline-offset-4
                                         transition hover:text-tinta-950">
                          {a.proyecto}
                        </Link>
                      )}
                      {quien && (
                        <span className="flex items-center gap-1.5 text-tinta-400">
                          <Avatar u={quien.u} n={quien.n} tam={22} />
                          {quien.n}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Las acciones se van al final de la fila y a la línea de
                      abajo en estrecho. Antes envolvían por su cuenta y en un
                      teléfono quedaban a media altura del texto, sin que se
                      viera a qué aviso pertenecían. */}
                  <div className="flex w-full shrink-0 items-center gap-1.5 border-t border-trazo-fino
                                  pt-3 md:w-auto md:border-t-0 md:pt-0">
                    {est === "abierta" ? (
                      <>
                        <BotonIcono rotulo="Posponer" talla="sm"
                                    onClick={() => marcar(a.id, "pospuesta")}>
                          <Clock className="h-4 w-4" />
                        </BotonIcono>
                        <Boton talla="sm" onClick={() => marcar(a.id, "resuelta")}>
                          <Check className="h-4 w-4" aria-hidden /> Resolver
                        </Boton>
                      </>
                    ) : (
                      <Boton talla="sm" onClick={() => marcar(a.id, "abierta")}>
                        <Undo2 className="h-4 w-4" aria-hidden /> Reabrir
                      </Boton>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <p className="mt-8 text-[12.5px] text-tinta-400">
        Resolver o posponer afecta a esta sesión del navegador. No hay servidor detrás.
      </p>
    </div>
  );
}
