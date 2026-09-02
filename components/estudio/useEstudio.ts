"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Edificio } from "@/lib/data";
import {
  borrarBorrador, datosOriginales, guardarBorrador, leerBorrador,
  tipoMotor, type DatosEstudio,
} from "@/lib/estudioLocal";
import { calcularFactibilidad } from "@/lib/motor/calculations.js";
import { calcularMetricasRetorno } from "@/lib/motor/metricasRetorno.js";

/**
 * El estado del estudio en edición.
 *
 * Un solo árbol de datos —el mismo que guarda el producto— y un solo camino de
 * cambio: `cambiar` registra la instantánea para deshacer, actualiza y
 * persiste el borrador en el navegador. Todo lo que se lee del estudio
 * —resultado, retorno— sale de aquí, calculado con el motor, para que el
 * formulario, los resultados y el flujo nunca puedan divergir.
 *
 * Deshacer por pasos de trabajo, no por teclas: los cambios «suaves» (una
 * pulsación en un campo) se agrupan si llegan dentro de la misma ventana, así
 * el botón retrocede campo a campo, como en el producto.
 */

const MAX_PASOS = 60;
const VENTANA_SUAVE = 900; // ms

export type Resultado = Record<string, number>;

export function useEstudio(e: Edificio) {
  const tipo = tipoMotor(e);
  const original = useMemo(() => datosOriginales(e), [e]);

  const [datos, setDatos] = useState<DatosEstudio | null>(original);
  const [conBorrador, setConBorrador] = useState(false);
  const [pila, setPila] = useState<DatosEstudio[]>([]);
  const [pilaRehacer, setPilaRehacer] = useState<DatosEstudio[]>([]);
  const ultimoSuave = useRef(0);
  const datosRef = useRef(datos);
  useEffect(() => { datosRef.current = datos; }, [datos]);

  /* El borrador guardado, si existe, gana al original al montar. */
  useEffect(() => {
    const b = leerBorrador(e.id);
    if (b) { setDatos(b); setConBorrador(true); }
  }, [e.id]);

  const persistir = useCallback((d: DatosEstudio) => {
    guardarBorrador(e.id, d);
    setConBorrador(true);
  }, [e.id]);

  const cambiar = useCallback((
    siguiente: DatosEstudio | ((prev: DatosEstudio) => DatosEstudio),
    opciones?: { suave?: boolean },
  ) => {
    const previo = datosRef.current;
    if (!previo) return;
    const ahora = Date.now();
    const agrupar = opciones?.suave && ahora - ultimoSuave.current < VENTANA_SUAVE;
    if (!agrupar) {
      setPila(p => [...p.slice(-MAX_PASOS + 1), previo]);
      setPilaRehacer([]);
    }
    if (opciones?.suave) ultimoSuave.current = ahora;

    const d = typeof siguiente === "function" ? siguiente(previo) : siguiente;
    setDatos(d);
    persistir(d);
  }, [persistir]);

  const deshacer = useCallback(() => {
    setPila(p => {
      const previo = p[p.length - 1];
      if (!previo || !datosRef.current) return p;
      setPilaRehacer(r => [...r, datosRef.current as DatosEstudio]);
      setDatos(previo);
      persistir(previo);
      return p.slice(0, -1);
    });
  }, [persistir]);

  const rehacer = useCallback(() => {
    setPilaRehacer(r => {
      const sig = r[r.length - 1];
      if (!sig || !datosRef.current) return r;
      setPila(p => [...p, datosRef.current as DatosEstudio]);
      setDatos(sig);
      persistir(sig);
      return r.slice(0, -1);
    });
  }, [persistir]);

  /** Vuelve al estudio original y descarta el borrador local. */
  const restablecer = useCallback(() => {
    if (!original) return;
    borrarBorrador(e.id);
    setDatos(original);
    setConBorrador(false);
    setPila([]);
    setPilaRehacer([]);
  }, [e.id, original]);

  const resultado = useMemo(
    () => (datos ? (calcularFactibilidad(datos, tipo) as unknown as Resultado) : null),
    [datos, tipo],
  );

  const retorno = useMemo(
    () => (datos
      ? calcularMetricasRetorno({ datos, resultado, tipo }) as unknown as {
          completo: boolean;
          motivo: string | null;
          metricas: Record<string, number | string | null> | null;
          acumulado: number[];
          acumuladoDescontado: number[];
          supuestos: { k: string; p: Record<string, number | string> }[];
          identidad?: { sumaVector: number; utilidad: number; cuadra: boolean };
          horizonte?: number;
        }
      : null),
    [datos, resultado, tipo],
  );

  return {
    tipo, datos, original, conBorrador,
    cambiar, deshacer, rehacer, restablecer,
    puedeDeshacer: pila.length > 0,
    puedeRehacer: pilaRehacer.length > 0,
    pasos: pila.length,
    resultado, retorno,
  };
}

export type Estudio = ReturnType<typeof useEstudio>;
