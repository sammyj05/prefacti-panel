# El motor de cálculo

Estos cuatro ficheros son una copia literal del motor de Prefacti
(`src/lib/` de la aplicación de Base44): `calculations.js` y las tres cosas de
las que depende.

**No se editan aquí.** Son la única definición de qué es el margen, cómo se
reparte el coste o cómo se descuenta la caja, y dos copias divergentes de eso
significan dos aplicaciones que dan números distintos para el mismo estudio.
Si hay que cambiar el cálculo, se cambia en el producto y se vuelve a copiar.

Lo único que se tocó al traerlos: los `@/lib/x` pasaron a `./x.js`, porque aquí
no hay el alias del empaquetador de allá.

`localizacion.js` lee `localStorage` para recordar la moneda. En el servidor no
existe, y la propia función se protege con `try`, así que cae a los valores por
defecto —dólares y formato de Panamá— que es justo lo que queremos.
