"use client";

import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { crearProyecto } from "@/lib/acciones/proyectos";
import { Boton, Campo, Entrada, Lista } from "@/components/ui";

/**
 * El alta de una promoción.
 *
 * Envía a una acción de servidor, no a una llamada desde el navegador. Es lo
 * que hace que la comprobación de permiso y la escritura ocurran donde está la
 * sesión —y no donde alguien puede saltárselas— y de paso ahorra tener que
 * exponer la clave de servicio a ningún sitio.
 *
 * El botón se queda pensando mientras dura la escritura porque son dos filas y
 * una redirección: sin eso se puede pulsar dos veces y salen dos promociones
 * con el mismo nombre.
 */

const TIPOS = [
  { k: "torre", t: "Torre residencial", d: "Se mide por plantas y unidades." },
  { k: "casas", t: "Conjunto de casas", d: "Se mide por etapas y modelos de vivienda." },
];

const ESTADOS = ["En estudio", "Aprobado", "Activo", "Finalizado", "Archivado"];

export function FormularioProyecto() {
  const [tipo, setTipo] = useState("torre");
  const [error, setError] = useState<string>();
  const [enviando, empezar] = useTransition();

  return (
    <form
      action={fd => empezar(async () => {
        const r = await crearProyecto(fd);
        /* Si todo va bien la acción redirige y esto no llega a ejecutarse. */
        if (r?.error) setError(r.error);
      })}
      className="seccion rounded-caja px-6 py-6"
    >
      <div className="grid gap-4">
        <Campo rotulo="Nombre" requerido error={error}>
          {p => (
            <Entrada name="nombre" required autoFocus
                     placeholder="Mirador del Este"
                     className="h-11 text-[15px]" {...p} />
          )}
        </Campo>

        <Campo rotulo="Tipo" requerido
               ayuda={TIPOS.find(t => t.k === tipo)?.d}>
          {p => (
            <Lista name="tipo" value={tipo}
                   onChange={e => setTipo(e.target.value)} {...p}>
              {TIPOS.map(t => <option key={t.k} value={t.k}>{t.t}</option>)}
            </Lista>
          )}
        </Campo>

        <Campo rotulo="Estado" requerido>
          {p => (
            <Lista name="estado" defaultValue="En estudio" {...p}>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </Lista>
          )}
        </Campo>

        <Campo rotulo="Punto de partida" requerido
               ayuda="La plantilla trae capítulos, partidas, tipologías y actividades de obra con cifras de arranque. Se editan encima.">
          {p => (
            <Lista name="desde" defaultValue="plantilla" {...p}>
              <option value="plantilla">Plantilla del sector — recomendado</option>
              <option value="blanco">En blanco</option>
            </Lista>
          )}
        </Campo>

        <Campo rotulo="Ubicación" ayuda="Barrio, corregimiento o provincia.">
          {p => (
            <Entrada name="ubicacion" placeholder="Costa del Este"
                     className="h-11 text-[15px]" {...p} />
          )}
        </Campo>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Boton type="submit" tono="solido" talla="lg" cargando={enviando}>
          Crear promoción <ArrowRight className="h-4 w-4" aria-hidden />
        </Boton>
        <span className="text-[13px] text-tinta-500">
          Con plantilla el estudio nace calculado; en blanco, en ceros hasta que
          cargues el cuadro de áreas y el presupuesto.
        </span>
      </div>
    </form>
  );
}
