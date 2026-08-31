"use client";

/**
 * El marco de teléfono.
 *
 * La misma dirección sirve para las dos cosas y ése es todo el truco: en un
 * teléfono la aplicación ocupa la pantalla entera, y en un escritorio se mete
 * dentro de un aparato de 390 × 844 sobre un fondo apagado. Así se puede
 * enseñar el diseño de móvil sin encoger la ventana ni abrir las herramientas
 * del navegador, y sin mantener dos versiones del mismo código.
 *
 * El corte va en 900 px de ancho y no en el `md` de costumbre: por debajo de
 * eso el marco tendría que encoger para caber, y un teléfono dibujado más
 * pequeño que un teléfono deja de parecerlo.
 *
 * `dvh` y no `vh` en el alto: en Safari de iOS la barra de direcciones se
 * recoge al desplazar y con `vh` la barra de pestañas de abajo queda cien
 * píxeles por debajo del borde durante todo el recorrido.
 */
export function Marco({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Teléfono de verdad: a pantalla completa, sin marco que estorbe. */}
      <div className="min-[900px]:hidden">
        <div className="min-h-[100dvh] bg-hueso">{children}</div>
      </div>

      {/* Escritorio: el aparato, centrado. */}
      <div className="hidden min-h-screen place-items-center bg-hueso-mesa px-6 py-10 min-[900px]:grid">
        <div className="flex items-center gap-14">
          <div className="max-w-[24rem]">
            <span className="nota">Prefacti · móvil</span>
            <h1 className="mt-5 font-display text-[clamp(2.2rem,3.4vw,3.2rem)] leading-[1.04] text-tinta-950">
              La cartera, en el bolsillo.
            </h1>
            <p className="mt-5 text-[16px] leading-relaxed text-tinta-700">
              No es el panel encogido. La navegación baja al pulgar, las fichas se
              vuelven filas y el detalle entra por abajo como una hoja.
            </p>
            <p className="mt-6 text-[13px] text-tinta-400">
              Ábrelo en un teléfono y el marco desaparece: es la misma dirección.
            </p>
          </div>

          {/* El aparato. Dos anillos y un canto de luz — sin botones ni cámara
              dibujados, que a este tamaño se leen como suciedad. */}
          <div
            className="relative shrink-0 rounded-[3.2rem] p-[10px]"
            style={{
              background: "linear-gradient(160deg, rgb(var(--tinta-700)), rgb(var(--tinta-950)))",
              boxShadow: "var(--sombra-3d-viva)",
            }}
          >
            <div className="pointer-events-none absolute inset-[3px] rounded-[3rem] ring-1 ring-inset ring-white/12" />
            <div className="relative h-[844px] w-[390px] overflow-hidden rounded-[2.6rem] bg-hueso">
              {/* La isla. Va aquí y no en la aplicación: es del aparato. */}
              <div className="pointer-events-none absolute left-1/2 top-2.5 z-50 h-[26px] w-[104px]
                              -translate-x-1/2 rounded-full bg-tinta-950" />
              <div className="h-full overflow-y-auto overscroll-contain">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
