/* Texty webu. Fakta jsou z jeho LinkedInu a z dosavadního webu (zdroje/). */

// Skutečný e-mail zatím nemáme (na starém webu je jen zástupný hello@example.com).
// Po doplnění se tlačítka „Napsat e-mail“ zapnou sama.
export const CONTACT_EMAIL = "";
export const LINKEDIN = "https://www.linkedin.com/in/mikul%C3%A1%C5%A1-papp-3b4b12424/";

export const NAV = [
  { href: "#cesta", label: "Cesta" },
  { href: "#stack", label: "Stack" },
  { href: "#o-mne", label: "O mně" },
  { href: "#kontakt", label: "Kontakt" },
];

export const HERO = {
  title: "Full stack vývojář z Liberce.",
  lead: "Java, Groovy a Kotlin na backendu, AngularJS na frontendu. Ze zájmu React a Svelte. Linuxák.",
  motto: "Snažím se věci dělat pořádně, přehledně a srozumitelně.",
  status: "Otevřený novým nabídkám",
  facts: [
    { v: "7+ let", d: "v Actis – Software Specialists" },
    { v: "Java · Kotlin", d: "Groovy a AngularJS denně" },
    { v: "Liberec", d: "on-site, hybridně i na dálku" },
  ],
};

export const JOURNEY = [
  {
    years: "2011 – 2015",
    title: "Elektrotechnika a elektronika",
    place: "Škoda Auto — Střední odborné učiliště strojírenské",
    text: "Logické obvody, proud, napětí a pájka. Maturita v roce 2015. Základ, ze kterého dodnes vychází, jak o systémech přemýšlím.",
  },
  {
    years: "2019 – 2021",
    title: "Junior Full Stack Developer",
    place: "Actis – Software Specialists · částečný úvazek",
    text: "První kód za peníze. Dva roky Java vývoje a front-endu vedle sebe, kousek po kousku.",
  },
  {
    years: "od 2021",
    title: "Full Stack Developer",
    place: "Actis – Software Specialists · Liberec",
    text: "Naplno a na celé šíři: Java, Groovy, Kotlin, AngularJS, Project Lombok, Swagger API a další. Přes pět let na jednom produktu od databáze po obrazovku.",
  },
  {
    years: "dnes",
    title: "Váš projekt?",
    place: "Liberec · osobně i na dálku",
    text: "Mám chuť na další práci. Pokud máte projekt, který potřebuje postavit pořádně, ozvěte se.",
  },
];

export const STACK = [
  { key: "backend", title: "Backend", items: ["Java", "Groovy", "Kotlin"], note: "Každodenní práce. Služby, API a logika, na které všechno stojí.", hint: "Najeďte a pošlete požadavek →" },
  { key: "frontend", title: "Frontend", items: ["AngularJS", "React", "Svelte"], note: "AngularJS v práci, React a Svelte ze zájmu.", hint: "Najeďte a přepněte na mobil →" },
  { key: "system", title: "Systém", items: ["Linux", "Terminál"], note: "Linuxák. Nejrychlejší cesta je příkazová řádka.", hint: "Najeďte a spusťte build →" },
  { key: "tools", title: "Nástroje", items: ["IntelliJ IDEA", "WebStorm", "Git", "Lombok", "Swagger"], note: "V IntelliJ a WebStormu pracuju i s AI agenty.", hint: "Najeďte a mergněte větev →" },
] as const;

export const ABOUT = [
  "Jsem full stack vývojář z Liberce. Od roku 2019 pracuju ve firmě Actis – Software Specialists: první dva roky jako junior na částečný úvazek, od června 2021 jako full stack vývojář.",
  "Na backendu píšu v Javě, Groovy a Kotlinu, na frontendu v AngularJS. Ze zájmu se věnuju i Reactu a Svelte. A jsem linuxák.",
  "V IntelliJ IDEA a WebStormu pracuju i s AI agenty — na generování, refaktorování a vysvětlování kódu.",
];

export const PRINCIPLES = [
  { w: "Pořádně", d: "Kód, který vydrží další úpravu." },
  { w: "Přehledně", d: "Aby se v něm vyznal i kolega." },
  { w: "Srozumitelně", d: "Vysvětlit, co a proč dělám." },
];
