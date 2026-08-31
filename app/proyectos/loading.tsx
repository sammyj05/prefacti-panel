import { Esqueleto, EsqueletoFicha } from "@/components/ui";

/**
 * La cartera, mientras carga.
 *
 * No es un giro en mitad de la pantalla sino el hueco exacto de lo que va a
 * llegar: la cabecera, el panel del consolidado, la barra de filtros y seis
 * fichas. Lo que importa es la medida — si el hueco no mide lo mismo que el
 * contenido, la página salta al llegar los datos, y ese salto molesta más que
 * la espera que el esqueleto venía a disimular.
 *
 * Seis fichas y no dieciocho: llenar la pantalla de rectángulos grises promete
 * una cartera larga antes de saber si la hay.
 */
export default function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando la cartera">
      <div className="mb-9 flex items-start gap-4">
        <Esqueleto alto={48} ancho={48} className="rounded-pieza" />
        <div className="flex-1 space-y-3 pt-1">
          <Esqueleto alto={26} ancho={260} />
          <Esqueleto alto={13} ancho="min(46ch, 100%)" />
        </div>
      </div>

      <div className="rounded-caja border border-trazo-fino bg-hueso-alto">
        <div className="space-y-4 p-8">
          <Esqueleto alto={10} ancho={140} />
          <Esqueleto alto={54} ancho={300} />
          <Esqueleto alto={12} ancho={220} />
        </div>
        <div className="grid border-t border-trazo-fino sm:grid-cols-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="space-y-3 border-t border-trazo-fino p-6 first:border-t-0 sm:border-t-0">
              <Esqueleto alto={10} ancho="55%" />
              <Esqueleto alto={26} ancho="70%" />
              <Esqueleto alto={11} ancho="85%" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-9 flex flex-wrap gap-6 border-t border-trazo-fino pt-5">
        {[0, 1, 2, 3, 4, 5].map(i => <Esqueleto key={i} alto={13} ancho={92} />)}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2.5">
        <Esqueleto alto={36} className="min-w-[280px] flex-1 rounded-[9px]" />
        <Esqueleto alto={36} ancho={72} className="rounded-[9px]" />
        <Esqueleto alto={36} ancho={132} className="rounded-[9px]" />
        <Esqueleto alto={36} ancho={148} className="rounded-[9px]" />
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map(i => <EsqueletoFicha key={i} />)}
      </div>
    </div>
  );
}
