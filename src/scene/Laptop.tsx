import { useEffect, useMemo, useRef } from "react";
import { type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { rbox } from "./shared";
import type { Screen } from "./screens";

/* Notebook v proporcích 14" stroje: tmavý hliník, nízké klávesy, skleněný trackpad,
   černé sklo kolem displeje s výřezem. Víko a jas displeje řídí rodič přes refy. */

export const LW = 3.13;
export const LD = 2.21;
const T = 0.072;
const LH = 2.06;

const metal = new THREE.MeshPhysicalMaterial({ color: "#4a4e57", metalness: 0.9, roughness: 0.28, clearcoat: 0.25, clearcoatRoughness: 0.3 });
const keyMat = new THREE.MeshStandardMaterial({ color: "#0b0c0f", roughness: 0.55, metalness: 0.1 });

/* Rozložení kláves: řádky jako poměrné šířky. */
const ROWS: { h: number; keys: number[] }[] = [
  { h: 0.07, keys: Array(14).fill(1) },
  { h: 0.13, keys: [...Array(13).fill(1), 1.5] },
  { h: 0.13, keys: [1.5, ...Array(13).fill(1)] },
  { h: 0.13, keys: [1.8, ...Array(11).fill(1), 1.8] },
  { h: 0.13, keys: [2.3, ...Array(10).fill(1), 2.3] },
  { h: 0.13, keys: [1, 1, 1, 1.25, 5.6, 1.25, 1, 1, 1] },
];

function Keyboard() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = ROWS.reduce((n, r) => n + r.keys.length, 0);
  useEffect(() => {
    const o = new THREE.Object3D();
    const width = 2.62;
    const gap = 0.022;
    let z = -0.46;
    let n = 0;
    for (const row of ROWS) {
      const units = row.keys.reduce((a, b) => a + b, 0);
      const u = (width - gap * (row.keys.length - 1)) / units;
      let x = -width / 2;
      for (const k of row.keys) {
        const w = k * u;
        o.position.set(x + w / 2, 0, z + row.h / 2);
        o.scale.set(w, 1, row.h);
        o.updateMatrix();
        ref.current!.setMatrixAt(n++, o.matrix);
        x += w + gap;
      }
      z += row.h + gap;
    }
    ref.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, keyMat, count]}>
      <boxGeometry args={[1, 0.014, 1]} />
    </instancedMesh>
  );
}

export function ProLaptop({
  screen,
  lidRef,
  displayRef,
  angle = -0.26,
  ...rest
}: {
  screen: Screen;
  lidRef?: React.RefObject<THREE.Group | null>;
  displayRef?: React.RefObject<THREE.MeshBasicMaterial | null>;
  angle?: number;
} & ThreeElements["group"]) {
  // rámeček displeje je čistě černý (osvětlené sklo šedlo a výřez pak vystupoval)
  const glass = useMemo(() => new THREE.MeshBasicMaterial({ color: "#060609" }), []);
  return (
    <group {...rest}>
      {/* spodní díl */}
      <mesh geometry={rbox(LW, T, LD, 0.03, 5)} material={metal} />
      <mesh position={[0, T / 2 + 0.001, -0.17]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[2.72, 0.98]} />
        <meshStandardMaterial color="#17181c" roughness={0.75} />
      </mesh>
      <group position={[0, T / 2 + 0.008, 0]}>
        <Keyboard />
      </group>
      <mesh position={[0, T / 2 + 0.001, 0.66]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.42, 0.82]} />
        <meshPhysicalMaterial color="#383b42" metalness={0.6} roughness={0.16} clearcoat={1} clearcoatRoughness={0.08} />
      </mesh>
      {/* pant */}
      <mesh position={[0, T / 2, -LD / 2 + 0.05]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.035, 0.035, LW - 0.6, 20]} />
        <meshStandardMaterial color="#141519" roughness={0.5} metalness={0.5} />
      </mesh>
      {/* víko: rotation.x 0 = svisle, kladné = sklopené k sobě (zavřené π/2) */}
      <group ref={lidRef} position={[0, T / 2 + 0.01, -LD / 2 + 0.05]} rotation-x={angle}>
        <mesh geometry={rbox(LW, LH, 0.045, 0.03, 5)} position-y={LH / 2} material={metal} />
        <mesh position={[0, LH / 2, 0.0235]} material={glass}>
          <planeGeometry args={[LW - 0.03, LH - 0.03]} />
        </mesh>
        <mesh position={[0, LH / 2 - 0.04, 0.025]}>
          <planeGeometry args={[LW - 0.15, LH - 0.2]} />
          <meshBasicMaterial ref={displayRef} map={screen.tex} toneMapped={false} />
        </mesh>
        {/* výřez s kamerou */}
        <mesh position={[0, LH - 0.105, 0.026]}>
          <planeGeometry args={[0.36, 0.07]} />
          <meshBasicMaterial color="#050507" />
        </mesh>
      </group>
    </group>
  );
}
