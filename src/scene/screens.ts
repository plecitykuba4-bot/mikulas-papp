import * as THREE from "three";

/* Obsah obrazovek (kód, web, terminál, popisky) kreslený do canvasu.
   Je to dekorace; čitelný obsah stránky je v HTML. */

export const MONO = '"JetBrains Mono Variable", ui-monospace, monospace';
export const SANS = '"Geist Variable", ui-sans-serif, system-ui, sans-serif';

export type Screen = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; w: number; h: number };

export function makeScreen(w: number, h: number): Screen {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { canvas, ctx, tex, w, h };
}

/* Písmo se do canvasu dostane až po načtení, proto se obrazovky po document.fonts.ready překreslí. */
export const fontsReady = typeof document !== "undefined" ? document.fonts.ready : Promise.resolve();

export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/* Barvy syntaxe (tmavé IDE). */
export const SYN = {
  bg: "#1e1f22",
  bar: "#2b2d30",
  text: "#bcbec4",
  kw: "#cf8e6d",
  str: "#6aab73",
  ann: "#b3ae60",
  fn: "#56a8f5",
  num: "#2aacb8",
  com: "#7a7e85",
  gutter: "#4b5059",
};

/* Řádek kódu jako seznam [text, barva]. */
export type Tok = [string, string];
export type CodeLine = Tok[];

const k = (s: string): Tok => [s, SYN.kw];
const t = (s: string): Tok => [s, SYN.text];
const s_ = (s: string): Tok => [s, SYN.str];
const a = (s: string): Tok => [s, SYN.ann];
const f = (s: string): Tok => [s, SYN.fn];
const c = (s: string): Tok => [s, SYN.com];

export const KOTLIN: CodeLine[] = [
  [c("// Ahoj z Liberce")],
  [a("@RestController")],
  [k("class "), f("HelloController"), t(" {")],
  [],
  [t("    "), a("@GetMapping"), t("("), s_('"/ahoj"'), t(")")],
  [t("    "), k("fun "), f("ahoj"), t("() = "), f("Greeting"), t("(")],
  [t("        from = "), s_('"Mikuláš Papp"'), t(",")],
  [t("        stack = "), f("listOf"), t("("), s_('"Java"'), t(", "), s_('"Kotlin"'), t(")")],
  [t("    )")],
  [t("}")],
];

export const JAVA: CodeLine[] = [
  [k("public class "), f("Invoice"), t(" {")],
  [t("    "), a("@Getter"), t(" "), k("private "), t("Long id;")],
  [t("    "), a("@Getter"), t(" "), k("private "), t("BigDecimal total;")],
  [],
  [t("    "), k("public "), t("boolean "), f("isPaid"), t("() {")],
  [t("        "), k("return "), t("paidAt != "), k("null"), t(";")],
  [t("    }")],
  [t("}")],
];

export const lineLen = (l: CodeLine) => l.reduce((n, [s]) => n + s.length, 0);
export const codeLen = (code: CodeLine[]) => code.reduce((n, l) => n + lineLen(l) + 1, 0);

/* Editor: lišta se záložkou, čísla řádků, kód vypsaný do `chars` znaků, kurzor. */
export function drawEditor(sc: Screen, code: CodeLine[], chars: number, opts: { tab: string; size?: number; toast?: number; toastText?: string }) {
  const { ctx, w, h } = sc;
  const size = opts.size ?? 30;
  ctx.fillStyle = SYN.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = SYN.bar;
  ctx.fillRect(0, 0, w, size * 2);
  ["#ff6b5b", "#ffc23d", "#3fcf6a"].forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(size * 0.9 + i * size * 0.8, size, size * 0.24, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = SYN.bg;
  ctx.beginPath();
  ctx.roundRect(size * 3.6, size * 0.45, size * 6.4, size * 1.55, [size * 0.3, size * 0.3, 0, 0]);
  ctx.fill();
  ctx.font = `500 ${size * 0.72}px ${MONO}`;
  ctx.fillStyle = SYN.text;
  ctx.textBaseline = "middle";
  ctx.fillText(opts.tab, size * 4.2, size * 1.25);

  ctx.font = `500 ${size}px ${MONO}`;
  const lh = size * 1.5;
  const top = size * 3.1;
  const left = size * 2.6;
  const cw = ctx.measureText("M").width;
  let left_ = chars;
  let cx = left,
    cy = top;
  code.forEach((line, i) => {
    const y = top + i * lh;
    ctx.fillStyle = SYN.gutter;
    ctx.textAlign = "right";
    ctx.fillText(String(i + 1), size * 1.7, y);
    ctx.textAlign = "left";
    if (left_ <= 0) return;
    let x = left;
    for (const [txt, col] of line) {
      if (left_ <= 0) break;
      const part = txt.slice(0, left_);
      ctx.fillStyle = col;
      ctx.fillText(part, x, y);
      x += part.length * cw;
      left_ -= part.length;
    }
    cx = x;
    cy = y;
    left_ -= 1; // konec řádku
    if (left_ >= 0) {
      cx = left;
      cy = y + lh;
    }
  });
  // kurzor
  ctx.fillStyle = SYN.kw;
  ctx.fillRect(cx + 2, cy - size * 0.62, size * 0.12, size * 1.24);

  // zelená bublina „build ok“
  if (opts.toast && opts.toast > 0.01) {
    const a_ = Math.min(1, opts.toast);
    ctx.globalAlpha = a_;
    const tw = size * 9.6,
      th = size * 1.9;
    const tx = w - tw - size * 0.8,
      ty = h - th - size * 0.8 + (1 - a_) * size;
    ctx.fillStyle = "#12b886";
    rr(ctx, tx, ty, tw, th, size * 0.45);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `600 ${size * 0.82}px ${SANS}`;
    ctx.fillText(opts.toastText ?? "✓  Build úspěšný", tx + size * 0.7, ty + th / 2);
    ctx.globalAlpha = 1;
  }
  sc.tex.needsUpdate = true;
}

/* Mini web: osobní stránka, desktopové nebo mobilní rozložení. */
export function drawSite(sc: Screen, mobile: boolean, pressed = 0) {
  const { ctx, w, h } = sc;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  const u = w / 100;
  // lišta prohlížeče
  ctx.fillStyle = "#f0eef8";
  ctx.fillRect(0, 0, w, u * 9);
  ["#ff6b5b", "#ffc23d", "#3fcf6a"].forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(u * (4 + i * 3.4), u * 4.5, u * 1.1, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#ffffff";
  rr(ctx, u * 16, u * 2, u * (mobile ? 78 : 70), u * 5, u * 2.5);
  ctx.fill();
  ctx.fillStyle = "#8a87a0";
  ctx.font = `500 ${u * 2.6}px ${MONO}`;
  ctx.textBaseline = "middle";
  ctx.fillText("papp.dev", u * 19, u * 4.6);

  const pad = u * 6;
  const y0 = u * 16;
  // navigace
  ctx.fillStyle = "#15131f";
  ctx.font = `700 ${u * (mobile ? 5 : 3.2)}px ${SANS}`;
  ctx.fillText("Mikuláš.", pad, y0);
  if (!mobile) {
    ctx.fillStyle = "#6b6880";
    ctx.font = `500 ${u * 2.6}px ${SANS}`;
    ["Projekty", "Stack", "Kontakt"].forEach((l, i) => ctx.fillText(l, u * (55 + i * 13), y0));
  } else {
    ctx.fillStyle = "#15131f";
    for (let i = 0; i < 3; i++) ctx.fillRect(w - pad - u * 7, y0 - u * 2.2 + i * u * 2.2, u * 7, u * 0.9);
  }
  // nadpis
  ctx.fillStyle = "#15131f";
  const hs = mobile ? 9 : 6.4;
  ctx.font = `700 ${u * hs}px ${SANS}`;
  const hy = y0 + u * (mobile ? 16 : 13);
  if (mobile) {
    ctx.fillText("Ahoj,", pad, hy);
    ctx.fillText("jsem", pad, hy + u * hs * 1.1);
    ctx.fillStyle = "#4b3df5";
    ctx.fillText("vývojář.", pad, hy + u * hs * 2.2);
  } else {
    ctx.fillText("Ahoj, jsem", pad, hy);
    ctx.fillStyle = "#4b3df5";
    ctx.fillText("full stack vývojář.", pad, hy + u * hs * 1.15);
  }
  // tlačítko
  const by = mobile ? hy + u * hs * 3 : hy + u * hs * 2.1;
  const bw = mobile ? w - pad * 2 : u * 24;
  const bh = u * (mobile ? 9 : 6.5);
  ctx.fillStyle = pressed > 0.5 ? "#3a2be6" : "#4b3df5";
  rr(ctx, pad, by + pressed * u * 0.6, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `600 ${u * (mobile ? 3.6 : 2.6)}px ${SANS}`;
  ctx.textAlign = "center";
  ctx.fillText("Napsat mi →", pad + bw / 2, by + bh / 2 + pressed * u * 0.6);
  ctx.textAlign = "left";
  // karty
  const cy = by + bh + u * 6;
  const cols = mobile ? 1 : 3;
  const cards = ["#ffe3a6", "#dcd8ff", "#c6f1e1"];
  for (let i = 0; i < (mobile ? 2 : 3); i++) {
    const cwid = (w - pad * 2 - u * 3 * (cols - 1)) / cols;
    const x = mobile ? pad : pad + i * (cwid + u * 3);
    const y = mobile ? cy + i * u * 26 : cy;
    ctx.fillStyle = cards[i];
    rr(ctx, x, y, cwid, mobile ? u * 22 : u * 20, u * 2.5);
    ctx.fill();
  }
  sc.tex.needsUpdate = true;
}

/* Terminál: řádky [text, barva], vypsané do `chars`. */
export type TermLine = { p?: boolean; text: string; col?: string };
export const TERM: TermLine[] = [
  { p: true, text: "uname -sr" },
  { text: "Linux 6.8.0-45-generic", col: "#a9a6c4" },
  { p: true, text: "git pull --rebase" },
  { text: "Successfully rebased.", col: "#a9a6c4" },
  { p: true, text: "./gradlew build" },
  { text: "BUILD SUCCESSFUL in 14s", col: "#5fe0b0" },
];

export function drawTerminal(sc: Screen, chars: number, blink: boolean) {
  const { ctx, w, h } = sc;
  ctx.fillStyle = "#131222";
  ctx.fillRect(0, 0, w, h);
  const size = w / 26;
  ctx.fillStyle = "#1d1b31";
  ctx.fillRect(0, 0, w, size * 1.9);
  ["#ff6b5b", "#ffc23d", "#3fcf6a"].forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(size * 0.9 + i * size * 0.8, size * 0.95, size * 0.24, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#8f8ca8";
  ctx.font = `500 ${size * 0.62}px ${MONO}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("mikulas@liberec: ~", w / 2, size * 0.95);
  ctx.textAlign = "left";
  ctx.font = `500 ${size * 0.86}px ${MONO}`;
  const cw = ctx.measureText("M").width;
  let left = chars;
  let cx = size * 0.8,
    cy = size * 3;
  TERM.forEach((ln, i) => {
    const y = size * 3 + i * size * 1.45;
    if (left < 0) return;
    let x = size * 0.8;
    if (ln.p) {
      ctx.fillStyle = "#5fe0b0";
      ctx.fillText("$", x, y);
      x += cw * 2;
    }
    // výstup se vypíše celý najednou, příkaz se píše po znacích
    const shown = ln.p ? ln.text.slice(0, Math.max(0, left)) : left > 0 ? ln.text : "";
    ctx.fillStyle = ln.col ?? "#ecebf5";
    ctx.fillText(shown, x, y);
    left -= ln.p ? ln.text.length + 1 : 1;
    cx = x + shown.length * cw;
    cy = y;
    if (left >= 0 && !ln.p) {
      cx = size * 0.8 + cw * 2;
      cy = y + size * 1.45;
    }
  });
  if (blink) {
    ctx.fillStyle = "#5fe0b0";
    ctx.fillRect(cx + 3, cy - size * 0.5, size * 0.5, size);
  }
  sc.tex.needsUpdate = true;
}

/* Jednoduchý štítek (git větve, odpověď API). */
export function drawLabel(sc: Screen, text: string, bg: string, fg: string, mono = true) {
  const { ctx, w, h } = sc;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = bg;
  rr(ctx, 2, 2, w - 4, h - 4, (h - 4) / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.font = `600 ${h * 0.46}px ${mono ? MONO : SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2 + 1);
  sc.tex.needsUpdate = true;
}

/* Celé IDE (tmavý vzhled JetBrains): nástrojová lišta, strom projektu, záložky,
   kód vypsaný do `chars` znaků a dole běh aplikace s `logs` řádky. */
const LOGS: Tok[][] = [
  [["> Task :bootRun", "#7a7e85"]],
  [["  Started ", "#bcbec4"], ["FakturyApplication", "#56a8f5"], [" in 2.31 s", "#bcbec4"]],
  [["  GET ", "#cf8e6d"], ["/ahoj", "#bcbec4"], ["  →  ", "#7a7e85"], ["200 OK", "#6aab73"], ["  12 ms", "#7a7e85"]],
];

export function drawIde(sc: Screen, code: CodeLine[], chars: number, logs: number, blink: boolean) {
  const { ctx, w, h } = sc;
  const U = w / 1600;
  const px = (n: number) => n * U;
  ctx.textBaseline = "middle";
  // pozadí a rámy
  ctx.fillStyle = SYN.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = SYN.bar;
  ctx.fillRect(0, 0, w, px(70));
  ctx.fillRect(0, px(70), px(56), h);
  ctx.fillRect(px(56), px(70), px(330), h);
  ctx.fillRect(0, h - px(38), w, px(38));
  ctx.strokeStyle = "#1e1f22";
  ctx.lineWidth = px(2);
  ctx.beginPath();
  ctx.moveTo(px(386), px(70));
  ctx.lineTo(px(386), h);
  ctx.stroke();
  // lišta: projekt, větev, běh
  ctx.fillStyle = "#4b3df5";
  rr(ctx, px(26), px(19), px(32), px(32), px(7));
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${px(15)}px ${SANS}`;
  ctx.fillText("FA", px(31), px(36));
  ctx.fillStyle = "#dfe1e5";
  ctx.font = `600 ${px(21)}px ${SANS}`;
  ctx.fillText("faktury-api", px(72), px(36));
  ctx.fillStyle = "#9da0a8";
  ctx.font = `500 ${px(19)}px ${SANS}`;
  ctx.fillText("⎇  main", px(222), px(36));
  ctx.fillStyle = "#3d3f43";
  rr(ctx, w - px(380), px(16), px(230), px(38), px(8));
  ctx.fill();
  ctx.fillStyle = "#dfe1e5";
  ctx.fillText("FakturyApplication", w - px(366), px(36));
  ctx.fillStyle = "#57965c";
  ctx.beginPath();
  ctx.moveTo(w - px(124), px(24));
  ctx.lineTo(w - px(104), px(36));
  ctx.lineTo(w - px(124), px(48));
  ctx.fill();
  ctx.fillStyle = "#6f737a";
  for (let i = 0; i < 2; i++) {
    rr(ctx, w - px(80) + i * px(36), px(24), px(22), px(22), px(5));
    ctx.fill();
  }
  // svislá lišta nástrojů
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i === 0 ? "#3574f0" : "#5a5d63";
    rr(ctx, px(16), px(96) + i * px(48), px(24), px(24), px(6));
    ctx.fill();
  }
  // strom projektu
  const tree: [number, string, boolean?][] = [
    [0, "faktury-api"],
    [1, "src"],
    [2, "main"],
    [3, "kotlin"],
    [4, "HelloController.kt", true],
    [4, "FakturaApi.kt"],
    [4, "Invoice.java"],
    [3, "resources"],
    [4, "application.yml"],
    [1, "build.gradle.kts"],
  ];
  ctx.font = `500 ${px(19)}px ${SANS}`;
  tree.forEach(([d, name, sel], i) => {
    const y = px(110) + i * px(36);
    if (sel) {
      ctx.fillStyle = "#2e436e";
      ctx.fillRect(px(60), y - px(17), px(322), px(34));
    }
    const isFile = name.includes(".");
    ctx.fillStyle = isFile ? (name.endsWith(".kt") ? "#b99bf8" : name.endsWith(".java") ? "#e9a35d" : "#8d9199") : "#9da0a8";
    rr(ctx, px(76) + d * px(20), y - px(8), px(16), px(16), px(3));
    ctx.fill();
    ctx.fillStyle = sel ? "#ffffff" : "#bcbec4";
    ctx.fillText(name, px(102) + d * px(20), y);
  });
  // záložky editoru
  const ex = px(388);
  ctx.fillStyle = SYN.bg;
  ctx.fillRect(ex, px(70), w - ex, px(52));
  ctx.font = `500 ${px(19)}px ${SANS}`;
  ctx.fillStyle = "#dfe1e5";
  ctx.fillText("HelloController.kt", ex + px(46), px(96));
  ctx.fillStyle = "#b99bf8";
  rr(ctx, ex + px(20), px(88), px(16), px(16), px(3));
  ctx.fill();
  ctx.fillStyle = "#3574f0";
  ctx.fillRect(ex + px(14), px(119), px(220), px(3));
  ctx.fillStyle = "#8d9199";
  ctx.fillText("Invoice.java", ex + px(290), px(96));
  // kód
  const runTop = h - px(38) - px(238);
  const size = px(30);
  ctx.font = `500 ${size}px ${MONO}`;
  const cw = ctx.measureText("M").width;
  const lh = size * 1.5;
  const top = px(160);
  const left = ex + px(78);
  let rest = chars;
  let cx = left,
    cy = top;
  code.forEach((line, i) => {
    const y = top + i * lh;
    if (y > runTop - px(10)) return;
    ctx.fillStyle = SYN.gutter;
    ctx.textAlign = "right";
    ctx.fillText(String(i + 1), ex + px(50), y);
    ctx.textAlign = "left";
    if (rest <= 0) return;
    let x = left;
    for (const [txt, col] of line) {
      if (rest <= 0) break;
      const part = txt.slice(0, rest);
      ctx.fillStyle = col;
      ctx.fillText(part, x, y);
      x += part.length * cw;
      rest -= part.length;
    }
    cx = x;
    cy = y;
    rest -= 1;
    if (rest >= 0) {
      cx = left;
      cy = y + lh;
    }
  });
  if (blink) {
    ctx.fillStyle = "#ced0d6";
    ctx.fillRect(cx + px(1), cy - size * 0.62, px(2.5), size * 1.24);
  }
  // běh aplikace
  ctx.fillStyle = SYN.bar;
  ctx.fillRect(ex, runTop, w - ex, px(238));
  ctx.fillStyle = "#1e1f22";
  ctx.fillRect(ex, runTop, w - ex, px(2));
  ctx.font = `600 ${px(19)}px ${SANS}`;
  ctx.fillStyle = "#dfe1e5";
  ctx.fillText("Run", ex + px(22), runTop + px(30));
  ctx.fillStyle = "#9da0a8";
  ctx.font = `500 ${px(19)}px ${SANS}`;
  ctx.fillText("FakturyApplication", ex + px(76), runTop + px(30));
  ctx.font = `500 ${px(20)}px ${MONO}`;
  LOGS.slice(0, logs).forEach((ln, i) => {
    let x = ex + px(22);
    const y = runTop + px(76) + i * px(40);
    for (const [txt, col] of ln) {
      ctx.fillStyle = col;
      ctx.fillText(txt, x, y);
      x += ctx.measureText(txt).width;
    }
  });
  // stavový řádek
  ctx.fillStyle = "#9da0a8";
  ctx.font = `500 ${px(17)}px ${SANS}`;
  ctx.fillText("faktury-api › src › main › kotlin › HelloController.kt", px(20), h - px(19));
  ctx.textAlign = "right";
  ctx.fillText("UTF-8    Kotlin    LF", w - px(20), h - px(19));
  ctx.textAlign = "left";
  sc.tex.needsUpdate = true;
}
