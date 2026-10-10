/* Sdílený stav mezi stránkou a 3D. Stránka zapisuje vstupy (kurzor, hover, scroll),
   scény z nich v rAF smyčce počítají pohyb. Bez importu three, aby zůstal v líném chunku. */

export type Slot = {
  ref: { current: HTMLElement | null };
  mx: number; // kurzor v prvku, -1..1
  my: number;
  hover: boolean;
  alpha: number; // jak moc je 3D právě vidět (0..1), zapisuje View
};

const slot = (): Slot => ({ ref: { current: null }, mx: 0, my: 0, hover: false, alpha: 0 });

export const slots = {
  hero: slot(),
  journey: slot(),
  icons: [slot(), slot(), slot(), slot()],
  contact: slot(),
};

export const scene = {
  reduced: false,
  heroOut: 0, // 0..1, jak daleko odjel hero
  journey: 0, // 0..3, průběh sekce Cesta (plovoucí index milníku)
};

/* Naladěné vizuální parametry na jednom místě. */
export const controls = {
  accent: "#4b3df5",
  accentSoft: "#b9b2ff",
  ink: "#111216",
  graphite: "#2a2c33",
  paper: "#f4f4f0",
  glass: "#ffffff",
  tilt: 0.32, // jak moc se stack natáčí za kurzorem
  sway: 0.09, // rozkmit stálého kývání (rad)
  breathe: 0.06, // jak moc se vrstvy rozestupují v klidu
  spring: 0.075, // tuhost pružin ve scéně Cesta
};

/* Kurzor do slotů: jeden posluchač, souřadnice relativně k prvku. */
export function trackPointer() {
  const all = () => [slots.hero, slots.journey, slots.contact, ...slots.icons];
  const move = (e: PointerEvent) => {
    for (const s of all()) {
      const el = s.ref.current;
      if (!el) continue;
      const r = el.getBoundingClientRect();
      s.mx = Math.max(-1.5, Math.min(1.5, ((e.clientX - r.left) / r.width) * 2 - 1));
      s.my = Math.max(-1.5, Math.min(1.5, -(((e.clientY - r.top) / r.height) * 2 - 1)));
    }
  };
  addEventListener("pointermove", move, { passive: true });
  return () => removeEventListener("pointermove", move);
}

export const flags = { ready: false };
export const markSceneReady = () => {
  flags.ready = true;
  dispatchEvent(new Event("scene-ready"));
};
