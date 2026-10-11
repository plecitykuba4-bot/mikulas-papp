import { Component, Fragment, lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Camera, EnvelopeSimple, LinkedinLogo, List, MapPin, X } from "@phosphor-icons/react";
import { ABOUT, CONTACT_EMAIL, HERO, JOURNEY, LINKEDIN, NAV, PRINCIPLES, STACK } from "./content";
import { gsap, ScrollTrigger, reducedMotion, revealOnView, scrollToHash, startSmoothScroll } from "./lib/motion";
import { ApiLog, Binding, GitLog, Top } from "./Widgets";
import { scene, slots, trackPointer, type Slot } from "./scene/state";

// 3D modul se začne stahovat hned při startu stránky, souběžně s písmem a textem
const scenePromise = typeof window !== "undefined" && webglOk() ? import("./scene/Scene") : null;
const Scene = lazy(() => scenePromise ?? import("./scene/Scene"));

/* Když 3D selže (chunk, WebGL), stránka běží dál bez něj. */
class Safe extends Component<{ children: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  render() {
    return this.state.err ? null : this.props.children;
  }
}

function webglOk() {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

const go = (href: string, after?: () => void) => (e: React.MouseEvent) => {
  e.preventDefault();
  after?.();
  scrollToHash(href);
};

/* Prázdný prvek, do jehož obdélníku kreslí 3D. */
function Stage({ slot, className, children }: { slot: Slot; className?: string; children?: React.ReactNode }) {
  return (
    <div
      className={className}
      ref={(el) => void (slot.ref.current = el)}
      onPointerEnter={() => (slot.hover = true)}
      onPointerLeave={() => (slot.hover = false)}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

/* Světlo pod kurzorem na kartách. */
const glow = (e: React.PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--gx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--gy", `${e.clientY - r.top}px`);
};

/* Tlačítko, které se lehce přitáhne ke kurzoru. */
function Magnetic({
  children,
  className,
  href,
  onClick,
  external,
  slot,
}: {
  children: React.ReactNode;
  className: string;
  href: string;
  onClick?: (e: React.MouseEvent) => void;
  external?: boolean;
  slot?: Slot;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const el = ref.current!;
    if (reducedMotion() || matchMedia("(hover: none)").matches) return;
    const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.22);
      y((e.clientY - r.top - r.height / 2) * 0.3);
    };
    const leave = () => {
      x(0);
      y(0);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);
  return (
    <a
      ref={ref}
      className={className}
      href={href}
      onClick={onClick}
      onPointerEnter={slot && (() => (slot.hover = true))}
      onPointerLeave={slot && (() => (slot.hover = false))}
      onFocus={slot && (() => (slot.hover = true))}
      onBlur={slot && (() => (slot.hover = false))}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

function Nav() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const on = () => {
      setSolid(scrollY > 20);
      const h = document.getElementById("top");
      setDark(!!h && scrollY < h.offsetHeight - 40);
    };
    on();
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`nav${solid ? " solid" : ""}${dark ? " dark" : ""}${open ? " open" : ""}`}>
      <div className="nav-in">
        <a href="#top" className="nav-logo" onClick={go("#top")} aria-label="Mikuláš Papp, úvod">
          Mikuláš Papp<span className="dot">.</span>
        </a>
        <nav className="nav-links" aria-label="Hlavní">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={go(n.href)}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="nav-end">
          <a href="#kontakt" className="btn btn-ink btn-sm nav-cta" onClick={go("#kontakt")}>
            Ozvěte se
          </a>
          <button className="nav-burger" aria-label={open ? "Zavřít menu" : "Otevřít menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X size={22} /> : <List size={22} />}
          </button>
        </div>
      </div>
      <div className="nav-sheet" hidden={!open}>
        {NAV.map((n) => (
          <a key={n.href} href={n.href} onClick={go(n.href, () => setOpen(false))}>
            {n.label}
          </a>
        ))}
      </div>
    </header>
  );
}

function Hero() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current!;
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom top",
      onUpdate: (s) => (scene.heroOut = s.progress),
    });
    if (reducedMotion()) return () => st.kill();
    const tl = gsap.timeline({ paused: true });
    tl.fromTo(".nav-in > *", { y: -14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out", stagger: 0.06 }, 0)
      .fromTo(el.querySelectorAll(".h1 .w > span"), { yPercent: 110, autoAlpha: 1 }, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.07 }, 0.1)
      .fromTo(el.querySelectorAll("[data-in]"), { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out", stagger: 0.08 }, 0.45);
    // úvod začne, až je písmo i 3D připravené (shadery zkompilované), aby se notebook otevíral
    // současně s textem a nic těžkého nezasekávalo animaci; nejdéle za 1,4 s
    const sceneReady = new Promise((r) => addEventListener("scene-ready", r, { once: true }));
    Promise.race([Promise.all([document.fonts.ready, sceneReady]), new Promise((r) => setTimeout(r, 1400))]).then(() => {
      if (tl.isActive() || tl.progress() > 0) return;
      tl.play();
    });
    return () => {
      st.kill();
      tl.kill();
    };
  }, []);
  const words = ["Mikuláš", "Papp,", "full", "stack", "vývojář", "z", "Liberce."];
  return (
    <section className="hero" id="top" ref={root}>
      <div className="hero-bg" aria-hidden="true" />
      <div className="wrap hero-grid">
        <div className="hero-copy">
        <h1 className="h1">
          {words.map((w, i) => (
            <Fragment key={i}>
              <span className="w">
                <span className={i === 2 || i === 3 ? "accent" : i < 2 ? "name" : undefined}>{w}</span>
              </span>
              {i === 1 ? <br /> : " "}
            </Fragment>
          ))}
        </h1>
        <p className="lead" data-in>
          {HERO.lead}
        </p>
        <div className="hero-cta" data-in>
          <Magnetic href="#kontakt" className="btn btn-accent" onClick={go("#kontakt")}>
            Ozvěte se <ArrowRight size={18} weight="bold" />
          </Magnetic>
          <a href="#cesta" className="btn btn-ghost" onClick={go("#cesta")}>
            Moje cesta <ArrowDown size={16} weight="bold" />
          </a>
        </div>
        </div>
        <div className="hero-stage" data-in>
          <Stage slot={slots.hero} className="stage stage-hero" />
        </div>
      </div>
    </section>
  );
}

/* Cesta: milníky scrollují normálně se stránkou, stůl stojí po straně (sticky) a přibývá na něm vybavení. */
function Journey() {
  const root = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top 55%",
      end: "bottom 62%",
      onUpdate: (s) => {
        const v = Math.min(3, Math.max(0, s.progress * 3.5 - 0.25));
        scene.journey = v;
        setStep(Math.min(3, Math.round(v)));
        if (fill.current) fill.current.style.transform = `scaleY(${s.progress})`;
      },
    });
    return () => st.kill();
  }, []);
  return (
    <section className="sec journey" id="cesta">
      <div className="wrap">
        <div className="sec-head rv">
          <h2 className="h2">Od pájky po full stack.</h2>
          <p className="lead">Začal jsem u logických obvodů a pájky. Dnes stavím aplikace od databáze po obrazovku. Stůl se postupně zaplnil.</p>
        </div>
        <div className="jr-grid" ref={root}>
          <ol className="jr-steps">
            <span className="jr-line" aria-hidden="true">
              <span ref={fill} />
            </span>
            {JOURNEY.map((s, i) => (
              <li key={s.title} className={`jr-step${i === step ? " on" : ""}${i < step ? " done" : ""}`}>
                <span className="jr-dot" aria-hidden="true" />
                <div>
                  <p className="jr-years">{s.years}</p>
                  <h3 className="h3">{s.title}</h3>
                  <p className="jr-place">{s.place}</p>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="jr-sticky">
            <Stage slot={slots.journey} className="stage stage-journey" />
            {/* na mobilu štítek s aktuálním obdobím: spojuje kartu se stolem s milníkem pod ní */}
            <p className="jr-now" aria-hidden="true">
              {JOURNEY[step].years}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Stack: živé ukázky, které pořád něco dělají; najetí spustí jinou akci. */
const WIDGETS = [ApiLog, Binding, Top, GitLog];
function StackCard({ i }: { i: number }) {
  const [hover, setHover] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const s = STACK[i];
  const W = WIDGETS[i];
  // na dotyku se akce spustí, když karta projíždí středem obrazovky
  useEffect(() => {
    if (!matchMedia("(hover: none)").matches) return;
    const io = new IntersectionObserver(([e]) => setHover(e.isIntersecting), { rootMargin: "-38% 0px -38% 0px" });
    io.observe(ref.current!);
    return () => io.disconnect();
  }, []);
  return (
    <article
      ref={ref}
      className={`st-card st-${s.key} rv`}
      style={{ transitionDelay: `${i * 80}ms` }}
      onPointerMove={glow}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <W hover={hover} />
      <div className="st-body">
        <h3 className="h3">{s.title}</h3>
        <ul className="chips">
          {s.items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
        <p className="st-note">{s.note}</p>
        <p className="st-hint">{s.hint}</p>
      </div>
    </article>
  );
}

function Stack() {
  return (
    <section className="sec stack" id="stack">
      <div className="wrap">
        <div className="sec-head rv">
          <h2 className="h2">S čím pracuju.</h2>
          <p className="lead">Java a Kotlin na serveru, AngularJS v prohlížeči, Linux pod tím. Každá karta běží naživo, najetím spustíte akci.</p>
        </div>
        <div className="st-grid">
          {STACK.map((_, i) => (
            <StackCard key={i} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PhotoSlot({ label, className }: { label: string; className?: string }) {
  return (
    <figure className={`ph ph-empty ${className ?? ""}`}>
      <Camera size={22} weight="regular" />
      <figcaption>{label}</figcaption>
    </figure>
  );
}

function About() {
  return (
    <section className="sec about" id="o-mne">
      <div className="wrap ab-grid">
        <div className="ab-photos rv">
          <figure className="ph ph-main">
            <img src="/img/portret.webp" alt="Mikuláš Papp" width={720} height={720} loading="lazy" />
          </figure>
          <PhotoSlot className="ph-a" label="Místo pro fotku — u práce" />
          <PhotoSlot className="ph-b" label="Místo pro fotku — mimo kód" />
        </div>
        <div className="ab-copy rv">
          <h2 className="h2">Pořádně, přehledně a srozumitelně.</h2>
          {ABOUT.map((p) => (
            <p key={p.slice(0, 20)}>{p}</p>
          ))}
          <ul className="principles">
            {PRINCIPLES.map((p) => (
              <li key={p.w}>
                <strong>{p.w}.</strong> {p.d}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section className="contact" id="kontakt">
      <div className="wrap ct-in">
        <div className="ct-copy rv">
        <h2 className="h-xl">
          Máte projekt<span className="accent">?</span>
          <br />
          Postavím ho.
        </h2>
        <p className="lead">Napište mi, co potřebujete. Web, aplikaci nebo systém od databáze po obrazovku rád navrhnu a postavím.</p>
        <div className="ct-actions">
          <Magnetic href={LINKEDIN} className="btn btn-amber btn-lg" external>
            <LinkedinLogo size={20} weight="fill" /> Napsat na LinkedIn <ArrowUpRight size={18} weight="bold" />
          </Magnetic>
          {CONTACT_EMAIL && (
            <a className="btn btn-ghost-light btn-lg" href={`mailto:${CONTACT_EMAIL}`}>
              <EnvelopeSimple size={20} /> {CONTACT_EMAIL}
            </a>
          )}
        </div>
        <p className="ct-place">
          <MapPin size={16} /> Liberec, CZ
        </p>
        </div>
        <div className="stage stage-join" ref={(el) => void (slots.contact.ref.current = el)} aria-hidden="true" />
      </div>
      <footer className="wrap foot">
        <span>© {new Date().getFullYear()} Mikuláš Papp</span>
        <a href="#top" onClick={go("#top")}>
          Nahoru ↑
        </a>
      </footer>
    </section>
  );
}

export default function App() {
  const [gl] = useState(webglOk);
  // 3D (načtení modulu, sestavení scén, kompilace) až po doběhnutí úvodu, nejpozději za 3 s
  useEffect(() => {
    scene.reduced = reducedMotion();
    startSmoothScroll();
    const off = trackPointer();
    const offRv = revealOnView();
    // na dotyku není najetí myší: 3D v kartě se rozpohybuje, když karta projíždí středem obrazovky
    let io: IntersectionObserver | undefined;
    if (matchMedia("(hover: none)").matches) {
      const map = new Map<Element, Slot>();
      io = new IntersectionObserver((es) => es.forEach((e) => map.get(e.target) && (map.get(e.target)!.hover = e.isIntersecting)), {
        rootMargin: "-35% 0px -35% 0px",
      });
      map.forEach((_, el) => io!.observe(el));
    }
    // obálka v kontaktu se otevře sama, jakmile je z větší části vidět
    const ct = document.querySelector(".stage-join");
    const ioCt = new IntersectionObserver(([e]) => (slots.contact.hover = e.isIntersecting), { threshold: 0.55 });
    if (ct) ioCt.observe(ct);
    // obrázky a písmo mění výšky, spouštěče ScrollTriggeru se musí přepočítat
    const ro = new ResizeObserver(() => ScrollTrigger.refresh());
    ro.observe(document.querySelector("main")!);
    return () => {
      off();
      offRv();
      io?.disconnect();
      ioCt.disconnect();
      ro.disconnect();
    };
  }, []);
  return (
    <div className={gl ? "has-gl" : "no-gl"}>
      <Nav />
      <main>
        <Hero />
        <Journey />
        <Stack />
        <About />
        <Contact />
      </main>
      {gl && (
        <Safe>
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Safe>
      )}
    </div>
  );
}
