/**
 * Fondo de aurora.
 *
 * Sustituye al mosaico de píxeles de la portada anterior. Aquel tenía una
 * virtud —llevaba la palabra PREFACTI escondida dentro— y un defecto que se la
 * comía entera: era una trama de rojo y amarillo saturados a pantalla completa,
 * con bordes duros cada pocos píxeles, y cualquier texto puesto encima quedaba
 * compitiendo contra su propio fondo. Ni tapándolo con vidrio se arreglaba.
 *
 * Esto pone el mismo color, y más, pero a baja frecuencia: cuatro manchas muy
 * desenfocadas que derivan despacio. No hay un solo borde duro contra el que un
 * titular tenga que defenderse, y el color sigue estando ahí — que es lo que se
 * pedía.
 *
 * No lleva estado ni JavaScript: son cuatro `div` y cuatro animaciones de CSS,
 * resueltas en el compositor. El mosaico movía 4.608 nodos por fotograma.
 */
export function Aurora({
  className = "",
  intensidad = 1,
}: {
  className?: string;
  /** Multiplica la opacidad de los focos. Las secciones interiores la bajan. */
  intensidad?: number;
}) {
  return (
    <div
      aria-hidden
      className={`grano pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ ["--aurora-mult" as string]: intensidad }}
    >
      <span
        className="foco foco-1"
        style={{
          background: "var(--aurora-1)",
          width: "58vw", height: "58vw", top: "-18%", left: "-12%",
          opacity: `calc(var(--aurora-opacidad) * ${intensidad})`,
        }}
      />
      <span
        className="foco foco-2"
        style={{
          background: "var(--aurora-2)",
          width: "52vw", height: "52vw", top: "-8%", right: "-10%",
          opacity: `calc(var(--aurora-opacidad) * ${intensidad})`,
        }}
      />
      <span
        className="foco foco-3"
        style={{
          background: "var(--aurora-3)",
          width: "46vw", height: "46vw", bottom: "-22%", left: "18%",
          opacity: `calc(var(--aurora-opacidad) * ${intensidad * 0.85})`,
        }}
      />
      <span
        className="foco foco-4"
        style={{
          background: "var(--aurora-4)",
          width: "40vw", height: "40vw", bottom: "-14%", right: "6%",
          opacity: `calc(var(--aurora-opacidad) * ${intensidad * 0.9})`,
        }}
      />
    </div>
  );
}
