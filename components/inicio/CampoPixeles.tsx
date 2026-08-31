"use client";

import { useMemo } from "react";

/**
 * Campo de píxeles suelto, para meter dentro de un panel.
 *
 * La trama grande de la portada va fija detrás de la página y tiene su rejilla
 * de 96×48 en constantes de módulo. Esto es lo contrario: una rejilla a medida
 * que se planta dentro de una pieza, con su propia densidad, para que el
 * modelo tridimensional no flote sobre un lienzo liso.
 *
 * Es el mismo material visual y por eso las dos capas se leen como una escena:
 * los píxeles del fondo continúan por detrás del edificio, y unos pocos —los
 * que `delante` enciende— se cuelan por encima del lienzo, que es lo que evita
 * que el modelo parezca pegado sobre una imagen.
 *
 * Determinista: el mismo `semilla` da el mismo campo en servidor y cliente, así
 * que no hay desajuste de hidratación ni parpadeo al montar.
 */

function ruido(i: number, semilla: number) {
  const x = Math.sin(i * 127.1 + semilla * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function CampoPixeles({
  cols = 48,
  filas = 26,
  semilla = 1,
  /** Fracción de celdas encendidas, de 0 a 1. */
  densidad = 0.16,
  /** Concentra las celdas hacia el borde inferior, como polvo asentado. */
  gravedad = 0.55,
  className = "",
  delante = false,
}: {
  cols?: number;
  filas?: number;
  semilla?: number;
  densidad?: number;
  gravedad?: number;
  className?: string;
  /** Variante de encima del lienzo: menos celdas y más contraste. */
  delante?: boolean;
}) {
  const celdas = useMemo(() => {
    const n = cols * filas;
    return Array.from({ length: n }, (_, i) => {
      const f = Math.floor(i / cols);
      /* Más probabilidad abajo: `peso` va de (1 − gravedad) arriba a 1 abajo. */
      const peso = 1 - gravedad + gravedad * ((f + 1) / filas);
      const r = ruido(i, semilla);
      if (r > 1 - densidad * peso) {
        /* Un sexto de las encendidas va en el acento; el resto en tinta. */
        return ruido(i + 977, semilla) > 0.84 ? 2 : 1;
      }
      return 0;
    });
  }, [cols, filas, semilla, densidad, gravedad]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${filas}, 1fr)`,
        gap: "1px",
        /* Aísla el repintado: el panel lo tiene fijo y no hace falta que el
           navegador lo vuelva a considerar al desplazar. */
        contain: "paint",
      }}
    >
      {celdas.map((v, i) => (
        <div
          key={i}
          style={{
            background:
              v === 0
                ? "transparent"
                : v === 2
                  ? `rgb(var(--minio-600) / ${delante ? 0.5 : 0.26})`
                  : `rgb(var(--tinta-950) / ${delante ? 0.32 : 0.14})`,
          }}
        />
      ))}
    </div>
  );
}
