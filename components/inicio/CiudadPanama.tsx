"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { motion, type MotionValue } from "framer-motion";
import * as THREE from "three";
import { cargarPanama, type Panama } from "./ciudad/datos";
import {
  aplicarProgreso, construirMundo, moverTrafico, type Mundo,
} from "./ciudad/mundo";

/**
 * La ciudad de Panamá, levantada sobre datos reales de OpenStreetMap.
 *
 * La geografía no es inventada: la costa de la bahía, el trazado de Avenida
 * Balboa y la Cinta Costera, las diez mil huellas de edificio con sus plantas
 * y las torres con nombre —el F&F, el JW Marriott, The Point, BICSA, Yoo,
 * Global Bank— vienen de OSM, horneados a `public/panama.json` por
 * `scripts/hornear-osm.mjs`.
 *
 * Todo va en metros. Eso cambia la escena entera respecto a la maqueta que
 * había antes: la bahía cruza siete kilómetros, el JW Marriott sube sus
 * doscientos y pico de verdad, y la niebla, las sombras y el plano lejano
 * están calibrados a esa distancia. La cámara usa un ángulo estrecho —35°, de
 * teleobjetivo— porque es lo que separa el plano aéreo de ciudad real de la
 * foto de maqueta: un gran angular sobre una ciudad la vuelve juguete.
 */

/* --------------------------------------------------------------- cámara
   El vuelo cruza la ciudad de verdad: entra desde la bahía por el suroeste,
   sube por el frente de Avenida Balboa, se mete sobre Marbella y Obarrio —el
   F&F queda debajo—, gira sobre Paitilla y remonta en Punta Pacífica para
   cerrar mirando el skyline entero desde el mar. */
const RUTA = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-2600, 620, 2600),
  new THREE.Vector3(-1500, 520, 1500),
  new THREE.Vector3(-500, 460, 400),
  new THREE.Vector3(150, 520, -1250),
  new THREE.Vector3(1150, 560, -2100),
  new THREE.Vector3(2100, 600, -1500),
  new THREE.Vector3(2600, 520, -200),
  new THREE.Vector3(1900, 430, 900),
], false, "centripetal", 0.5);

const MIRAS = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-900, 60, 1200),
  new THREE.Vector3(-300, 70, 200),
  new THREE.Vector3(300, 90, -500),
  new THREE.Vector3(900, 110, -1400),
  new THREE.Vector3(1500, 110, -1500),
  new THREE.Vector3(2200, 120, -700),
  new THREE.Vector3(1700, 130, -400),
], false, "centripetal", 0.5);

const V_POS = new THREE.Vector3();
const V_MIRA = new THREE.Vector3();

function Camara({ progreso, mundo, sol }: {
  progreso?: MotionValue<number>;
  mundo: Mundo | null;
  sol: React.RefObject<THREE.DirectionalLight | null>;
}) {
  const { camera, pointer } = useThree();
  const alabeo = useRef(0);
  const xPrevio = useRef(0);

  useFrame((st, delta) => {
    const t = st.clock.elapsedTime;
    const p = Math.min(Math.max(progreso ? progreso.get() : 1, 0), 1);
    RUTA.getPoint(p, V_POS);
    MIRAS.getPoint(p, V_MIRA);

    /* Flotación de dron y paralaje al puntero, a escala de metros. */
    V_POS.y += Math.sin(t * 0.9) * 4 + pointer.y * 40;
    V_POS.x += Math.sin(t * 0.5) * 6 + pointer.x * 60;

    /* Nunca por debajo de lo construido: la ruta pasa sobre barrios de torres
       de doscientos metros, y un punto de control mal puesto metería la
       cámara dentro de un edificio. */
    if (mundo) {
      const techo = mundo.alturaEn(V_POS.x, V_POS.z) + 90;
      if (V_POS.y < techo) V_POS.y = techo;
    }

    /* Seguimiento por tiempo, no por fotograma: con scroll rápido la cámara
       llega igual de suave y no se queda capítulos atrás. */
    camera.position.lerp(V_POS, 1 - Math.exp(-delta * 3.2));
    camera.lookAt(V_MIRA);

    const vx = camera.position.x - xPrevio.current;
    xPrevio.current = camera.position.x;
    alabeo.current +=
      (THREE.MathUtils.clamp(-vx * 0.004, -0.05, 0.05) - alabeo.current) * 0.06;
    camera.rotateZ(alabeo.current);

    /* La sombra viaja con el dron. Un mapa de 4096 repartido sobre los cinco
       kilómetros de la bahía da texeles de metro y medio: las sombras salen
       en escalones y los edificios bajos no proyectan nada legible. Ceñido a
       los mil doscientos metros que caben en cuadro, el mismo mapa da treinta
       centímetros de texel — y ahí la sombra ya es sombra. */
    const luz = sol.current;
    if (luz) {
      luz.target.position.copy(V_MIRA);
      luz.target.updateMatrixWorld();
      luz.position.set(V_MIRA.x - 2400, V_MIRA.y + 1500, V_MIRA.z + 1400);
    }

    /* El tráfico, siempre en marcha. */
    if (mundo?.trafico) moverTrafico(mundo.trafico, t, mundo.suelo);
  });
  return null;
}

/* ------------------------------------------------------------- entorno
   El reflejo es el propio atardecer, pintado en un equirectangular y pasado
   por PMREM: cielo del cénit al horizonte, disco del sol al oeste y suelo en
   penumbra. Con un HDR de habitación —lo que había antes— el muro cortina
   reflejaba una oficina gris y las torres salían de plástico. */
function Entorno() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 512;
    const g = c.getContext("2d")!;
    const cielo = g.createLinearGradient(0, 0, 0, 340);
    cielo.addColorStop(0, "#20406e");
    cielo.addColorStop(0.42, "#5c5f92");
    cielo.addColorStop(0.74, "#c07f68");
    cielo.addColorStop(1, "#f2c893");
    g.fillStyle = cielo;
    g.fillRect(0, 0, 1024, 340);
    const suelo = g.createLinearGradient(0, 340, 0, 512);
    suelo.addColorStop(0, "#7c6250");
    suelo.addColorStop(1, "#2a251f");
    g.fillStyle = suelo;
    g.fillRect(0, 340, 1024, 172);
    const sol = g.createRadialGradient(190, 300, 6, 190, 300, 180);
    sol.addColorStop(0, "rgba(255,244,214,1)");
    sol.addColorStop(0.12, "rgba(255,214,146,0.92)");
    sol.addColorStop(0.42, "rgba(255,163,94,0.34)");
    sol.addColorStop(1, "rgba(255,140,80,0)");
    g.fillStyle = sol;
    g.fillRect(0, 0, 1024, 512);

    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromEquirectangular(tex).texture;
    scene.environment = env;
    scene.environmentIntensity = 1.15;
    return () => {
      scene.environment = null;
      env.dispose();
      tex.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

/* -------------------------------------------------------------- ciudad */

function Ciudad({ progreso, alMontar }: {
  progreso?: MotionValue<number>;
  alMontar: (m: Mundo) => void;
}) {
  const [datos, setDatos] = useState<Panama | null>(null);
  const ultimo = useRef(-1);

  useEffect(() => {
    let vivo = true;
    cargarPanama().then(d => { if (vivo) setDatos(d); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  const mundo = useMemo(() => (datos ? construirMundo(datos) : null), [datos]);

  useEffect(() => {
    if (mundo) alMontar(mundo);
  }, [mundo, alMontar]);

  useEffect(() => () => {
    mundo?.grupo.traverse(o => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      mats.forEach(mat => {
        const std = mat as THREE.MeshStandardMaterial;
        std.map?.dispose();
        std.emissiveMap?.dispose();
        std.normalMap?.dispose();
        mat.dispose();
      });
    });
  }, [mundo]);

  useFrame(() => {
    if (!mundo) return;
    /* La obra nunca parte de cero: al abrir la página ya está el Casco y la
       trama baja en pie. Sin ese suelo mínimo la primera pantalla era un
       descampado que parecía un fallo de carga. */
    const bruto = progreso ? progreso.get() : 1;
    const p = progreso ? 0.2 + bruto * 0.8 : 1;
    if (Math.abs(p - ultimo.current) > 0.0006) {
      ultimo.current = p;
      aplicarProgreso(mundo.animables, p);
    }
  });

  return mundo ? <primitive object={mundo.grupo} /> : null;
}

/* --------------------------------------------------------------- nubes */

function Nube({ top, left, ancho, dur, retraso = 0 }: {
  top: string; left: string; ancho: number; dur: number; retraso?: number;
}) {
  return (
    <motion.div
      aria-hidden
      initial={{ x: 0 }}
      animate={{ x: [0, 60, 0] }}
      transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay: retraso }}
      className="absolute rounded-full"
      style={{
        top, left, width: ancho, height: ancho * 0.2,
        background: "radial-gradient(closest-side, rgba(255,228,198,0.34), rgba(255,205,160,0))",
        filter: "blur(26px)",
      }}
    />
  );
}

export function CiudadPanama({ progreso }: { progreso?: MotionValue<number> }) {
  const [mundo, setMundo] = useState<Mundo | null>(null);
  const sol = useRef<THREE.DirectionalLight | null>(null);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background:
          "linear-gradient(to bottom, #1d3a63 0%, #5c5f92 30%, #b0766a 56%, " +
          "#d9996c 74%, #eec392 100%)",
      }}
    >
      {/* El sol, bajo y al oeste, con su halo. */}
      <div
        aria-hidden
        className="absolute"
        style={{
          left: "9%", top: "36%", width: 520, height: 520,
          background:
            "radial-gradient(circle, rgba(255,232,180,0.92) 0%, " +
            "rgba(255,182,108,0.46) 28%, rgba(255,152,82,0.16) 50%, transparent 70%)",
          filter: "blur(3px)",
        }}
      />
      <Nube top="15%" left="18%" ancho={380} dur={30} />
      <Nube top="10%" left="56%" ancho={500} dur={38} retraso={5} />
      <Nube top="26%" left="73%" ancho={300} dur={25} retraso={10} />

      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [-2600, 620, 2600], fov: 35, near: 8, far: 24000 }}
        gl={{ alpha: true, antialias: true }}
      >
        {/* Niebla a escala de ciudad: a siete kilómetros la humedad del
            trópico se come el fondo. Su color es el del cielo a la altura del
            horizonte, no un gris neutro: con un tono que no case, la ciudad
            lejana se apaga contra el degradado y deja una banda visible justo
            donde debería no haber costura. */}
        <fog attach="fog" args={[0xc4907e, 2600, 13000]} />
        <hemisphereLight args={[0xd8e4f2, 0x54584f, 0.75]} />
        <ambientLight intensity={0.42} color={0xb6c4dc} />
        <Entorno />
        {/* El sol: bajo, al oeste, con sombras largas sobre toda la bahía. */}
        <directionalLight
          ref={sol}
          position={[-3400, 1100, 1900]}
          intensity={1.75}
          color={0xffd9b4}
          castShadow
          shadow-mapSize={[4096, 4096]}
          shadow-camera-left={-1200}
          shadow-camera-right={1200}
          shadow-camera-top={1200}
          shadow-camera-bottom={-1200}
          shadow-camera-near={100}
          shadow-camera-far={6000}
          shadow-bias={-0.0004}
          shadow-normalBias={1.2}
        />
        <Suspense fallback={null}>
          <Ciudad progreso={progreso} alMontar={setMundo} />
        </Suspense>
        <Camara progreso={progreso} mundo={mundo} sol={sol} />
      </Canvas>
    </div>
  );
}
