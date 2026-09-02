"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, Redo2, Undo2 } from "lucide-react";
import type { Edificio } from "@/lib/data";
import { Boton, Marbete, Pestanas } from "@/components/ui";
import { modoPrecision, conModoPrecision } from "@/lib/motor/precision.js";
import { sembrarDesdePresupuesto, plazoDelMaster } from "@/lib/motor/flujoCaja.js";
import { usaEtapas } from "@/lib/motor/casasEtapas.js";
import type { DatosEstudio } from "@/lib/estudioLocal";
import { useEstudio } from "./useEstudio";
import { FormularioTorre } from "./FormularioTorre";
import { FormularioCasas } from "./FormularioCasas";
import { Resultados } from "./Resultados";
import { Chequeos } from "./Chequeos";
import { Umbrales } from "./Umbrales";
import { Puente } from "./Puente";
import { PresupuestoPanel } from "./Presupuesto";
import { FlujoCajaPanel } from "./FlujoCaja";

/**
 * El Master Finanzas de la promoción: el estudio completo, editable.
 *
 * Tres hojas —Master, Presupuesto, Flujo de caja— sobre un solo árbol de
 * datos, el mismo que guarda el producto, calculado siempre con el motor real.
 * Los cambios viven como borrador en este navegador: la versión original no se
 * toca y un gesto la recupera. Deshacer retrocede por pasos de trabajo.
 */

const SUAVE = [0.16, 1, 0.3, 1] as const;

const num = (v: unknown) => {
  const x = typeof v === "number" ? v : parseFloat(String(v));
  return isNaN(x) ? 0 : x;
};

export function Estudio({ e }: { e: Edificio }) {
  const est = useEstudio(e);
  const [hoja, setHoja] = useState("master");

  const modo = est.datos ? (modoPrecision(est.datos, e.etapa) as string) : "prefactibilidad";

  /* El interés del flujo, llevado al Master por la única vía: el botón.
     Torre: a `inputs.interesBancario`. Casas: repartido entre las etapas (o
     los modelos, si el proyecto no usa etapas) en proporción a su costo
     directo — el mismo criterio que usa el motor para montos fijos globales. */
  const aplicarInteres = (interesTotal: number) => {
    est.cambiar(prev => {
      if (est.tipo === "torre") {
        return {
          ...prev,
          inputs: { ...((prev.inputs ?? {}) as object), interesBancario: interesTotal },
        };
      }
      const clave = usaEtapas(prev) ? "etapas" : "modelos";
      const lista = ((prev[clave] ?? []) as Record<string, unknown>[]).map(x => ({ ...x }));
      const pesos = lista.map(x =>
        num(x.costoConstTipo) + num(x.costoIndTipo) + num(x.infraOriginario) +
        num(x.infraVida) + num(x.valorTerreno));
      const suma = pesos.reduce((a, b) => a + b, 0);
      lista.forEach((x, i) => {
        x.interesBancario = suma > 0 ? interesTotal * (pesos[i] / suma) : (i === 0 ? interesTotal : 0);
      });
      return { ...prev, [clave]: lista };
    });
  };

  /* El total del presupuesto, al costo de construcción del Master. */
  const aplicarPresupuesto = (total: number, destino: { modeloIndex?: number | null; campo?: string }) => {
    est.cambiar(prev => {
      if (est.tipo === "torre") {
        return { ...prev, inputs: { ...((prev.inputs ?? {}) as object), costoConstruccion: total } };
      }
      const campo = destino.campo || "costoConstTipo";
      const clave = usaEtapas(prev) ? "etapas" : "modelos";
      const lista = ((prev[clave] ?? []) as Record<string, unknown>[]).map(x => ({ ...x }));
      if (!lista.length) return prev;
      if (Number.isInteger(destino.modeloIndex) && lista[destino.modeloIndex as number]) {
        lista[destino.modeloIndex as number][campo] = total;
      } else if (lista.length === 1) {
        lista[0][campo] = total;
      } else {
        const pesos = lista.map(x =>
          num(x.costoConstTipo) + num(x.costoIndTipo) + num(x.infraOriginario) +
          num(x.infraVida) + num(x.valorTerreno));
        const suma = pesos.reduce((a, b) => a + b, 0);
        lista.forEach((x, i) => {
          x[campo] = suma > 0 ? total * (pesos[i] / suma) : total / lista.length;
        });
      }
      return { ...prev, [clave]: lista };
    });
  };

  /* Las fases del presupuesto, sembradas como actividades del flujo. */
  const sembrarFlujo = (partidas: { nombre: string; total: number }[]) => {
    est.cambiar(prev => {
      const plazo = num((prev.flujoParams as Record<string, unknown> | undefined)?.plazoObra) ||
        num(plazoDelMaster(prev)) || 30;
      return { ...prev, flujoActividades: sembrarDesdePresupuesto(partidas, plazo) };
    });
    setHoja("flujo");
  };

  const pestanas = useMemo(() => [
    { k: "master", t: "Master" },
    { k: "presupuesto", t: "Presupuesto" },
    { k: "flujo", t: "Flujo de caja" },
  ], []);

  if (!est.datos) {
    return (
      <section className="mt-6 rounded-caja border border-trazo-fino bg-hueso-alto p-8 text-center text-[14px] text-tinta-400">
        Esta promoción no trae el estudio crudo: las herramientas interactivas no pueden abrirse.
      </section>
    );
  }

  return (
    <section className="mt-6 overflow-hidden rounded-caja border border-trazo-fino bg-hueso-alto">
      <div className="flex flex-wrap items-center gap-3 border-b border-trazo-fino px-5 pt-4">
        <h2 className="text-[16px] font-medio text-tinta-950">Master Finanzas</h2>
        {est.conBorrador && (
          <Marbete tono="aviso" punto>Borrador local</Marbete>
        )}
        <div className="ml-auto flex items-center gap-1.5 pb-1">
          <Boton talla="sm" tono="fantasma" onClick={est.deshacer} disabled={!est.puedeDeshacer}
            title="Deshacer">
            <Undo2 className="h-4 w-4" aria-hidden />
            {est.pasos > 0 && <span className="font-mono text-[10.5px] tabular-nums">{est.pasos}</span>}
          </Boton>
          <Boton talla="sm" tono="fantasma" onClick={est.rehacer} disabled={!est.puedeRehacer}
            title="Rehacer">
            <Redo2 className="h-4 w-4" aria-hidden />
          </Boton>
          <Boton talla="sm" onClick={est.restablecer} disabled={!est.conBorrador}
            title="Descartar el borrador y volver al estudio original">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Original
          </Boton>
        </div>
        <div className="w-full">
          <Pestanas id="estudio" activa={hoja} alElegir={setHoja} pestanas={pestanas} />
        </div>
      </div>

      <div className="p-5 md:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={hoja}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: SUAVE }}
          >
            {hoja === "master" && (
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-w-0">
                  {est.tipo === "torre" ? (
                    <FormularioTorre datos={est.datos} alCambiar={est.cambiar} resultado={est.resultado} />
                  ) : (
                    <FormularioCasas datos={est.datos} alCambiar={est.cambiar} resultado={est.resultado} />
                  )}
                </div>
                <aside className="min-w-0 space-y-7 lg:border-l lg:border-trazo-fino lg:pl-7">
                  <Resultados
                    resultado={est.resultado}
                    datos={est.datos}
                    tipo={est.tipo}
                    retorno={est.retorno}
                    modo={modo}
                    alCambiarModo={m => est.cambiar(conModoPrecision(est.datos, m) as DatosEstudio)}
                  />
                  <Chequeos
                    datos={est.datos}
                    resultado={est.resultado}
                    tipo={est.tipo}
                    alCambiar={d => est.cambiar(d)}
                    alIr={setHoja}
                  />
                  <Umbrales
                    datos={est.datos}
                    resultado={est.resultado}
                    tipo={est.tipo}
                    alCambiar={d => est.cambiar(d)}
                  />
                </aside>
                {est.conBorrador && est.original && (
                  <div className="lg:col-span-2">
                    <Puente original={est.original} editado={est.datos} tipo={est.tipo} />
                  </div>
                )}
              </div>
            )}

            {hoja === "presupuesto" && (
              <PresupuestoPanel
                datos={est.datos}
                alCambiar={est.cambiar}
                alAplicarAlMaster={aplicarPresupuesto}
                alSembrarFlujo={sembrarFlujo}
                tipo={est.tipo}
              />
            )}

            {hoja === "flujo" && (
              <FlujoCajaPanel
                datos={est.datos}
                alCambiar={est.cambiar}
                resultado={est.resultado}
                tipo={est.tipo}
                alAplicarInteres={aplicarInteres}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
