import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scene, slots } from "./state";
import { Env, damp, spring, stepSpring } from "./shared";
import { ProLaptop } from "./Laptop";
import { KOTLIN, codeLen, drawIde, fontsReady, makeScreen } from "./screens";
import type { Cam } from "./View";

export const heroCam: Cam = { fov: 22, pos: [2.9, 2.3, 7.4], look: [0.05, 0.86, 0] };
const BASE = new THREE.Vector3(...heroCam.pos);
const LOOK = new THREE.Vector3(...heroCam.look);

const CLOSED = Math.PI / 2 - 0.015;
const OPEN = -0.26;

/* Hero: notebook se při načtení otevře, displej se rozsvítí a začne se psát kód.
   Po dopsání se aplikace spustí (log dole), chvíli to vydrží a píše se znovu.
   Kurzor natáčí notebook, najetí myší zrychlí psaní, scroll víko trochu přivře. */
export default function HeroDesk() {
  const g = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const display = useRef<THREE.MeshBasicMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const sc = useMemo(() => makeScreen(1280, 832), []);
  const total = useMemo(() => codeLen(KOTLIN), []);
  const m = useRef({ born: -1, age: 0, lid: spring(CLOSED), chars: 0, logs: 0, hold: 0, drawn: "", last: 0, mx: 0, my: 0 });
  const slot = slots.hero;

  useEffect(() => {
    drawIde(sc, KOTLIN, 0, 0, true);
    fontsReady.then(() => (m.current.drawn = ""));
  }, [sc]);

  useFrame(({ clock, camera }, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const s = m.current;
    const red = scene.reduced;
    if (s.born < 0 && slot.alpha > 0) s.born = clock.elapsedTime;
    s.age = s.born < 0 ? 0 : clock.elapsedTime - s.born;

    // víko: otevření s mírným dokmitem, při odjezdu z hero se trochu přivře
    const lidTarget = red ? OPEN : s.age > 0.1 ? OPEN + scene.heroOut * 0.9 : CLOSED;
    const a = red ? OPEN : stepSpring(s.lid, lidTarget, 0.045, 0.8, dt * 60);
    lid.current!.rotation.x = a;
    const bright = THREE.MathUtils.clamp((CLOSED - a) / (CLOSED - 0.4), 0, 1) ** 2;
    display.current!.color.setScalar(bright);
    light.current!.intensity = bright * 1.4;

    // psaní → spuštění → pauza → znovu
    if (red) {
      s.chars = total;
      s.logs = 3;
    } else if (s.age > 1.0) {
      if (s.chars < total) s.chars += dt * (slot.hover ? 44 : 19);
      else if (s.logs < 3) s.logs += dt * 1.6;
      else {
        s.hold += dt;
        if (s.hold > 4) {
          s.chars = 0;
          s.logs = 0;
          s.hold = 0;
        }
      }
    }
    const blink = Math.sin(clock.elapsedTime * 6) > -0.2 || s.chars < total;
    // displej se překresluje jen když je hero vidět a nejvýš ~14× za sekundu (každé překreslení = nahrání textury do GPU)
    const key = `${Math.floor(s.chars)}|${Math.floor(s.logs)}|${blink}`;
    const now = clock.elapsedTime;
    if (key !== s.drawn && slot.alpha > 0 && now - s.last > 0.07) {
      s.last = now;
      drawIde(sc, KOTLIN, Math.floor(s.chars), Math.floor(s.logs), blink);
      s.drawn = key;
    }

    // užší rámeček (mobil) = kamera dál, ať se notebook vejde
    const asp = (camera as THREE.PerspectiveCamera).aspect || 1.6;
    const k = asp < 1.2 ? 1.2 / asp : 1;
    camera.position.copy(BASE).sub(LOOK).multiplyScalar(k).add(LOOK);
    camera.lookAt(LOOK);

    s.mx = damp(s.mx, red ? 0 : slot.mx, 0.045, dt);
    s.my = damp(s.my, red ? 0 : slot.my, 0.045, dt);
    const t = red ? 0 : clock.elapsedTime;
    const G = g.current!;
    G.rotation.y = 0.32 + Math.sin(t * 0.28) * 0.05 + s.mx * 0.22 - scene.heroOut * 0.25;
    G.rotation.x = -s.my * 0.06;
    G.position.y = Math.sin(t * 0.6) * 0.035;
  });

  return (
    <>
      {/* obrysová světla (rimA, rimB): hrany hliníku se odliší od tmavého pozadí; bodové světlo = displej */}
      <Env intensity={0.75} keyLight={1.1} rimA={1.5} rimB={1.0} pointRef={light} />
      <group ref={g}>
        <ProLaptop screen={sc} lidRef={lid} displayRef={display} />
      </group>
    </>
  );
}
