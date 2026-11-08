import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRoute } from "./lib/router";
import { load, useResource, type Summary } from "./lib/data";
import { Footer, Header } from "./components/Shell";
import { Palette } from "./components/Palette";
import { Skeleton } from "./components/ui";
import { Landing } from "./views/Landing";

const Plants = lazy(() => import("./views/Plants").then((m) => ({ default: m.Plants })));
const PlantPage = lazy(() => import("./views/PlantPage").then((m) => ({ default: m.PlantPage })));
const Findings = lazy(() => import("./views/Findings").then((m) => ({ default: m.Findings })));
const Leads = lazy(() => import("./views/Leads").then((m) => ({ default: m.Leads })));
const LeadDossier = lazy(() => import("./views/LeadDossier").then((m) => ({ default: m.LeadDossier })));
const Data = lazy(() => import("./views/Data").then((m) => ({ default: m.Data })));
const Methods = lazy(() => import("./views/Methods").then((m) => ({ default: m.Methods })));
const Credits = lazy(() => import("./views/Credits").then((m) => ({ default: m.Credits })));
const About = lazy(() => import("./views/About").then((m) => ({ default: m.About })));
const NotFound = lazy(() => import("./views/NotFound").then((m) => ({ default: m.NotFound })));

const META: Record<string, [string, string]> = {
  "": ["Palimpsest: Dioscorides, Culpeper and the modern evidence", "Dioscorides’ Greek (c. 60 CE) and Culpeper’s Complete Herbal (1653), read to the word, mapped to 692 plants and tested against modern literature: 642 claims survived, 2.65× more than chance."],
  plants: ["Plants · Palimpsest", "692 accepted taxa traced from Greek and English names, with their indications and modern evidence."],
  findings: ["Findings · Palimpsest", "Culpeper repeats Dioscorides 2.65× more than chance; claimed indications are more often studied, but not studied more."],
  evidence: ["Findings · Palimpsest", "Transmission tests, matched controls and odds ratios."],
  lead: ["Lead dossier · Palimpsest", "One persistent, under-studied plant–indication pair: both quotations, identification, the exact literature query, safety and a citation."],
  leads: ["Leads · Palimpsest", "60 persistent but under-studied plant–indication pairs, with safety and IUCN flags. Hypotheses, not advice."],
  data: ["Data and API · Palimpsest", "Download the knowledge graph, claims and leads; licences, citation and how to reproduce."],
  methods: ["Methods and responsible use · Palimpsest", "How a Greek clause becomes a hypothesis, and where the chain can break."],
  credits: ["Image credits · Palimpsest", "Public-domain folios of the Vienna Dioscurides and woodcuts from Fuchs, Gerard and Culpeper."],
  about: ["About · Palimpsest", "The Palimpsest project and team, EthnoHack 2026."],
};

function setMeta(title: string, desc: string) {
  document.title = title;
  document.querySelector('meta[name="description"]')?.setAttribute("content", desc);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", desc);
}

export function App() {
  const route = useRoute();
  const summary = useResource<Summary>("summary.json");
  const section = route.path[0] ?? "";
  const pathKey = route.path.join("/");
  const first = useRef(true);
  const [palette, setPalette] = useState(false);
  const openPalette = useCallback(() => setPalette(true), []);

  useEffect(() => {
    const m = META[section];
    if (section === "plant" && route.path[1]) {
      const name = route.path[1].replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
      setMeta(`${name} · Palimpsest`, `${name}: names across eras, the Greek and English text with every extracted indication, modern evidence, constituents and conservation status.`);
    } else if (m) setMeta(m[0], m[1]);
    else setMeta("Page not found · Palimpsest", META[""][1]);
    if (first.current) { first.current = false; if (route.anchor) return; return; }
    if (route.anchor) return; // the anchor effect below owns the scroll
    window.scrollTo({ top: 0 });
    document.getElementById("page-title")?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathKey]);

  // In-page anchors (#/findings#controls): wait for the lazy view to render the target, then go there.
  useEffect(() => {
    if (!route.anchor) return;
    let tries = 0, t = 0;
    const seek = () => {
      const el = document.getElementById(route.anchor!);
      if (el) {
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ behavior: reduce || tries > 0 ? "auto" : "smooth", block: "start" });
        if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
        el.focus({ preventScroll: true });
      } else if (tries++ < 40) t = window.setTimeout(seek, 60);
    };
    seek();
    return () => window.clearTimeout(t);
  }, [route.anchor, pathKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setPalette((o) => !o); }
      else if (e.key === "/" && !palette) {
        const t = e.target as HTMLElement | null;
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
        e.preventDefault(); setPalette(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [palette]);

  // Warm the search index once the page is idle, so the first ⌘K is instant.
  useEffect(() => {
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const t = idle ? idle(() => void load("derived/search.json").catch(() => {})) : window.setTimeout(() => void load("derived/search.json").catch(() => {}), 2500);
    return () => { if (!idle) window.clearTimeout(t); };
  }, []);

  let view;
  switch (section) {
    case "": view = <Landing onSearch={openPalette} />; break;
    case "plants": view = <Plants route={route} />; break;
    case "plant": view = <PlantPage key={route.path[1]} slug={route.path[1] ?? ""} route={route} />; break;
    case "findings": case "evidence": view = <Findings />; break;
    case "leads": view = <Leads route={route} />; break;
    case "lead": view = <LeadDossier key={route.path[1]} rank={Number(route.path[1])} />; break;
    case "data": view = <Data />; break;
    case "methods": view = <Methods />; break;
    case "credits": view = <Credits />; break;
    case "about": view = <About />; break;
    default: view = <NotFound onSearch={openPalette} />;
  }

  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>Skip to content</a>
      <Header section={section} onSearch={openPalette} />
      <main id="main" tabIndex={-1}>
        <Suspense fallback={<div className="wrap page"><Skeleton rows={10} label="Opening the page" /></div>}>{view}</Suspense>
      </main>
      <Footer summary={summary.data} />
      <Palette open={palette} onClose={() => setPalette(false)} />
    </>
  );
}
