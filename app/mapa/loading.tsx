import { Esqueleto } from "@/components/ui";

/**
 * El visor territorial tarda porque arrastra MapLibre entero. El hueco tiene
 * exactamente el alto que va a ocupar el mapa, así que la página no salta al
 * llegar.
 */
export default function Cargando() {
  return (
    <div aria-busy="true">
      <div className="mb-9 flex items-start gap-4">
        <Esqueleto alto={48} ancho={48} className="rounded-[12px]" />
        <div className="space-y-3 pt-1">
          <Esqueleto alto={26} ancho={140} />
          <Esqueleto alto={13} ancho="min(56ch, 70vw)" />
        </div>
      </div>
      <Esqueleto className="h-[calc(100vh-260px)] min-h-[620px] rounded-[14px]" />
    </div>
  );
}
