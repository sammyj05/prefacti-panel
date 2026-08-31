import { PortadaModerna } from "@/components/inicio/PortadaModerna";

/**
 * La portada moderna en 3D, como ruta propia.
 *
 * La forma normal de servirla es en su puerto, con `PORTADA=moderna`
 * (igual que móvil y volumen tienen el suyo); esta ruta existe para poder
 * verla también desde cualquier otra instancia.
 */
export const metadata = {
  title: "Prefacti — Ciudad de Panamá",
  description:
    "Factibilidad inmobiliaria sobre la bahía de Panamá. " +
    "Simula escenarios y modela versiones antes de comprometer capital en obra.",
};

export default function Moderna() {
  return <PortadaModerna />;
}
