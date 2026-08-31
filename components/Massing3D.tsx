"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, SoftShadows } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import type { Edificio } from "@/lib/data";

type Punto = [number, number];

/**
 * Un `poly` puede traer varios anillos encadenados: el contorno exterior y, a
 * continuación, los patios. Cada anillo se cierra repitiendo su primer punto,
 * y ése es el único separador que hay en el dato.
 *
 * Antes se volcaba la lista entera en un solo contorno. Eso no describe un
 * anillo: describe un polígono que se cruza consigo mismo, y la triangulación
 * lo resolvía rellenando el patio y dejando una costura cruzando la planta.
 * Aquí se parten los anillos y el patio se declara como hueco, que es como
 * three espera recibirlo.
 */
function partirAnillos(poly: Punto[]): { contorno: Punto[]; patios: Punto[][] } {
  const anillos: Punto[][] = [];
  let actual: Punto[] = [];

  for (const p of poly) {
    if (actual.length > 2 && p[0] === actual[0][0] && p[1] === actual[0][1]) {
      anillos.push(actual);
      actual = [];
      continue;
    }
    actual.push(p);
  }
  if (actual.length > 2) anillos.push(actual);

  const [contorno = [], ...patios] = anillos;
  return { contorno, patios };
}

function formaDe(poly: Punto[]): THREE.Shape {
  const { contorno, patios } = partirAnillos(poly);
  const s = new THREE.Shape();
  contorno.forEach(([x, z], i) => (i ? s.lineTo(x, z) : s.moveTo(x, z)));
  s.closePath();

  for (const patio of patios) {
    const h = new THREE.Path();
    patio.forEach(([x, z], i) => (i ? h.lineTo(x, z) : h.moveTo(x, z)));
    h.closePath();
    s.holes.push(h);
  }
  return s;
}

/**
 * Un cuerpo del massing: el volumen, su arista y las líneas de forjado.
 *
 * La planta se dibuja en (x, z) y se extruye hacia +Z, así que hay que tumbar
 * la geometría −90° en X para que la altura suba por Y. Después se coloca en
 * `y0`, su cota de arranque — no en `y0 + h`, que era el error de bulto que
 * tenía esto: cada volumen se dibujaba una altura entera por encima de donde
 * le tocaba. Con un solo cuerpo el edificio flotaba sobre el suelo; con dos o
 * más, el podio y la torre se separaban y quedaban dos piezas sueltas en el
 * aire, que es lo que se veía en pantalla.
 */
function Cuerpo({
  poly, y0, h, floors, tono,
}: { poly: Punto[]; y0: number; h: number; floors: number; tono: string }) {
  const { solido, arista } = useMemo(() => {
    const forma = formaDe(poly);
    const solido = new THREE.ExtrudeGeometry(forma, { depth: h, bevelEnabled: false });
    solido.rotateX(-Math.PI / 2);
    solido.translate(0, y0, 0);
    return { solido, arista: new THREE.EdgesGeometry(solido, 15) };
  }, [poly, y0, h]);

  /**
   * Las líneas de forjado son lo que convierte un prisma en un edificio: dan
   * la escala. El dato de plantas por cuerpo ya venía en el JSON y no se
   * estaba usando para nada.
   *
   * Van pintadas en el material, no dibujadas como geometría aparte. Trazarlas
   * como líneas obliga a separarlas de la fachada para que el búfer de
   * profundidad no se las coma, y cuánto hay que separarlas depende de a qué
   * distancia esté la cámara — que aquí la fija la altura del edificio. Con un
   * margen fijo, el bloque de 51 m salía limpio y la torre de 102 m sacaba las
   * líneas por fuera de la silueta, en diente de sierra. Pintadas sobre la
   * cara no hay nada que separar: se recortan solas contra el volumen y se ven
   * igual a cualquier distancia.
   *
   * Se omiten si la planta no llega a ~1,6 m de paso, para que un edificio de
   * muchas plantas no acabe siendo una trama de muaré.
   */
  const paso = h / Math.max(floors, 1);
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: tono, roughness: 0.82, metalness: 0 });
    if (floors <= 1 || paso <= 1.6) return m;

    m.onBeforeCompile = (shader) => {
      shader.uniforms.uY0 = { value: y0 };
      shader.uniforms.uPaso = { value: paso };
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vPosL;\nvarying vec3 vNorL;")
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvPosL = position;\nvNorL = normal;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vPosL;\nvarying vec3 vNorL;\nuniform float uY0;\nuniform float uPaso;",
        )
        /* Se tiñe el albedo, no el color final: así el forjado recibe la misma
           luz que la fachada y no queda como una calcomanía plana encima. */
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
           if (abs(vNorL.y) < 0.5) {
             float t = (vPosL.y - uY0) / uPaso;
             float f = fract(t);
             float w = max(fwidth(t), 1e-5) * 1.1;
             float linea = 1.0 - smoothstep(0.0, w, min(f, 1.0 - f));
             diffuseColor.rgb *= mix(1.0, 0.80, linea);
           }`,
        );
    };
    return m;
  }, [tono, y0, paso, floors]);

  return (
    <group>
      <mesh geometry={solido} material={material} castShadow receiveShadow />
      <lineSegments geometry={arista}>
        <lineBasicMaterial color="#2A3B52" transparent opacity={0.62} />
      </lineSegments>
    </group>
  );
}

/**
 * Volumetría de estudio. Deliberadamente monocroma: una maqueta de massing se
 * lee por la forma y la sombra, no por el color, y pintar cada torre de un
 * color plano saturado era justo lo que la hacía parecer un render de relleno.
 * El color de serie identifica al proyecto en las fichas y en los gráficos;
 * aquí sólo aparece como zócalo a cota de suelo.
 */
export function Massing3D({
  e,
  altura = 380,
  transparente = false,
}: {
  e: Edificio;
  altura?: number;
  /** Sin fondo propio: deja ver lo que haya detrás del lienzo. */
  transparente?: boolean;
}) {
  const { alto, radio, centro } = useMemo(() => {
    const alto = Math.max(...e.massing.map((m) => m.y0 + m.h));
    const xs = e.massing.flatMap((m) => m.poly.map(([x]) => x));
    const zs = e.massing.flatMap((m) => m.poly.map(([, z]) => z));
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    /* Radio medido desde el centro real de la planta, no desde el origen: hay
       plantas en L y torres descentradas, y encuadrar desde (0,0) dejaba unas
       fuera de plano y otras diminutas. */
    const radio = Math.max(
      ...e.massing.flatMap((m) => m.poly.map(([x, z]) => Math.hypot(x - cx, z - cz))),
    );
    return { alto, radio, centro: [cx, cz] as const };
  }, [e]);

  /**
   * El encuadre se calcula, no se tantea. Antes la distancia salía de unos
   * factores a ojo y las torres altas se salían por arriba del lienzo: sólo se
   * veía el arranque. Aquí se pide que la altura entera quepa en el campo
   * vertical, con margen, y se toma el caso más exigente entre alto y ancho.
   */
  const { dist, ojo } = useMemo(() => {
    const fov = 34;
    const medio = Math.tan(((fov / 2) * Math.PI) / 180);
    const porAlto = (alto * 0.52) / medio;
    /* El ancho hay que dividirlo por la proporción del lienzo, y ahí estaba el
       error: `porAncho` usaba la misma tangente vertical que `porAlto`, o sea
       trataba el marco como si fuera cuadrado. En un panel de proporción 2,5
       eso empuja la cámara dos veces y media más lejos de lo necesario — y
       como en los edificios anchos `porAncho` es el que manda, la torre salía
       ocupando un tercio del lienzo en vez de llenarlo.
       1,7 es la proporción mínima que tiene el panel en la portada y en la
       ficha; ceñirlo más pediría medir el contenedor antes de montar la
       cámara. */
    const PROPORCION = 1.7;
    const porAncho = (radio * 1.06) / (medio * PROPORCION);
    const dist = Math.max(porAlto, porAncho);
    const dir = new THREE.Vector3(0.6, 0.46, 0.66).normalize().multiplyScalar(dist);
    return { dist, ojo: [dir.x, dir.y, dir.z] as [number, number, number] };
  }, [alto, radio]);

  return (
    <div style={{ height: altura }} className="w-full">
      <Canvas
        shadows
        /* Tope de 1,75 en vez de 2: en la portada este lienzo comparte cuadro
           con una trama de 4.608 celdas, y el último tramo de densidad de
           píxel cuesta más de lo que se ve. */
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: transparente }}
        /**
         * `near` y `far` ceñidos al tamaño real del edificio. Con los valores
         * por defecto (0.1 / 1000) y la cámara a un par de centenares de
         * unidades, el búfer de profundidad gasta casi toda su resolución en
         * el vacío de delante: las líneas de forjado y la fachada caían en el
         * mismo escalón de profundidad y se tapaban entre sí a trozos.
         */
        camera={{ position: ojo, fov: 34, near: dist * 0.02, far: dist * 6 }}
      >
        {/* Con fondo propio, el lienzo tapa lo que tenga detrás; sin él, la
            trama de píxeles del panel se ve por debajo del edificio y las dos
            capas se leen como una sola escena. La niebla se va con el fondo:
            desvanecer hacia un color que ya no está pinta un halo. */}
        {!transparente && (
          <>
            <color attach="background" args={["#EEF2F7"]} />
            <fog attach="fog" args={["#EEF2F7", dist * 1.15, dist * 2.5]} />
          </>
        )}

        {/* Cielo arriba, rebote del suelo abajo. Es lo que da el medio tono en
            las caras que no ve el sol; con `ambientLight` alto se aplanaba
            todo y el volumen no se leía. */}
        <hemisphereLight args={["#DCE7F3", "#B4A896", 1.05]} />
        <directionalLight
          position={[radio * 2.4, alto * 2.1, radio * 2]}
          intensity={2.3}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-radio * 3}
          shadow-camera-right={radio * 3}
          shadow-camera-top={alto * 1.6}
          shadow-camera-bottom={-alto * 0.3}
          shadow-camera-far={alto * 5}
          shadow-bias={-0.0006}
        />
        <directionalLight position={[-radio * 2.2, alto * 0.8, -radio * 1.8]} intensity={0.34} color="#C6D6EA" />

        <Suspense fallback={null}>
          <SoftShadows size={26} samples={12} focus={0.9} />
          {/* Se recentra la planta y se baja media altura: así el modelo gira
              sobre su propio eje y no describe una órbita alrededor de un
              punto que no le pertenece. */}
          <group position={[-centro[0], -alto / 2, -centro[1]]}>
            {e.massing.map((m, i) => (
              <Cuerpo
                key={i}
                poly={m.poly as Punto[]}
                y0={m.y0}
                h={m.h}
                floors={m.floors}
                tono={i === 0 && e.massing.length > 1 ? "#DAD5CB" : "#EBE7DF"}
              />
            ))}

            {/* Zócalo: el único sitio donde entra el color de serie. */}
            <mesh position={[centro[0], 0.12, centro[1]]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radio * 1.16, radio * 1.24, 64]} />
              <meshBasicMaterial color={e.colorHex} transparent opacity={0.5} side={THREE.DoubleSide} />
            </mesh>

            {/* Solar. Aquí estaba la razón de que el edificio se viera
                pequeño, y no era la cámara: a radio ×22 el disco medía seis
                veces el campo visible en Balboa Bay y treinta y cuatro en Casco
                Lofts. Un plano gris que desborda el encuadre por todos lados se
                convierte él en la escala de la escena — se lee «campo con un
                edificio al fondo» en vez de «edificio».

                Ahora es un zócalo: poco más ancho que la planta. Y translúcido
                cuando el lienzo lo es, para que la trama de píxeles del panel se
                vea también por debajo del suelo. */}
            <mesh position={[centro[0], 0, centro[1]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <circleGeometry args={[radio * (transparente ? 2.1 : 3.4), 96]} />
              <meshStandardMaterial
                color="#E4EAF2"
                roughness={1}
                metalness={0}
                transparent={transparente}
                opacity={transparente ? 0.62 : 1}
              />
            </mesh>

            <ContactShadows
              position={[centro[0], 0.05, centro[1]]}
              opacity={0.42}
              scale={radio * 5.5}
              blur={2.1}
              far={alto * 0.9}
              resolution={1024}
            />
          </group>
        </Suspense>

        {/* Sin `autoRotate`: el giro perpetuo no deja leer una fachada y es lo
            primero que delata una maqueta de escaparate. Se gira si se quiere. */}
        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.055}
          minDistance={dist * 0.5}
          maxDistance={dist * 2.1}
          minPolarAngle={Math.PI * 0.12}
          maxPolarAngle={Math.PI / 2.12}
        />
      </Canvas>
    </div>
  );
}
