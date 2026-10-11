import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scene, slots } from "./state";
import { Blob, Env, damp, rbox, spring, ss, stepSpring, type Spring } from "./shared";
import { C, Iron, Keyboard, Monitor, Mug, OpenBadge, Pcb } from "./Props";
import { ProLaptop } from "./Laptop";
import { JAVA, codeLen, drawEditor, drawSite, fontsReady, makeScreen } from "./screens";
import type { Cam } from "./View";

export const journeyCam: Cam = { fov: 30, pos: [4.6, 4.6, 8.8], look: [0.1, 0.8, 0] };
// na mobilu je rámeček nižší: kamera dál a níž, ať se stůl vejde celý i s nohama
const narrow = typeof matchMedia !== "undefined" && matchMedia("(max-width: 860px)").matches;
const CAM_POS = new THREE.Vector3(...journeyCam.pos);
const CAM_LOOK = new THREE.Vector3(0.1, narrow ? 0.45 : 0.8, 0);

/* Cesta: pracovní stůl, na kterém přibývá vybavení podle kariéry.
   0 plošný spoj a pájka → 1 notebook s Javou → 2 monitor s webem, klávesnice, kafe → 3 odznak #OPENTOWORK.
   Scroll jen nastavuje, co má na stole být; dopad a zmizení počítají pružiny. */

const TOP = 0.08;

/* Předmět, který na stůl dopadne s překmitem a při odchodu se zmenší. */
function Drop({ w, children, lift = 1.2, at = [0, 0, 0] }: { w: () => number; children: React.ReactNode; lift?: number; at?: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const s = useRef({ sc: spring(0), y: spring(lift) as Spring });
  useFrame((_, delta) => {
    const f = Math.min(delta, 1 / 20) * 60;
    const on = w();
    const k = 0.07;
    const sc = Math.max(0, stepSpring(s.current.sc, on, k, 0.74, f));
    const y = stepSpring(s.current.y, on > 0.5 ? 0 : lift, k * 0.9, 0.72, f);
    const G = ref.current!;
    G.visible = sc > 0.01;
    G.scale.setScalar(Math.max(0.0001, sc));
    G.position.set(at[0], at[1] + y, at[2]);
  });
  return <group ref={ref}>{children}</group>;
}

function Desk() {
  return (
    <group>
      <mesh geometry={rbox(4.8, 0.16, 2.7, 0.05)}>
        <meshPhysicalMaterial color={C.wood} roughness={0.55} clearcoat={0.4} clearcoatRoughness={0.4} />
      </mesh>
      {[
        [-2.2, -1.15],
        [2.2, -1.15],
        [-2.2, 1.15],
        [2.2, 1.15],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.68, z]}>
          <cylinderGeometry args={[0.06, 0.05, 1.2, 12]} />
          <meshStandardMaterial color={C.ink} roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

export default function Journey() {
  const g = useRef<THREE.Group>(null);
  const led = useRef<THREE.MeshStandardMaterial>(null);
  const code = useMemo(() => makeScreen(800, 500), []);
  const site = useMemo(() => makeScreen(800, 480), []);
  const total = useMemo(() => codeLen(JAVA), []);
  const m = useRef({ chars: 0, drawn: -1, last: 0, mx: 0, my: 0, rot: 0 });
  const slot = slots.journey;

  useEffect(() => {
    const paint = () => {
      drawEditor(code, JAVA, 0, { tab: "Invoice.java", size: 23 });
      drawSite(site, false);
      m.current.drawn = -1;
    };
    paint();
    fontsReady.then(paint);
  }, [code, site]);

  const p = () => scene.journey;
  const w0 = () => 1 - ss(0.45, 0.75, p());
  const w1 = () => ss(0.55, 0.85, p());
  const w2 = () => ss(1.55, 1.85, p());
  const w3 = () => ss(2.55, 2.85, p());

  useFrame(({ clock, camera }, delta) => {
    if (narrow) {
      camera.position.copy(CAM_POS).sub(CAM_LOOK).multiplyScalar(1.2).add(CAM_LOOK);
      camera.lookAt(CAM_LOOK);
    }
    const dt = Math.min(delta, 1 / 20);
    const s = m.current;
    const t = scene.reduced ? 0 : clock.elapsedTime;
    // LED na plošném spoji bliká
    if (led.current) led.current.emissiveIntensity = 0.4 + (Math.sin(t * 4) > 0 ? 1.8 : 0);
    // notebook píše Javu, jakmile je na stole
    if (w1() > 0.5) s.chars = scene.reduced ? total : (s.chars + dt * 22) % (total + 60);
    const n = Math.min(total, Math.floor(s.chars));
    if (n !== s.drawn && slot.alpha > 0 && clock.elapsedTime - s.last > 0.09) {
      s.last = clock.elapsedTime;
      drawEditor(code, JAVA, n, { tab: "Invoice.java", size: 23 });
      s.drawn = n;
    }

    s.mx = damp(s.mx, scene.reduced ? 0 : slot.mx, 0.04, dt);
    s.my = damp(s.my, scene.reduced ? 0 : slot.my, 0.04, dt);
    s.rot = damp(s.rot, p() * 0.08, 0.05, dt);
    const G = g.current!;
    G.rotation.y = 0.12 + Math.sin(t * 0.25) * 0.05 + s.mx * 0.22 + s.rot;
    G.rotation.x = -s.my * 0.06;
  });

  return (
    <>
      <Env intensity={0.6} keyLight={1.5} />
      <group ref={g} position-y={-0.2}>
        <Desk />
        <group position-y={TOP}>
          <Drop w={w0} at={[-0.45, 0.04, 0.1]}>
            <Pcb scale={0.85} ledRef={led} />
          </Drop>
          <Drop w={w0} at={[1.2, 0.12, 0.65]}>
            <Iron rotation-y={-0.7} scale={0.85} />
          </Drop>
          <Drop w={w1} at={[-1.15, 0.05, 0.2]}>
            <ProLaptop screen={code} rotation-y={0.4} scale={0.55} angle={-0.26} />
          </Drop>
          <Drop w={w2} at={[0.85, 0, -0.75]}>
            <Monitor screen={site} rotation-y={-0.12} scale={0.6} />
          </Drop>
          <Drop w={w2} at={[0.85, 0.05, 0.45]}>
            <Keyboard rotation-y={-0.12} scale={0.6} />
          </Drop>
          <Drop w={w2} at={[2.0, 0.06, 0.65]}>
            <Mug scale={0.6} />
          </Drop>
          <Drop w={w3} lift={-0.8} at={[-0.2, 2.45, 0.2]}>
            <OpenBadge scale={0.8} />
          </Drop>
        </group>
      </group>
      <Blob w={6.4} d={3.8} y={-1.45} opacity={0.5} />
    </>
  );
}
