import { Building2 } from "lucide-react";
import { Pagina } from "@/components/Pagina";
import { FormularioProyecto } from "@/components/FormularioProyecto";
import { quienPregunta } from "@/lib/supabase/servidor";
import { HAY_SUPABASE_SERVIDOR } from "@/lib/supabase/hay";

/**
 * Nueva promoción.
 *
 * Pide lo mínimo: nombre, tipo, estado y dónde está. Todo lo demás —cuadro de
 * áreas, presupuesto, calendario— se carga después desde la ficha, porque son
 * pantallas enteras y meterlas aquí convertiría el alta en un formulario de
 * cuarenta campos que nadie termina.
 *
 * El tipo es la única decisión que no se puede cambiar luego sin rehacer el
 * estudio: una torre se mide por plantas y unidades y un conjunto de casas por
 * etapas y modelos, y el motor calcula cada uno con sus reglas.
 */
export default async function NuevoProyecto() {
  if (!HAY_SUPABASE_SERVIDOR) {
    return (
      <div className="max-w-[46rem]">
        <Pagina icono={Building2} titulo="Nueva promoción"
                bajada="Necesita base de datos: la cartera de demostración es de sólo lectura." />
      </div>
    );
  }

  const yo = await quienPregunta();
  const puede = yo?.rol === "admin" || yo?.rol === "editor";

  return (
    <div className="max-w-[46rem]">
      <Pagina
        icono={Building2}
        titulo="Nueva promoción"
        bajada={puede
          ? "Lo mínimo para empezar. El estudio se carga después, desde la ficha."
          : "Tu permiso no deja crear promociones."}
      />
      {puede && <FormularioProyecto />}
    </div>
  );
}
