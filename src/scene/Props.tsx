import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { rbox } from "./shared";
import { MONO, SANS, fontsReady, makeScreen, rr, type Screen } from "./screens";

/* Rozpoznatelné předměty: notebook, hrnek, monitor, klávesnice, plošný spoj, pájka, odznak, obálka. */

export const C = {
  indigo: "#4b3df5",
  indigoSoft: "#b9b2ff",
  amber: "#ffb020",
  mint: "#12b886",
  ink: "#15131f",
  alu: "#cfd2da",
  dark: "#2a2838",
  paper: "#fbf8f1",
  wood: "#d6a875",
};

type G = ThreeElements["group"];

const Alu = () => <meshPhysicalMaterial color={C.alu} metalness={0.65} roughness={0.32} clearcoat={0.4} />;

/* Klávesy jako jeden InstancedMesh. */
function Keys({ cols, rows, w, d, color = "#22202e" }: { cols: number; rows: number; w: number; d: number; color?: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const o = new THREE.Object3D();
    const kw = w / cols,
      kd = d / rows;
    let n = 0;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        o.position.set(-w / 2 + kw * (c + 0.5), 0, -d / 2 + kd * (r + 0.5));
        o.scale.set(kw * 0.82, 1, kd * 0.78);
        o.updateMatrix();
        ref.current!.setMatrixAt(n++, o.matrix);
      }
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [cols, rows, w, d]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, cols * rows]}>
      <boxGeometry args={[1, 0.03, 1]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </instancedMesh>
  );
}

/* Měkký obláček páry (radiální přechod). */
let puffTex: THREE.Texture | null = null;
function puff() {
  if (puffTex) return puffTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,0.9)");
  gr.addColorStop(0.5, "rgba(255,255,255,0.35)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  puffTex = new THREE.CanvasTexture(c);
  return puffTex;
}

/* Hrnek kafe s párou. */
export function Mug({ color = "#f1eee8", steam = true, ...rest }: { color?: string; steam?: boolean } & G) {
  const puffs = useRef<THREE.Mesh[]>([]);
  const map = useMemo(puff, []);
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    puffs.current.forEach((m, i) => {
      const f = (t * 0.3 + i / 4) % 1;
      m.position.set(Math.sin(t * 1.1 + i * 2) * 0.08 * f, 0.5 + f * 0.95, Math.cos(t * 0.8 + i) * 0.05);
      m.scale.setScalar(0.22 + f * 0.4);
      m.quaternion.copy(camera.quaternion);
      (m.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * f) * 0.55;
    });
  });
  return (
    <group {...rest}>
      <mesh position-y={0.2}>
        <cylinderGeometry args={[0.3, 0.27, 0.62, 40, 1, true]} />
        <meshPhysicalMaterial color={color} roughness={0.3} clearcoat={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position-y={-0.1} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.27, 40]} />
        <meshPhysicalMaterial color={color} roughness={0.3} />
      </mesh>
      <mesh position-y={0.4} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.28, 40]} />
        <meshStandardMaterial color="#3b2416" roughness={0.25} />
      </mesh>
      <mesh position={[0.32, 0.2, 0]}>
        <torusGeometry args={[0.15, 0.045, 12, 24, Math.PI * 1.25]} />
        <meshPhysicalMaterial color={color} roughness={0.3} clearcoat={1} />
      </mesh>
      {steam &&
        [0, 1, 2, 3].map((i) => (
          <mesh key={i} ref={(m) => void (m && (puffs.current[i] = m))}>
            <planeGeometry />
            <meshBasicMaterial map={map} transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
    </group>
  );
}

/* Monitor na stojanu. */
export function Monitor({ screen, ...rest }: { screen: Screen } & G) {
  return (
    <group {...rest}>
      <mesh geometry={rbox(3.4, 2.1, 0.1, 0.06)} position-y={1.75}>
        <meshPhysicalMaterial color={C.ink} roughness={0.35} metalness={0.3} clearcoat={0.6} />
      </mesh>
      <mesh position={[0, 1.77, 0.052]}>
        <planeGeometry args={[3.24, 1.94]} />
        <meshBasicMaterial map={screen.tex} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.5, -0.12]}>
        <boxGeometry args={[0.22, 1.0, 0.08]} />
        <Alu />
      </mesh>
      <mesh geometry={rbox(1.1, 0.06, 0.7, 0.03)} position={[0, 0.03, -0.05]}>
        <Alu />
      </mesh>
    </group>
  );
}

export function Keyboard(props: G) {
  return (
    <group {...props}>
      <mesh geometry={rbox(2.6, 0.07, 0.85, 0.03)}>
        <meshPhysicalMaterial color="#2f3238" metalness={0.85} roughness={0.3} />
      </mesh>
      <group position-y={0.045}>
        <Keys cols={15} rows={4} w={2.45} d={0.7} color="#0b0c0f" />
      </group>
    </group>
  );
}

/* Plošný spoj: zelená deska s měděnými cestami, čip, rezistory a LEDka, která bliká. */
function pcbTexture() {
  const sc = makeScreen(512, 352);
  const { ctx } = sc;
  ctx.fillStyle = "#17734a";
  ctx.fillRect(0, 0, 512, 352);
  ctx.strokeStyle = "#e6b450";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  const paths = [
    [[40, 60], [160, 60], [200, 100], [330, 100]],
    [[40, 300], [140, 300], [180, 260], [330, 260]],
    [[470, 70], [420, 70], [380, 120]],
    [[470, 290], [410, 290], [380, 240]],
    [[90, 170], [190, 170]],
    [[250, 30], [250, 80]],
  ];
  for (const p of paths) {
    ctx.beginPath();
    p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  ctx.fillStyle = "#e6b450";
  for (const [x, y] of [[40, 60], [40, 300], [470, 70], [470, 290], [90, 170], [190, 170], [250, 30]]) {
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `600 22px ${MONO}`;
  ctx.fillText("MP-01  2011", 300, 335);
  sc.tex.needsUpdate = true;
  return sc;
}

export function Pcb({ ledRef, ...rest }: { ledRef?: React.RefObject<THREE.MeshStandardMaterial | null> } & G) {
  const tex = useMemo(pcbTexture, []);
  const legs = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const o = new THREE.Object3D();
    let n = 0;
    for (const side of [-1, 1])
      for (let i = 0; i < 6; i++) {
        o.position.set(-0.32 + i * 0.13, 0.04, side * 0.3);
        o.updateMatrix();
        legs.current!.setMatrixAt(n++, o.matrix);
      }
    legs.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group {...rest}>
      <mesh geometry={rbox(2.2, 0.07, 1.5, 0.03)}>
        <meshStandardMaterial color="#17734a" roughness={0.55} />
      </mesh>
      <mesh position-y={0.037} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[2.16, 1.46]} />
        <meshStandardMaterial map={tex.tex} roughness={0.5} metalness={0.15} />
      </mesh>
      <group position={[0.05, 0.04, 0]}>
        <mesh geometry={rbox(0.9, 0.12, 0.5, 0.02)} position-y={0.08}>
          <meshStandardMaterial color="#1b1a22" roughness={0.45} />
        </mesh>
        <instancedMesh ref={legs} args={[undefined, undefined, 12]}>
          <boxGeometry args={[0.05, 0.08, 0.14]} />
          <meshStandardMaterial color="#d7d9e0" metalness={0.9} roughness={0.25} />
        </instancedMesh>
      </group>
      {[-0.6, -0.6].map((x, i) => (
        <mesh key={i} position={[x, 0.1, i ? 0.42 : -0.42]} rotation-z={Math.PI / 2}>
          <capsuleGeometry args={[0.06, 0.2, 6, 12]} />
          <meshStandardMaterial color="#d8c39b" roughness={0.5} />
        </mesh>
      ))}
      <group position={[0.8, 0.04, -0.4]}>
        <mesh position-y={0.2}>
          <capsuleGeometry args={[0.1, 0.14, 8, 16]} />
          <meshStandardMaterial ref={ledRef} color="#ff4d3d" emissive="#ff3b2b" emissiveIntensity={1.5} transparent opacity={0.9} />
        </mesh>
        <mesh position-y={0.06}>
          <cylinderGeometry args={[0.115, 0.115, 0.04, 20]} />
          <meshStandardMaterial color="#ff4d3d" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

/* Mikropájka: rukojeť, kovová trubka a hrot. */
export function Iron(props: G) {
  return (
    <group {...props}>
      <mesh rotation-z={Math.PI / 2} position-x={-0.5}>
        <capsuleGeometry args={[0.1, 0.9, 8, 20]} />
        <meshPhysicalMaterial color={C.amber} roughness={0.35} clearcoat={0.8} />
      </mesh>
      <mesh rotation-z={Math.PI / 2} position-x={0.3}>
        <cylinderGeometry args={[0.045, 0.06, 0.8, 16]} />
        <meshStandardMaterial color="#d7d9e0" metalness={0.95} roughness={0.2} />
      </mesh>
      <mesh rotation-z={-Math.PI / 2} position-x={0.82}>
        <coneGeometry args={[0.04, 0.26, 16]} />
        <meshStandardMaterial color="#8c8f9a" metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
  );
}

/* Odznak s fotkou a zeleným rámečkem #OPENTOWORK (jako na LinkedInu). */
export function OpenBadge(props: G) {
  const sc = useMemo(() => makeScreen(512, 512), []);
  useEffect(() => {
    const img = new Image();
    const draw = () => {
      const { ctx } = sc;
      ctx.clearRect(0, 0, 512, 512);
      ctx.save();
      ctx.beginPath();
      ctx.arc(256, 256, 250, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#e9e6dd";
      ctx.fillRect(0, 0, 512, 512);
      if (img.complete && img.naturalWidth) ctx.drawImage(img, 20, 0, 472, 472);
      ctx.restore();
      // zelený oblouk dole s textem
      ctx.lineWidth = 58;
      ctx.strokeStyle = "#12b886";
      ctx.beginPath();
      ctx.arc(256, 256, 224, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 34px ${SANS}`;
      const txt = "#OPENTOWORK";
      const span = Math.PI * 0.5;
      [...txt].forEach((ch, i) => {
        const a = Math.PI / 2 + span / 2 - (i + 0.5) * (span / txt.length);
        ctx.save();
        ctx.translate(256 + Math.cos(a) * 224, 256 + Math.sin(a) * 224);
        ctx.rotate(a - Math.PI / 2);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ch, 0, 0);
        ctx.restore();
      });
      sc.tex.needsUpdate = true;
    };
    img.onload = draw;
    img.src = "/img/portret.webp";
    fontsReady.then(draw);
    draw();
  }, [sc]);
  return (
    <group {...props}>
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.82, 0.82, 0.08, 64]} />
        <meshPhysicalMaterial color="#ffffff" roughness={0.3} clearcoat={1} />
      </mesh>
      <mesh position-z={0.042}>
        <circleGeometry args={[0.8, 64]} />
        <meshBasicMaterial map={sc.tex} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

/* Obálka: chlopeň se otevře (open 0..1) a dopis vyjede nahoru (letter 0..1). */
function letterTexture() {
  const sc = makeScreen(900, 560);
  const draw = () => {
    const { ctx } = sc;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 900, 560);
    ctx.fillStyle = C.indigo;
    ctx.fillRect(0, 0, 900, 22);
    ctx.fillStyle = C.ink;
    ctx.font = `700 76px ${SANS}`;
    ctx.fillText("Ahoj Mikuláši,", 60, 130);
    ctx.fillStyle = "#56536b";
    ctx.font = `500 46px ${SANS}`;
    ctx.fillText("máme projekt a hledáme,", 60, 222);
    ctx.fillText("kdo ho postaví pořádně.", 60, 282);
    ctx.fillStyle = C.mint;
    rr(ctx, 60, 350, 400, 92, 46);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `600 42px ${SANS}`;
    ctx.fillText("Domluvíme se?", 104, 398);
    sc.tex.needsUpdate = true;
  };
  draw();
  fontsReady.then(draw);
  return sc;
}

export function Envelope({ flapRef, letterRef, ...rest }: { flapRef: React.RefObject<THREE.Group | null>; letterRef: React.RefObject<THREE.Group | null> } & G) {
  const W = 2.6,
    H = 1.6;
  const { pocket, flap } = useMemo(() => {
    const p = new THREE.Shape();
    p.moveTo(-W / 2, H / 2);
    p.lineTo(0, -0.05);
    p.lineTo(W / 2, H / 2);
    p.lineTo(W / 2, -H / 2);
    p.lineTo(-W / 2, -H / 2);
    p.closePath();
    const f = new THREE.Shape();
    f.moveTo(-W / 2, 0);
    f.lineTo(W / 2, 0);
    f.lineTo(0, -0.95);
    f.closePath();
    return { pocket: new THREE.ShapeGeometry(p), flap: new THREE.ShapeGeometry(f) };
  }, []);
  const letter = useMemo(letterTexture, []);
  // obálka v jantarové, ať na ní bílý dopis vynikne
  const paper = <meshStandardMaterial color="#f4bd5f" roughness={0.7} side={THREE.DoubleSide} />;
  return (
    <group {...rest}>
      <mesh>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#d99a3a" roughness={0.75} side={THREE.DoubleSide} />
      </mesh>
      <group ref={letterRef}>
        <mesh position-z={0.02}>
          <planeGeometry args={[W - 0.24, H - 0.2]} />
          <meshStandardMaterial map={letter.tex} roughness={0.6} />
        </mesh>
      </group>
      <mesh geometry={pocket} position-z={0.04}>
        {paper}
      </mesh>
      <mesh position={[W / 2 - 0.36, -H / 2 + 0.3, 0.045]}>
        <planeGeometry args={[0.42, 0.34]} />
        <meshStandardMaterial color={C.indigo} roughness={0.5} />
      </mesh>
      <group ref={flapRef} position={[0, H / 2, 0.05]}>
        <mesh geometry={flap}>{paper}</mesh>
        <mesh position={[0, -0.72, 0.012]}>
          <circleGeometry args={[0.16, 32]} />
          <meshStandardMaterial color={C.indigo} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}
