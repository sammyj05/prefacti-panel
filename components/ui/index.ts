/**
 * La caja de primitivas.
 *
 * Un solo sitio del que importar, para que una pantalla no tenga que saber en
 * qué fichero vive cada pieza. Los nombres son los de la casa —en castellano,
 * como el resto del código— y cada uno corresponde a una de las primitivas del
 * pliego: Boton, Campo/Entrada/Lista/Area/Casilla, Marbete, Modal/Cajon, Menu,
 * Pista, Pestanas, Tabla, Esqueleto, Vacio y los avisos.
 */

export { Boton, BotonIcono } from "./Boton";
export { Campo, Entrada, Area, Lista, Casilla } from "./Campo";
export { Marbete } from "./Marbete";
export { Modal, Cajon } from "./Modal";
export { Menu, MenuItem, MenuRotulo, MenuFilete } from "./Menu";
export { Pista } from "./Pista";
export { Pestanas, type Pestana } from "./Pestanas";
export { Tabla, useOrden, type Columna } from "./Tabla";
export {
  Esqueleto, EsqueletoTexto, EsqueletoFicha, EsqueletoTabla, Vacio, Roto,
} from "./Estado";
export { CargandoPantalla } from "./Cargando";
export { ProveedorAvisos, useAviso } from "./Aviso";
