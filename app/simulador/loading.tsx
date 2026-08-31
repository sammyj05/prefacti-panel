import { CargandoPantalla } from "@/components/ui/Cargando";

/** Los deslizadores a la izquierda y la tabla de sensibilidad a la derecha. */
export default function Cargando() {
  return <CargandoPantalla acciones={2} forma="tabla" filas={7} />;
}
