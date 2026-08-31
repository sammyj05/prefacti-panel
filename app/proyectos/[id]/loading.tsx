import { Esqueleto, EsqueletoTabla } from "@/components/ui";

/**
 * La ficha de proyecto, mientras carga.
 *
 * Reproduce la composición de la pantalla real —cabecera, dos columnas y la
 * primera pestaña con su tabla— y no un bloque genérico. Un esqueleto que no se
 * parece a lo que llega no ahorra la espera: la recorre dos veces, primero
 * leyendo una forma y después otra.
 */
export default function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando el proyecto">
      <Esqueleto alto={12} ancho={190} className="mb-4" />

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-3">
          <Esqueleto alto={30} ancho={320} />
          <Esqueleto alto={13} ancho={240} />
        </div>
        <div className="flex gap-2.5">
          <Esqueleto alto={36} ancho={112} className="rounded-[9px]" />
          <Esqueleto alto={36} ancho={140} className="rounded-[9px]" />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <div className="rounded-caja border border-trazo-fino bg-hueso-alto p-6">
            <div className="grid gap-6 sm:grid-cols-4">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="space-y-2.5">
                  <Esqueleto alto={10} ancho="70%" />
                  <Esqueleto alto={24} ancho="88%" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-6 border-b border-trazo-fino pb-3">
            {[74, 96, 78, 88, 62].map((w, i) => <Esqueleto key={i} alto={13} ancho={w} />)}
          </div>

          <EsqueletoTabla filas={8} columnas={5} />
        </div>

        <div className="space-y-5">
          <div className="rounded-caja border border-trazo-fino bg-hueso-alto p-6">
            <Esqueleto alto={10} ancho={110} className="mb-5" />
            <Esqueleto alto={150} ancho={150} redondo className="mx-auto" />
          </div>
          <div className="space-y-3 rounded-caja border border-trazo-fino bg-hueso-alto p-6">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center justify-between gap-4">
                <Esqueleto alto={11} ancho="46%" />
                <Esqueleto alto={11} ancho="28%" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
