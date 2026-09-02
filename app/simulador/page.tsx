"use client";

import { useMemo } from "react";
import { EDIFICIOS } from "@/lib/data";
import { datosOriginales, tipoMotor } from "@/lib/estudioLocal";
import { SimuladorEstudio, type ProyectoSimulable } from "@/components/simulador/SimuladorEstudio";

/**
 * El simulador de escenarios de la cartera.
 *
 * La pantalla vive en `components/simulador` y aquí sólo se le da la cartera:
 * cada promoción con su estudio crudo —el mismo árbol que guarda el producto—
 * para que los deslizadores pasen por el motor de verdad. Una promoción sin
 * estudio no se puede simular y se queda fuera de la lista, en vez de entrar
 * con ceros que parecerían un resultado.
 */
export default function Simulador() {
  const proyectos = useMemo<ProyectoSimulable[]>(
    () => EDIFICIOS.flatMap(e => {
      const datos = datosOriginales(e);
      return datos ? [{ id: e.id, nombre: e.nombre, tipo: tipoMotor(e), datos }] : [];
    }),
    [],
  );

  return <SimuladorEstudio proyectos={proyectos} />;
}
