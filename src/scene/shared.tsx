import { useLayoutEffect, useMemo } from "react";
import { useThree, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/* Prostředí pro odlesky, jedno na každý WebGL kontext (na mobilu má každý rámeček vlastní;
   textura z PMREM jinému kontextu nepatří). */
const envByGl = new WeakMap<THREE.WebGLRenderer, THREE.Texture>();

/* Všechny scény mají stejnou sadu světel (ambient, 4 směrová, 1 bodové). Program shaderu závisí
   na počtu světel, takže se pak sdílí mezi scénami a kompiluje se jich mnohem méně.
   Nepotřebné světlo má jen nulovou intenzitu. */
export function Env({
  intensity = 0.55,
  keyLight = 1.4,
  rimA = 0,
  rimB = 0,
  pointRef,
}: {
  intensity?: number;
  keyLight?: number;
  rimA?: number;
  rimB?: number;
  pointRef?: React.RefObject<THREE.PointLight | null>;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    let envTex = envByGl.get(gl);
    if (!envTex) {
      const pm = new THREE.PMREMGenerator(gl);
      envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      pm.dispose();
      envByGl.set(gl, envTex);
    }
    scene.environment = envTex;
    scene.environmentIntensity = intensity;
  }, [gl, scene, intensity]);
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 6, 4]} intensity={keyLight} />
      <directionalLight position={[-4, 2, -3]} intensity={0.35} color="#c9c4ff" />
      <directionalLight position={[-3.5, 3, -4]} intensity={rimA} color="#b9b2ff" />
      <directionalLight position={[4, 1.5, -3]} intensity={rimB} color="#ffc56b" />
      <pointLight ref={pointRef} position={[0, 0.95, 1.1]} color="#9fb0ff" intensity={0} distance={3.2} decay={1.6} />
    </>
  );
}

/* Měkký stín jako rozmazaná skvrna (ContactShadows při pohybu dělá artefakty). */
let blobTex: THREE.Texture | null = null;
function blob() {
  if (blobTex) return blobTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(17,18,22,0.5)");
  gr.addColorStop(0.45, "rgba(17,18,22,0.2)");
  gr.addColorStop(1, "rgba(17,18,22,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  blobTex = new THREE.CanvasTexture(c);
  return blobTex;
}

export function Blob({ w = 2, d = 1, y = 0, opacity = 1, ...rest }: { w?: number; d?: number; y?: number; opacity?: number } & ThreeElements["mesh"]) {
  const map = useMemo(blob, []);
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={y} scale={[w, d, 1]} renderOrder={-1} {...rest}>
      <planeGeometry />
      <meshBasicMaterial map={map} transparent depthWrite={false} opacity={opacity} />
    </mesh>
  );
}

/* Sdílené geometrie (cache podle rozměrů). */
const geoCache = new Map<string, THREE.BufferGeometry>();
export function rbox(w: number, h: number, d: number, r = 0.06, seg = 4) {
  const k = `${w}|${h}|${d}|${r}|${seg}`;
  let g = geoCache.get(k);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, seg, r);
    geoCache.set(k, g);
  }
  return g;
}

/* Pružina s mírným překmitem: pohyb se počítá, nepřehrává. */
export type Spring = { x: number; v: number };
export const spring = (x = 0): Spring => ({ x, v: 0 });
export function stepSpring(s: Spring, target: number, k: number, damp = 0.8, dt = 1) {
  s.v += (target - s.x) * k * dt;
  s.v *= Math.pow(damp, dt);
  s.x += s.v * dt;
  return s.x;
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const ss = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/* Lerp nezávislý na snímkové frekvenci; Math.min drží krok v mezích i při dlouhém snímku. */
export const damp = (cur: number, target: number, k: number, dt: number) => cur + (target - cur) * Math.min(1, k * dt * 60);
