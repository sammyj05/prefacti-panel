"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Conmutador de tema.
 *
 * El estado real no vive aquí sino en la clase `oscuro` del `<html>`, que ya
 * viene puesta desde el guion de `layout.tsx` antes del primer pintado. Este
 * componente sólo la lee al montar y la alterna; por eso arranca en `null` y
 * no pinta icono hasta saberlo — dibujar un sol y corregirlo a luna un
 * fotograma después es peor que no dibujar nada.
 *
 * La preferencia se guarda en `localStorage`. Si no hay ninguna guardada se
 * respeta la del sistema, que es lo que hace el guion del layout.
 */
export function TemaToggle({ className = "" }: { className?: string }) {
  const [oscuro, setOscuro] = useState<boolean | null>(null);

  useEffect(() => {
    setOscuro(document.documentElement.classList.contains("oscuro"));
  }, []);

  function alternar() {
    const siguiente = !document.documentElement.classList.contains("oscuro");
    document.documentElement.classList.toggle("oscuro", siguiente);
    localStorage.setItem("tema", siguiente ? "oscuro" : "claro");
    setOscuro(siguiente);
  }

  return (
    <button
      onClick={alternar}
      aria-label={oscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={oscuro ? "Tema claro" : "Tema oscuro"}
      className={`grid h-9 w-9 place-items-center rounded-control text-tinta-400 transition
                  hover:bg-hueso-mesa hover:text-tinta-950 ${className}`}
    >
      {oscuro === null ? null : oscuro
        ? <Sun className="h-[17px] w-[17px]" />
        : <Moon className="h-[17px] w-[17px]" />}
    </button>
  );
}
