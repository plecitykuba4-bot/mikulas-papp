import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scene, slots } from "./state";
import { Env, damp, spring, stepSpring } from "./shared";
import { Envelope } from "./Props";
import type { Cam } from "./View";

export const joinCam: Cam = { fov: 28, pos: [0, 0.5, 7.6], look: [0, 0.45, 0] };

/* Kontakt: obálka se vznáší. Najetí na tlačítko (na dotyku průjezd sekcí) otevře chlopeň
   a vysune dopis s nabídkou. */
export default function Join() {
  const g = useRef<THREE.Group>(null);
  const flap = useRef<THREE.Group>(null);
  const letter = useRef<THREE.Group>(null);
  const m = useRef({ open: spring(0), out: spring(0), mx: 0, my: 0 });
  const slot = slots.contact;

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const f = dt * 60;
    const s = m.current;
    const on = slot.hover;
    // chlopeň se otevře, dopis vyjede až po ní; při zavírání nejdřív zajede dopis
    const out = stepSpring(s.out, on && s.open.x > 0.7 ? 1 : 0, 0.06, 0.74, f);
    const o = stepSpring(s.open, on || out > 0.15 ? 1 : 0, 0.07, 0.74, f);
    // chlopeň se odklopí dozadu, za obálku, aby dopis nezakrývala
    flap.current!.rotation.x = Math.min(1.04, Math.max(0, o)) * Math.PI * 0.92;
    const up = Math.max(0, out);
    letter.current!.position.y = up * 1.28;
    letter.current!.position.z = up * 0.06;
    letter.current!.rotation.x = -up * 0.1;

    const t = scene.reduced ? 0 : clock.elapsedTime;
    s.mx = damp(s.mx, scene.reduced ? 0 : slot.mx, 0.04, dt);
    s.my = damp(s.my, scene.reduced ? 0 : slot.my, 0.04, dt);
    const G = g.current!;
    G.rotation.y = -0.16 + Math.sin(t * 0.35) * 0.06 + s.mx * 0.2;
    G.rotation.x = 0.08 - s.my * 0.12;
    G.rotation.z = Math.sin(t * 0.5) * 0.04;
    G.position.y = -0.6 + Math.sin(t * 0.8) * 0.06;
  });

  return (
    <>
      <Env intensity={0.75} keyLight={1.6} />
      <group ref={g}>
        <Envelope flapRef={flap} letterRef={letter} />
      </group>
    </>
  );
}
