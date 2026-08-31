import { ExternalLink, Map as MapIcon } from "lucide-react";
import { EDIFICIOS } from "@/lib/data";
import { Pagina } from "@/components/Pagina";

/**
 * Mapa territorial de la cartera.
 *
 * El visor vive en `public/mapa/index.html`: es la aplicación APP_ED entera, un
 * único fichero que arranca MapLibre por su cuenta y trae sus propios paneles.
 * Se monta en un iframe en vez de reescribirse como componentes porque así
 * conserva su ciclo de vida —el mapa se inicializa una vez, sin que el árbol de
 * React lo desmonte al navegar— y porque su hoja de estilo es global y pisaría
 * la del panel.
 *
 * El visor modela sólo las promociones de la cartera; el resto de la ciudad es
 * contexto gris sin modelo financiero detrás, y se puede pinchar para estimar.
 */
export const metadata = { title: "Mapa — Prefacti" };

export default function Mapa() {
  return (
    <div>
      <Pagina
        icono={MapIcon}
        titulo="Mapa"
        bajada={`Las ${EDIFICIOS.length} promociones sobre el terreno: emplazamiento, volumetría y orden por ROI. El resto de la ciudad es contexto.`}
        acciones={
          <a href="/mapa/index.html" target="_blank" rel="noreferrer" className="boton">
            <ExternalLink className="h-4 w-4" /> Pantalla completa
          </a>
        }
      />

      <section className="seccion overflow-hidden rounded-caja">
        <iframe
          src="/mapa/index.html"
          title="Visor territorial de la cartera"
          className="block h-[calc(100vh-260px)] min-h-[620px] w-full border-0"
        />
      </section>
    </div>
  );
}
