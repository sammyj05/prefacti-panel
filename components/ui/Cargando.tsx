import { Esqueleto, EsqueletoTabla } from "./Estado";

/**
 * El esqueleto de una pantalla de panel corriente.
 *
 * Las siete pantallas del panel comparten composición —cabecera con icono,
 * rótulo y bajada, una fila de controles y una o dos secciones— así que su
 * espera es la misma pieza con dos parámetros. Escribir siete ficheros de
 * `loading.tsx` a mano habría dado siete esperas ligeramente distintas, que es
 * exactamente el tipo de diferencia que se nota sin poder señalarla.
 *
 * Lo que importa no es el brillo sino la medida: si el hueco no mide lo mismo
 * que el contenido, la página salta al llegar los datos, y ese salto molesta
 * más que la espera que el esqueleto venía a disimular.
 */
export function CargandoPantalla({
  acciones = 1, forma = "tabla", filas = 8,
}: {
  /** Cuántos controles hay a la derecha de la cabecera. */
  acciones?: number;
  /** Qué ocupa el cuerpo: una tabla, una rejilla de fichas o un bloque suelto. */
  forma?: "tabla" | "rejilla" | "bloque";
  filas?: number;
}) {
  return (
    <div aria-busy="true">
      <div className="mb-9 flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <Esqueleto alto={48} ancho={48} className="rounded-pieza" />
          <div className="space-y-3 pt-1">
            <Esqueleto alto={26} ancho={220} />
            <Esqueleto alto={13} ancho="min(44ch, 60vw)" />
          </div>
        </div>
        <div className="flex gap-2.5">
          {Array.from({ length: acciones }, (_, i) => (
            <Esqueleto key={i} alto={36} ancho={i === 0 ? 128 : 104} className="rounded-[9px]" />
          ))}
        </div>
      </div>

      {forma === "tabla" && <EsqueletoTabla filas={filas} columnas={5} />}

      {forma === "rejilla" && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-4 rounded-caja border border-trazo-fino bg-hueso-alto p-5">
              <Esqueleto alto={14} ancho="55%" />
              <Esqueleto alto={11} ancho="35%" />
              <Esqueleto alto={64} />
            </div>
          ))}
        </div>
      )}

      {forma === "bloque" && (
        <div className="space-y-3 rounded-caja border border-trazo-fino bg-hueso-alto p-6">
          {Array.from({ length: filas }, (_, i) => (
            <div key={i} className="flex items-center justify-between gap-6">
              <Esqueleto alto={12} ancho={`${28 + ((i * 13) % 34)}%`} />
              <Esqueleto alto={12} ancho="18%" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
