import { Marco } from "@/components/movil/Marco";
import { AppMovil } from "@/components/movil/App";

/**
 * Prefacti en móvil.
 *
 * Una sola dirección para las dos cosas: en un teléfono ocupa la pantalla
 * entera, y en un escritorio se enseña dentro de un aparato de 390 × 844. No
 * hay dos versiones del código — hay un diseño de móvil y un marco que sólo
 * aparece cuando la ventana es de escritorio.
 */
export const metadata = {
  title: "Prefacti móvil — Cartera Aravena",
  description: "La cartera en el bolsillo: navegación al pulgar, fichas en fila y detalle en hoja.",
};

export default function Movil() {
  return (
    <Marco>
      <AppMovil />
    </Marco>
  );
}
