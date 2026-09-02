# El motor de cálculo

Estos ficheros son una copia literal del motor de Prefacti (`src/lib/` de la
aplicación de Base44): `calculations.js`, `flujoCaja.js` y todo el juego de
módulos del que dependen las herramientas —simulador, tornado, umbrales,
puente de utilidad, chequeos, presupuesto, cuadro de áreas, precisión y los
catálogos de métricas.

**No se editan aquí.** Son la única definición de qué es el margen, cómo se
reparte el coste o cómo se descuenta la caja, y dos copias divergentes de eso
significan dos aplicaciones que dan números distintos para el mismo estudio.
Si hay que cambiar el cálculo, se cambia en el producto y se vuelve a copiar.

Lo único que se tocó al traerlos: los `@/lib/x` pasaron a `./x.js`, porque aquí
no hay el alias del empaquetador de allá.

Inventario, por lo que responde cada uno:

- `calculations.js` — la factibilidad: ingresos, costos, utilidad y margen.
- `flujoCaja.js` — el cronograma de caja, el interés, la sensibilidad, los
  puntos de quiebre y la capa de saldo.
- `metricasRetorno.js` — TIR, VAN, payback, capital propio y múltiplo.
- `simuladorVariables.js` / `tornado.js` / `umbrales.js` — el catálogo único
  de variables simulables, el tornado de sensibilidad y los puntos de quiebre
  del margen.
- `puenteUtilidad.js` — cuánto del cambio de margen viene de cada causa.
- `chequeos.js` (+ `presupuestoModelo.js`) — los avisos de coherencia.
- `presupuestoBase.js` — el árbol de fases del presupuesto y sus reglas.
- `cuadroAreas.js` / `absorcion.js` — unidades, tipologías y ritmo de venta.
- `precision.js` — presentación honesta: aproximado o al centavo.
- `camposTarjeta.js` / `compararMetricas.js` — los catálogos de indicadores.
- `casasEtapas.js` / `torrePrecios.js` / `ingresosExtras.js` /
  `masterCustom.js` / `useFlujoParams.js` — apoyos de los anteriores.

`localizacion.js` lee `localStorage` para recordar la moneda. En el servidor no
existe, y la propia función se protege con `try`, así que cae a los valores por
defecto —dólares y formato de Panamá— que es justo lo que queremos.
