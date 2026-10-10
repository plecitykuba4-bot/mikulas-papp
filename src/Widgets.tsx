import { useEffect, useRef, useState } from "react";
import { reducedMotion } from "./lib/motion";

/* Živé ukázky ke kartám stacku. Každá pořád něco dělá (log API, data binding, zátěž CPU, commity)
   a po najetí myší udělá něco jiného (odpověď API, mobilní rozložení, build, větev a merge).
   Běží jen když jsou vidět; s reduced motion stojí v čitelném stavu. */

/* Viditelnost prvku. */
function useVisible<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVis(e.isIntersecting), { rootMargin: "80px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, vis] as const;
}

/* Opakovaný tik, jen když běží. */
function useTick(on: boolean, ms: number, fn: () => void) {
  const f = useRef(fn);
  f.current = fn;
  useEffect(() => {
    if (!on || reducedMotion()) return;
    const id = setInterval(() => f.current(), ms);
    return () => clearInterval(id);
  }, [on, ms]);
}

/* Postupné vypsání textu (0..len), jen když běží. */
function useTyped(text: string, on: boolean, speed = 28) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) {
      setN(0);
      return;
    }
    if (reducedMotion()) {
      setN(text.length);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i++;
      setN(i);
      if (i >= text.length) clearInterval(id);
    }, 1000 / speed);
    return () => clearInterval(id);
  }, [text, on, speed]);
  return text.slice(0, n);
}

/* ---------- Backend: log API ---------- */
type Req = { id: number; m: string; path: string; code: number; ms: number };
const POOL: Omit<Req, "id" | "ms">[] = [
  { m: "GET", path: "/api/faktury?mesic=10", code: 200 },
  { m: "GET", path: "/api/faktury/148", code: 200 },
  { m: "PUT", path: "/api/faktury/148/zaplaceno", code: 204 },
  { m: "GET", path: "/api/zakaznici/52", code: 200 },
  { m: "POST", path: "/api/exporty/pdf", code: 202 },
  { m: "GET", path: "/api/faktury/9999", code: 404 },
  { m: "GET", path: "/actuator/health", code: 200 },
];
const JSON_RESP = `{
  "id": 149,
  "zakaznik": "Actis s.r.o.",
  "castka": 12400,
  "mena": "CZK",
  "zaplaceno": false
}`;

export function ApiLog({ hover }: { hover: boolean }) {
  const [ref, vis] = useVisible<HTMLDivElement>();
  const seq = useRef(0);
  const [rows, setRows] = useState<Req[]>(() =>
    POOL.slice(0, 5).map((r, i) => ({ ...r, id: i, ms: 8 + ((i * 7) % 30) }))
  );
  useTick(vis && !hover, 1150, () => {
    seq.current++;
    const r = POOL[(seq.current * 3) % POOL.length];
    setRows((rs) => [{ ...r, id: 100 + seq.current, ms: 6 + ((seq.current * 13) % 41) }, ...rs].slice(0, 5));
  });
  const json = useTyped(JSON_RESP, hover, 70);
  return (
    <div ref={ref} className={`wg wg-dark wg-api${hover ? " is-hover" : ""}`}>
      <div className="wg-bar">
        <span className="wg-dots" />
        <span>faktury-api · access log</span>
        <span className="wg-live">živě</span>
      </div>
      <ul className="api-rows">
        {rows.map((r) => (
          <li key={r.id}>
            <b className={`m m-${r.m.toLowerCase()}`}>{r.m}</b>
            <span className="p">{r.path}</span>
            <b className={`c c-${String(r.code)[0]}`}>{r.code}</b>
            <span className="t">{r.ms} ms</span>
          </li>
        ))}
      </ul>
      <div className="api-resp" aria-hidden={!hover}>
        <div className="api-req">
          <b className="m m-post">POST</b> <span>/api/faktury</span> <b className="c c-2">201 Created</b>
        </div>
        <pre>{json}</pre>
      </div>
    </div>
  );
}

/* ---------- Frontend: data binding ---------- */
const NAMES = ["Mikuláši", "Terezo", "týme Actis", "náboráři"];
export function Binding({ hover }: { hover: boolean }) {
  const [ref, vis] = useVisible<HTMLDivElement>();
  const [state, setState] = useState({ word: 0, n: NAMES[0].length, dir: 0 as -1 | 0 | 1, hold: 6 });
  useTick(vis, 90, () =>
    setState((s) => {
      const w = NAMES[s.word];
      if (s.dir === 0) return s.hold > 0 ? { ...s, hold: s.hold - 1 } : { ...s, dir: -1 };
      if (s.dir === -1) return s.n > 0 ? { ...s, n: s.n - 1 } : { ...s, word: (s.word + 1) % NAMES.length, dir: 1 };
      return s.n < NAMES[s.word].length ? { ...s, n: s.n + 1 } : { ...s, dir: 0, hold: 18 + w.length };
    })
  );
  const val = NAMES[state.word].slice(0, state.n);
  return (
    <div ref={ref} className={`wg wg-light wg-bind${hover ? " is-mobile" : ""}`}>
      <pre className="bind-code">
        <span className="tg">&lt;input</span> <span className="at">ng-model</span>=<span className="st">"jmeno"</span>
        <span className="tg">&gt;</span>
        {"\n"}
        <span className="tg">&lt;h3&gt;</span>Ahoj, <span className="ex">{"{{ jmeno }}"}</span>!<span className="tg">&lt;/h3&gt;</span>
      </pre>
      <div className="bind-view">
        <div className="bind-device">
          <span className="bind-label">Jméno</span>
          <span className="bind-input">
            {val}
            <i className="caret" />
          </span>
          <h4>
            Ahoj, <em>{val || "…"}</em>!
          </h4>
          <span className="bind-btn">Odeslat</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Systém: zátěž CPU, po najetí build ---------- */
const BUILD = ["> Task :compileKotlin", "> Task :compileJava", "> Task :test", "> Task :bootJar"];
export function Top({ hover }: { hover: boolean }) {
  const [ref, vis] = useVisible<HTMLDivElement>();
  const [cpu, setCpu] = useState([23, 41, 12, 57]);
  const [up, setUp] = useState(0);
  useTick(vis && !hover, 600, () => {
    setCpu((c) => c.map((v, i) => Math.max(4, Math.min(96, v + (((Date.now() / 600 + i * 17) * 7919) % 31) - 15))));
    setUp((u) => u + 1);
  });
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!hover) {
      setStep(0);
      return;
    }
    if (reducedMotion()) {
      setStep(BUILD.length + 1);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i++;
      setStep(i);
      if (i > BUILD.length) clearInterval(id);
    }, 420);
    return () => clearInterval(id);
  }, [hover]);
  const cmd = useTyped("./gradlew build", hover, 30);
  const bar = (v: number) => "|".repeat(Math.round(v / 5)).padEnd(20, " ");
  const mins = 12 + Math.floor(up / 10);
  return (
    <div ref={ref} className="wg wg-dark wg-term">
      <div className="wg-bar">
        <span className="wg-dots" />
        <span>mikulas@liberec: ~</span>
      </div>
      {!hover ? (
        <pre className="term">
          {cpu.map((v, i) => (
            <span key={i} className="cpu">
              {i + 1} [<span className={v > 70 ? "hot" : "ok"}>{bar(v)}</span>
              {String(Math.round(v)).padStart(3)}%]{"\n"}
            </span>
          ))}
          <span className="dim">Mem</span> [<span className="ok">{"|".repeat(11).padEnd(20)}</span> 6.1G/16G]{"\n"}
          <span className="dim">Tasks: 214, load average: 0.42 0.38 0.31{"\n"}Uptime: 3 days, 04:{String(mins).padStart(2, "0")}</span>
        </pre>
      ) : (
        <pre className="term">
          <span className="pr">$</span> {cmd}
          <i className="caret caret-mint" />
          {"\n"}
          {BUILD.slice(0, step).map((l) => (
            <span key={l} className="dim">
              {l}
              {"\n"}
            </span>
          ))}
          {step > BUILD.length && <span className="okb">BUILD SUCCESSFUL in 14s</span>}
        </pre>
      )}
    </div>
  );
}

/* ---------- Nástroje: git log, po najetí větev a merge ---------- */
const MSGS = [
  "feat: export faktur do PDF",
  "fix: zaokrouhlení DPH",
  "refactor: FakturaService",
  "test: validace IČO",
  "chore: Gradle 8.10",
  "feat: filtr podle data",
  "fix: null v Lombok builderu",
  "docs: popis API ve Swaggeru",
];
const hash = (n: number) => ((n * 2654435761) >>> 0).toString(16).padStart(8, "0").slice(0, 7);
type Commit = { id: number; msg: string; lane: 0 | 1; merge?: boolean };

export function GitLog({ hover }: { hover: boolean }) {
  const [ref, vis] = useVisible<HTMLDivElement>();
  const seq = useRef(4);
  const [log, setLog] = useState<Commit[]>(() => [3, 2, 1, 0].map((i) => ({ id: i, msg: MSGS[i], lane: 0 as const })));
  useTick(vis && !hover, 2000, () => {
    seq.current++;
    const id = seq.current;
    setLog((l) => [{ id, msg: MSGS[id % MSGS.length], lane: 0 as const }, ...l].slice(0, 5));
  });
  // najetí: větev feature/export se dvěma commity a merge do main
  useEffect(() => {
    if (!hover) return;
    const steps: Commit[] = [
      { id: 0, msg: "feat(export): šablona PDF", lane: 1 },
      { id: 0, msg: "test(export): souhrn DPH", lane: 1 },
      { id: 0, msg: "Merge branch 'feature/export'", lane: 0, merge: true },
    ];
    let i = 0;
    const push = () => {
      seq.current++;
      const c = { ...steps[i], id: seq.current };
      setLog((l) => [c, ...l].slice(0, 5));
      i++;
    };
    if (reducedMotion()) {
      while (i < steps.length) push();
      return;
    }
    push();
    const id = setInterval(() => (i < steps.length ? push() : clearInterval(id)), 650);
    return () => clearInterval(id);
  }, [hover]);
  return (
    <div ref={ref} className="wg wg-light wg-git">
      <ul className="git">
        {log.map((c, i) => (
          <li key={c.id} className={`lane-${c.lane}${c.merge ? " merge" : ""}`}>
            <span className="rail" aria-hidden="true">
              <i className="dot" />
            </span>
            <code>{hash(c.id)}</code>
            <span className="msg">{c.msg}</span>
            {i === 0 && <b className="tag">{c.lane ? "feature/export" : "main"}</b>}
          </li>
        ))}
      </ul>
    </div>
  );
}
