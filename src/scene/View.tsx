import { useEffect, useMemo, useRef } from "react";
import { createPortal, useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { flags, type Slot } from "./state";

/* Vlastní obdoba drei <View>: každá ukázka má svou scénu a kameru
   a kreslí se nůžkami do obdélníku svého DOM prvku. Mimo obraz se nekreslí. */

export type Cam = { fov: number; pos: [number, number, number]; look: [number, number, number] };

/* Průhlednost DOM obalu, který prvek odhaluje (.rv karta nebo [data-in] v hero).
   Dokud obal není vidět, 3D se nekreslí; během jeho prolnutí se prolíná i 3D. */
function revealOpacity(fade: HTMLElement) {
  const cs = getComputedStyle(fade);
  if (cs.visibility === "hidden") return 0;
  return parseFloat(cs.opacity);
}

/* Nastaví průhlednost všem materiálům scény (jen během prolínání, pak vrátí původní stav). */
function applyAlpha(scene: THREE.Scene, a: number) {
  scene.traverse((o) => {
    const mats = (o as THREE.Mesh).material;
    if (!mats) return;
    for (const m of Array.isArray(mats) ? mats : [mats]) {
      const u = m.userData as { op?: number; tr?: boolean };
      if (u.op === undefined) {
        u.op = m.opacity;
        u.tr = m.transparent;
      }
      if (a >= 1) {
        m.opacity = u.op;
        m.transparent = u.tr!;
      } else {
        m.transparent = true;
        m.opacity = u.op * a;
      }
    }
  });
}

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/* Všechny views kvůli předkompilaci. Priorita 0 (hero) se připraví hned, ostatní až po úvodu. */
type Entry = { scene: THREE.Scene; camera: THREE.Camera; priority: number; ready: boolean };
const views = new Set<Entry>();

function setTransparent(scene: THREE.Scene, on: boolean) {
  scene.traverse((o) => {
    const mats = (o as THREE.Mesh).material;
    if (!mats) return;
    for (const m of Array.isArray(mats) ? mats : [mats]) {
      const u = m.userData as { tr0?: boolean };
      if (u.tr0 === undefined) u.tr0 = m.transparent;
      m.transparent = on ? true : u.tr0;
    }
  });
}

/* Kompilace three.js prochází jen viditelné objekty. Předměty, které se objeví až později
   (skryté do své fáze), by se jinak kompilovaly v okamžiku zobrazení a stránka by se zasekla. */
export async function compileAll(gl: THREE.WebGLRenderer, scene: THREE.Object3D, camera: THREE.Camera) {
  const hidden: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (!o.visible) {
      hidden.push(o);
      o.visible = true;
    }
  });
  try {
    await gl.compileAsync(scene, camera);
    // skutečné vykreslení do jednoho pixelu: vzniknou přesně ty varianty programů, které použije render
    // (compileAsync jich pár vynechá a ty by se pak sestavovaly až při scrollu)
    const vp = new THREE.Vector4();
    gl.getViewport(vp);
    const sc = gl.getScissorTest();
    gl.setViewport(0, 0, 1, 1);
    gl.setScissor(0, 0, 1, 1);
    gl.setScissorTest(true);
    gl.render(scene as THREE.Scene, camera);
    gl.setScissorTest(sc);
    gl.setViewport(vp);
  } finally {
    hidden.forEach((o) => (o.visible = false));
  }
}

/* Předem zkompiluje shadery všech scén (i průhlednou variantu, kterou používá prolínání)
   a nahraje textury do GPU. Bez toho se tohle děje při prvním vykreslení a stránka zamrzne. */
async function prepare(gl: THREE.WebGLRenderer, { scene, camera }: Entry) {
  {
    scene.traverse((o) => {
      const mats = (o as THREE.Mesh).material;
      if (!mats) return;
      for (const m of Array.isArray(mats) ? mats : [mats]) {
        const map = (m as THREE.MeshStandardMaterial).map;
        if (map) gl.initTexture(map);
      }
    });
    setTransparent(scene, true);
    await compileAll(gl, scene, camera);
    setTransparent(scene, false);
    await compileAll(gl, scene, camera);
  }
}

const idle = (ms: number) =>
  new Promise<void>((r) =>
    setTimeout(() => ("requestIdleCallback" in window ? requestIdleCallback(() => r(), { timeout: 1500 }) : r()), ms)
  );

/* Nejdřív hero (priorita 0) a hned ohlásí připravenost; zbytek po jedné scéně v klidových chvílích,
   ať kompilace nezasekne úvodní animaci. Scéna se kreslí až po své přípravě. */
export async function precompileAll(gl: THREE.WebGLRenderer, onFirst: () => void) {
  const all = [...views].sort((a, b) => a.priority - b.priority);
  for (const e of all.filter((e) => e.priority === 0)) {
    await prepare(gl, e);
    e.ready = true;
  }
  onFirst();
  for (const e of all.filter((e) => e.priority !== 0)) {
    await idle(e === all.find((x) => x.priority !== 0) ? 1800 : 200);
    await prepare(gl, e);
    e.ready = true;
  }
}

export function View({ slot, cam, priority = 1, children }: { slot: Slot; cam: Cam; priority?: number; children: React.ReactNode }) {
  const scene = useMemo(() => new THREE.Scene(), []);
  const camera = useMemo(() => {
    const c = new THREE.PerspectiveCamera(cam.fov, 1, 0.1, 60);
    c.position.set(...cam.pos);
    c.lookAt(...cam.look);
    return c;
  }, [cam]);
  const fx = useRef({ fade: undefined as HTMLElement | null | undefined, born: -1, full: false });

  const entry = useMemo<Entry>(() => ({ scene, camera, priority, ready: false }), [scene, camera, priority]);
  useEffect(() => {
    views.add(entry);
    return () => void views.delete(entry);
  }, [entry]);

  useFrame(({ gl, size, clock }) => {
    const el = slot.ref.current;
    if (!el || !entry.ready) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.bottom < 0 || r.top > size.height || r.right < 0 || r.left > size.width) {
      slot.alpha = 0;
      return;
    }

    // průhlednost: obal odhalení × jemný náběh při prvním zobrazení
    const f = fx.current;
    if (f.fade === undefined) f.fade = el.closest<HTMLElement>(".rv, [data-in]");
    let a = 1;
    if (f.fade) {
      a = revealOpacity(f.fade);
      // obal je plně odhalený natrvalo, dál už ho číst nemusíme
      if (a >= 0.999 && (!f.fade.classList.contains("rv") || f.fade.classList.contains("in"))) f.fade = null;
    }
    if (a <= 0.001) {
      slot.alpha = 0;
      return;
    }
    if (f.born < 0) f.born = clock.elapsedTime;
    a *= smooth((clock.elapsedTime - f.born) / 0.6);
    slot.alpha = a;
    if (a < 0.999) {
      applyAlpha(scene, a);
      f.full = false;
    } else if (!f.full) {
      applyAlpha(scene, 1);
      f.full = true;
    }

    const aspect = r.width / r.height;
    if (camera.aspect !== aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    const bottom = size.height - r.bottom;
    gl.setViewport(r.left, bottom, r.width, r.height);
    gl.setScissor(r.left, bottom, r.width, r.height);
    gl.setScissorTest(true);
    gl.render(scene, camera);
    gl.setScissorTest(false);
  }, 1);

  return createPortal(children, scene, { camera });
}

/* Zaoblený kvádr (náhrada drei RoundedBox). */
export function RoundedBox({
  args,
  radius = 0.05,
  smoothness = 3,
  children,
  ...rest
}: { args: [number, number, number]; radius?: number; smoothness?: number } & Omit<ThreeElements["mesh"], "args">) {
  const geo = useMemo(() => new RoundedBoxGeometry(args[0], args[1], args[2], smoothness, radius), [args[0], args[1], args[2], radius, smoothness]);
  return (
    <mesh geometry={geo} {...rest}>
      {children}
    </mesh>
  );
}
