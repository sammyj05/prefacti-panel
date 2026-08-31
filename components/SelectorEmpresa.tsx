"use client";

import { useState } from "react";
import { Building2, ChevronDown, Plus } from "lucide-react";
import { INDUSTRIAS, nombreIndustria, useEmpresas, type Industria } from "@/lib/empresas";
import {
  Boton, Campo, Entrada, Lista, Menu, MenuFilete, MenuItem, MenuRotulo, useAviso,
} from "@/components/ui";
import { cx } from "@/lib/ui";

/**
 * El conmutador de empresa.
 *
 * Era una pastilla con un nombre escrito a mano. En Prefacti una cuenta trabaja
 * sobre varias empresas —cada una con sus proyectos y sus permisos— así que lo
 * que hace falta ahí es poder ver en cuál se está, saltar a otra y abrir una
 * nueva sin salir de la pantalla.
 *
 * Sale dos veces a la vez: en la banda del escritorio y dentro del cajón del
 * teléfono. Por eso la lista vive en `lib/empresas` y no aquí — dos copias con
 * su propio estado enseñarían cosas distintas después del primer cambio.
 */
export function SelectorEmpresa({ ancho = "auto", sesion }: {
  ancho?: "auto" | "lleno";
  /**
   * La empresa de la sesión, cuando hay base detrás.
   *
   * Manda sobre la lista local. Esa lista vive en `localStorage` y era la única
   * fuente cuando no había servidor; con sesión de verdad, la empresa la decide
   * `perfil.empresa_activa_id`, y enseñar la del navegador significaba que
   * alguien recién registrado veía en la banda el nombre de la empresa de otro
   * —la que quedó guardada de la última visita a la demostración—.
   *
   * Mientras no exista el cambio de empresa contra la base, con sesión el
   * conmutador es un rótulo: enseña dónde estás y no promete saltar a ningún
   * sitio.
   */
  sesion?: { nombre: string } | null;
}) {
  const { lista, activa, activaId, elegir, crear } = useEmpresas();
  const [creando, setCreando] = useState(false);
  const aviso = useAviso();
  const lleno = ancho === "lleno";

  if (sesion) {
    return (
      <span
        className={cx(
          "flex items-center gap-2 rounded-[8px] border border-trazo-fino text-[13px]",
          "text-tinta-900",
          lleno ? "h-11 w-full px-3 text-[14px]" : "h-9 px-2.5",
        )}
      >
        <Building2 className="h-[15px] w-[15px] shrink-0 text-tinta-400" aria-hidden />
        <span className="truncate font-medio">{sesion.nombre}</span>
      </span>
    );
  }

  return (
    <Menu
      rotulo="Empresa activa"
      ancho={lleno ? 274 : 292}
      disparador={({ alternar, abierto, aria }) => (
        <button
          onClick={alternar}
          {...aria}
          className={cx(
            "flex items-center gap-2 rounded-[8px] border border-trazo-fino text-[13px]",
            "text-tinta-900 transition hover:border-trazo-medio hover:bg-hueso-mesa",
            lleno ? "h-11 w-full px-3 text-[14px]" : "h-9 px-2.5",
          )}
        >
          <Building2 className="h-[15px] w-[15px] shrink-0 text-tinta-400" aria-hidden />
          <span className={cx("truncate font-medio", lleno ? "flex-1 text-left" : "max-w-[150px]")}>
            {activa?.nombre}
          </span>
          <ChevronDown
            className={cx("h-[14px] w-[14px] shrink-0 text-tinta-400 transition-transform",
                          abierto && "rotate-180")}
            aria-hidden />
        </button>
      )}
    >
      {({ cerrar }) =>
        creando ? (
          <FormularioEmpresa
            alCrear={datos => {
              const e = crear(datos);
              setCreando(false);
              cerrar();
              aviso.bien(`${e.nombre} creada`, "Ya es la empresa activa.");
            }}
            alCancelar={() => setCreando(false)}
          />
        ) : (
          <>
            <MenuRotulo>Tus empresas</MenuRotulo>
            <div className="max-h-[240px] overflow-auto pb-1">
              {lista.map(e => (
                <MenuItem
                  key={e.id}
                  marcada={e.id === activaId}
                  detalle={[nombreIndustria(e.industria), e.ciudad].filter(Boolean).join(" · ")}
                  onClick={() => { elegir(e.id); cerrar(); }}
                >
                  {e.nombre}
                </MenuItem>
              ))}
            </div>
            <MenuFilete />
            <MenuItem icono={Plus} onClick={() => setCreando(true)}>Nueva empresa</MenuItem>
          </>
        )
      }
    </Menu>
  );
}

/**
 * El alta de empresa.
 *
 * Sólo se piden los dos campos sin los que la ficha no significa nada —cómo se
 * llama y a qué se dedica— y la ciudad, que es lo que distingue dos carteras del
 * mismo grupo. Todo lo demás de la entidad se rellena después, desde el perfil:
 * un formulario de nueve campos para empezar a trabajar es un muro.
 *
 * La validación sale al enviar y no mientras se escribe. Marcar en rojo un
 * campo que aún se está rellenando es regañar a alguien por no haber terminado.
 */
export function FormularioEmpresa({ alCrear, alCancelar, compacto = true }: {
  alCrear: (d: { nombre: string; industria: Industria; ciudad?: string }) => void;
  alCancelar?: () => void;
  compacto?: boolean;
}) {
  const [nombre, setNombre] = useState("");
  const [industria, setIndustria] = useState<Industria>("desarrollo_inmobiliario");
  const [ciudad, setCiudad] = useState("");
  const [error, setError] = useState<string>();

  const enviar = (ev: React.FormEvent) => {
    ev.preventDefault();
    const n = nombre.trim();
    if (n.length < 2) { setError("Escribe el nombre de la empresa."); return; }
    setError(undefined);
    alCrear({ nombre: n, industria, ciudad: ciudad.trim() || undefined });
  };

  return (
    <form onSubmit={enviar} className={compacto ? "p-3" : ""} noValidate>
      {compacto && <div className="mb-2.5 px-0.5"><span className="nota text-tinta-400">Nueva empresa</span></div>}

      <div className="grid gap-3.5">
        <Campo rotulo="Nombre" requerido error={error}>
          {p => (
            <Entrada
              autoFocus value={nombre}
              onChange={e => { setNombre(e.target.value); if (error) setError(undefined); }}
              placeholder="Promotora del Istmo"
              {...p}
            />
          )}
        </Campo>

        <Campo rotulo="Industria" requerido>
          {p => (
            <Lista value={industria} onChange={e => setIndustria(e.target.value as Industria)} {...p}>
              {INDUSTRIAS.map(i => <option key={i.k} value={i.k}>{i.t}</option>)}
            </Lista>
          )}
        </Campo>

        <Campo rotulo="Ciudad" ayuda="Distingue dos carteras del mismo grupo.">
          {p => (
            <Entrada value={ciudad} onChange={e => setCiudad(e.target.value)}
                     placeholder="Ciudad de Panamá" {...p} />
          )}
        </Campo>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Boton type="submit" tono="solido" talla={compacto ? "md" : "lg"} ancho>
          Crear empresa
        </Boton>
        {alCancelar && (
          <Boton type="button" tono="fantasma" talla={compacto ? "md" : "lg"} onClick={alCancelar}>
            Cancelar
          </Boton>
        )}
      </div>
    </form>
  );
}
