import { useEffect, useMemo, useRef, useState } from "react";
import {
  assetUrl, conceptMap, recordFile, useResource,
  type Concept, type PlantRecord, type StatsRaw, type Summary,
} from "../lib/data";
import { href, to } from "../lib/router";
import { fmt } from "../lib/format";
import { readLift, readPersistence, readRegression, readSensitivity } from "../lib/stats";
import { clause, firstSpan } from "../lib/text";
import { useImages, srcSet, smallest } from "../lib/images";
import { SITE } from "../lib/export";
import { Arch, Caution, CopyButton, Kbd, isMac } from "../components/ui";

type Era = "all" | "dsc" | "cul" | "now";
const ERAS: { id: Era; year: string; who: string }[] = [
  { id: "all", year: "All layers", who: "as the page stands" },
  { id: "dsc", year: "c. 60 CE", who: "Dioscorides" },
  { id: "cul", year: "1653", who: "Culpeper" },
  { id: "now", year: "2026", who: "Accepted name" },
];
const HERO = {
  srcs: [1800, 1200, 640].map((w) => `${assetUrl(`img/codex/wiener-dioskurides-absinthion-badypikron-${w}.webp`)} ${w}w`).join(", "),
  src: assetUrl("img/codex/wiener-dioskurides-absinthion-badypikron-1200.webp"),
  w: 1200, h: 1496,
};
const FOCUS = "jaundice";
const WORMWOOD = "artemisia-absinthium";

/* ------------------------------------------------------------------ hero */

function useFirstVisit(): boolean {
  // The writing-over sequence plays once per session; afterwards the stack simply is.
  const [first] = useState(() => {
    try { if (sessionStorage.getItem("ps-intro")) return false; sessionStorage.setItem("ps-intro", "1"); } catch { /* storage blocked */ }
    return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  });
  return first;
}

function NameStack({ era, setEra, intro }: { era: Era; setEra: (e: Era) => void; intro: boolean }) {
  const radios = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!n) return;
    e.preventDefault();
    const j = (i + n + ERAS.length) % ERAS.length;
    setEra(ERAS[j].id);
    radios.current[j]?.focus();
  };
  return (
    <div className={`stack is-${era} ${intro ? "is-intro" : ""}`}>
      <p className="stack-layers" aria-label="Wormwood, three names: ἀψίνθιον in Dioscorides, Wormwood in Culpeper, Artemisia absinthium today">
        <span className="layer layer--dsc" lang="grc" aria-hidden="true">ἀψίνθιον</span>
        <span className="layer layer--cul" aria-hidden="true">Wormwood</span>
        <span className="layer layer--now" aria-hidden="true"><i>Artemisia absinthium</i></span>
      </p>
      <div className="eras" role="radiogroup" aria-label="Which layer to read">
        {ERAS.map((e, i) => {
          const on = era === e.id;
          return (
            <button
              key={e.id}
              ref={(el) => { radios.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              className={`era era--${e.id}`}
              onClick={() => setEra(e.id)}
              onKeyDown={(ev) => onKey(ev, i)}
            >
              <span className="era-mark" aria-hidden="true" />
              <span className="era-year num">{e.year}</span>
              <span className="era-who">{e.who}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EraReading({ era, rec, cmap }: { era: Era; rec: PlantRecord | undefined; cmap: Map<string, Concept> }) {
  const label = cmap.get(FOCUS)?.label ?? "Jaundice";
  const mesh = cmap.get(FOCUS)?.mesh_id;
  const d = rec?.texts["dsc:3.23"], c = rec?.texts["cul:327-wormwood"];
  const ds = d?.text ? firstSpan(d, FOCUS) : null;
  const cs = c?.text ? firstSpan(c, FOCUS) : null;
  const claim = rec?.plant.claims?.find((x) => x.concept_id === FOCUS);
  if (!rec) return <div className="reading-line is-pending" aria-hidden="true" />;
  const show = era === "all" ? "dsc" : era;
  return (
    <div className="reading-line" aria-live="polite">
      {show === "dsc" && d?.text && ds && (() => { const k = clause(d.text, ds, 44, 46); return (
        <p><span className="reading-src">De materia medica 3.23</span><q lang="grc" className="grc">{k.cutStart ? "… " : ""}{k.pre}<mark className="hl hl--dsc">{k.hit}</mark>{k.post}{k.cutEnd ? " …" : ""}</q></p>
      ); })()}
      {show === "cul" && c?.text && cs && (() => { const k = clause(c.text, cs, 60, 30); return (
        <p><span className="reading-src">Complete Herbal, Wormwood</span><q>{k.cutStart ? "… " : ""}{k.pre}<mark className="hl hl--cul">{k.hit}</mark>{k.post}{k.cutEnd ? " …" : ""}</q></p>
      ); })()}
      {show === "now" && (
        <p><span className="reading-src">Europe PMC, 2026</span>
          <span><b className="num">{fmt.int(claim?.epmc_pair)}</b> papers name <i>Artemisia absinthium</i> with {label.toLowerCase()}, of <span className="num">{fmt.int(rec.plant.epmc_total)}</span> on the plant{mesh ? <> (MeSH <span className="num">{mesh}</span>)</> : null}.</span></p>
      )}
    </div>
  );
}

function Hero({ onSearch }: { onSearch: () => void }) {
  const intro = useFirstVisit();
  const [era, setEra] = useState<Era>("all");
  const rec = useResource<PlantRecord>(recordFile(WORMWOOD));
  const concepts = useResource<Concept[]>("concepts.json");
  const cmap = conceptMap(concepts.data ?? []);
  const summary = useResource<Summary>("summary.json");
  const n = summary.data?.counts;
  return (
    <section className="hero" aria-labelledby="page-title">
      <div className="wrap hero-grid">
        <div className="hero-text">
          <NameStack era={era} setEra={setEra} intro={intro} />
          <EraReading era={era} rec={rec.data} cmap={cmap} />
          <h1 id="page-title" tabIndex={-1} className="hero-title">Two herbals, sixteen centuries apart, read to the word and tested against modern evidence.</h1>
          <p className="hero-lede">
            Palimpsest maps the <span className="num">{fmt.int(n?.dsc_chapters ?? 822)}</span> Greek chapters of Dioscorides and the <span className="num">{fmt.int(n?.cul_monographs ?? 328)}</span> monographs of Culpeper onto <span className="num">{fmt.int(n?.taxa ?? 692)}</span> accepted plants, keeps the exact words of <span className="num">{fmt.int(n?.claims ?? 10399)}</span> claims, and asks which survived, and whether science has looked.
          </p>
          <div className="hero-actions">
            <button type="button" className="searchbox" onClick={onSearch} aria-label="Search plants, Greek names and indications" aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}>
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="m12.7 12.7 4.3 4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              <span className="searchbox-ph">Search <span lang="grc" className="grc">ἀψίνθιον</span>, rue, jaundice…</span>
              <span className="searchbox-keys" aria-hidden="true"><Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd><Kbd>K</Kbd></span>
            </button>
            <a className="btn btn--ink" href={href("/findings")}>Read the findings</a>
          </div>
        </div>
        <figure className="hero-folio">
          <a href={href(`/plant/${WORMWOOD}`)} className="hero-folio-link" aria-label="Open the wormwood record">
            <img
              src={HERO.src} srcSet={HERO.srcs} sizes="(max-width: 860px) 92vw, 40vw"
              width={HERO.w} height={HERO.h} alt="Wormwood in the Vienna Dioscurides: a tall grey-green plant with feathery leaves and seed heads, its Greek name written in red uncials beneath it."
              fetchPriority="high" decoding="async"
            />
          </a>
          <figcaption className="seam">
            <span lang="grc" className="grc">ἀψίνθιον βαθύπικρον</span>, “very bitter wormwood”. Vienna Dioscurides, Constantinople, c. 512 CE. Public domain. <a href={href("/credits")}>Credits</a>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ findings on gold */

function NullStrip({ observed, mean, lo, hi }: { observed: number; mean: number; lo: number; hi: number }) {
  const max = Math.ceil((observed * 1.12) / 100) * 100;
  const x = (v: number) => 4 + (v / max) * 292;
  return (
    <svg className="mini" viewBox="0 0 300 54" role="img" aria-label={`Chance gives ${fmt.int(lo)} to ${fmt.int(hi)} shared claims (mean ${fmt.int(mean)}); observed ${fmt.int(observed)}.`}>
      <line x1={4} x2={296} y1={34} y2={34} className="mini-axis" />
      <rect x={x(lo)} y={27} width={Math.max(2, x(hi) - x(lo))} height={14} className="mini-band" />
      <line x1={x(mean)} x2={x(mean)} y1={23} y2={45} className="mini-tick" />
      <circle cx={x(observed)} cy={34} r={6} className="mini-dot" />
      <text x={x(mean)} y={16} textAnchor="middle" className="mini-label">chance ≈ {fmt.int(mean)}</text>
      <text x={x(observed)} y={16} textAnchor="end" className="mini-label mini-label--strong">observed {fmt.int(observed)}</text>
      <text x={4} y={54} className="mini-tickl">0</text>
      <text x={296} y={54} textAnchor="end" className="mini-tickl">{fmt.int(max)}</text>
    </svg>
  );
}

function ShareBars({ a, b }: { a: number; b: number }) {
  const W = 230;
  return (
    <svg className="mini" viewBox="0 0 300 54" role="img" aria-label={`${fmt.pct(a)} of claims in both herbals have a modern paper, against ${fmt.pct(b)} of unclaimed indications of the same plants.`}>
      <rect x={0} y={6} width={W * a} height={14} className="mini-bar" />
      <text x={W * a + 8} y={17} className="mini-label mini-label--strong">{fmt.pct(a)} claimed by both</text>
      <rect x={0} y={32} width={W * b} height={14} className="mini-bar mini-bar--ref" />
      <text x={W * b + 8} y={43} className="mini-label">{fmt.pct(b)} unclaimed, same plants</text>
    </svg>
  );
}

function RatioStrip({ v, lo, hi }: { v: number; lo: number; hi: number }) {
  const L = Math.log, a = 0.4, z = 3;
  const x = (t: number) => 8 + ((L(t) - L(a)) / (L(z) - L(a))) * 284;
  return (
    <svg className="mini" viewBox="0 0 300 54" role="img" aria-label={`Rate ratio ${fmt.two(v)}, 95% interval ${fmt.two(lo)} to ${fmt.two(hi)}, which includes 1: no difference.`}>
      <line x1={x(1)} x2={x(1)} y1={4} y2={46} className="mini-ref" />
      <text x={x(1) + 5} y={12} className="mini-tickl">no difference</text>
      <line x1={x(lo)} x2={x(hi)} y1={30} y2={30} className="mini-ci" />
      <circle cx={x(v)} cy={30} r={6} className="mini-dot mini-dot--open" />
      <text x={x(lo)} y={50} textAnchor="middle" className="mini-tickl">{fmt.two(lo)}</text>
      <text x={x(hi)} y={50} textAnchor="middle" className="mini-tickl">{fmt.two(hi)}</text>
    </svg>
  );
}

function Findings() {
  const stats = useResource<StatsRaw>("stats.json");
  const s = stats.data;
  const per = readPersistence(s);
  const sens = readSensitivity(s);
  const share = readLift(s, "share");
  const logit = readRegression(s, "logit");
  const pois = readRegression(s, "poisson");
  const both = share.find((r) => r.key === "both");
  const matched = ((s?.["lift_by_group"] as Record<string, unknown>[] | undefined) ?? []).find((g) => g["group"] === "both")?.["matched_unclaimed_share"] as number | undefined;
  const or = logit.find((r) => r.key === "both");
  const rr = pois.find((r) => r.key === "both");
  const size = sens.find((x) => x.key === "size_stratified");
  const fam = sens.find((x) => x.key === "within_family");
  const q = (s?.["persistence"] as { null_q?: number[] } | undefined)?.null_q;
  return (
    <section className="gilt" aria-labelledby="findings-title">
      <div className="wrap">
        <div className="gilt-head">
          <h2 id="findings-title">Three findings</h2>
          <p className="gilt-sub">Every number below is computed from the shipped data and opens as a full figure with its model, interval and caveats.</p>
        </div>
        {stats.status === "error" && <p>The statistics did not load. <button type="button" className="linkish" onClick={stats.retry}>Try again</button></p>}
        <ol className="finds">
          <li className="find">
            <h3 className="find-claim">Knowledge persisted. Culpeper repeats Dioscorides <span className="find-fig num">{per?.ratio ? `${fmt.one(per.ratio)}×` : "2.6×"}</span> more often than chance.</h3>
            {per?.observed != null && per.nullMean != null && <NullStrip observed={per.observed} mean={per.nullMean} lo={q?.[0] ?? per.nullMean * 0.88} hi={q?.[2] ?? per.nullMean * 1.12} />}
            <p className="find-body">{fmt.int(per?.observed)} shared plant–indication claims across {fmt.int(per?.nTaxa)} species, against about {fmt.int(per?.nullMean)} if Culpeper’s claims were shuffled among the same plants. It holds when plants are only swapped with plants of similar entry length ({size?.fold ? `${fmt.two(size.fold)}×` : "2.11×"}) and within the same botanical family ({fam?.fold ? `${fmt.two(fam.fold)}×` : "1.56×"}).</p>
            <a className="find-link" href={href("/findings", null, "transmission")}>The transmission test</a>
          </li>
          <li className="find">
            <h3 className="find-claim">Science has looked. Claims both herbals make are studied at all more often: <span className="find-fig num">{both ? fmt.pct(both.value) : "45%"}</span> against {matched != null ? fmt.pct(matched) : "32%"}.</h3>
            {both && matched != null && <ShareBars a={both.value} b={matched} />}
            <p className="find-body">Share of plant–indication pairs with at least one co-mentioning paper, compared with unclaimed indications of exactly the same plants. Odds ratio {or ? `${fmt.two(or.value)} [${fmt.two(or.lo)}–${fmt.two(or.hi)}]` : "2.77"} with indication fixed effects and plant research volume.</p>
            <a className="find-link" href={href("/findings", null, "controls")}>Matched controls and odds ratios</a>
          </li>
          <li className="find">
            <h3 className="find-claim">But not hard. Once studied, persistent claims draw <span className="find-fig num">{rr ? `${fmt.two(rr.value)}×` : "1.04×"}</span> the papers: no more than any other.</h3>
            {rr && rr.lo != null && rr.hi != null && <RatioStrip v={rr.value} lo={rr.lo} hi={rr.hi} />}
            <p className="find-body">Tradition predicts <em>whether</em> modern research looked, not <em>how hard</em>. That gap is where the leads come from: pairs both herbals agree on that have at most four papers.</p>
            <a className="find-link" href={href("/leads")}>The 60 ranked leads</a>
          </li>
        </ol>
        <p className="gilt-foot">Co-mention counts measure research attention, not efficacy. <a href={href("/methods", null, "limits")}>Read the limitations</a>.</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ three ways in */

const WAYS: { who: string; title: string; text: string; links: [string, string][]; note?: boolean }[] = [
  {
    who: "historians",
    title: "Historians of medicine",
    text: "Read Dioscorides in Wellmann’s Greek beside Culpeper, with every extracted indication marked in place and each plant name traced through the eras with its confidence and justification.",
    links: [["Wormwood, both texts facing", `/plant/${WORMWOOD}`], ["How a Greek name becomes a binomial", "/methods#names"], ["Every plant, by Greek lemma", "/plants?sort=name"]],
  },
  {
    who: "pharmacognosy",
    title: "Pharmacognosy and drug discovery",
    text: "Sixty persistent but under-studied plant–indication pairs, ranked transparently with LOTUS constituents, literature gaps, historical warnings and IUCN status. Export any view.",
    links: [["The ranked leads", "/leads"], ["Lead 1: rue for eye complaints", "/plant/ruta-graveolens?c=eye_disease"], ["Knowledge graph and claims", "/data"]],
  },
  {
    who: "clinicians",
    title: "Clinicians and the public",
    text: "These are hypotheses drawn from historical texts, for laboratory follow-up. An evidence tier counts papers, not results; a paper can report harm or no effect.",
    links: [["What a tier means, and does not", "/methods#tiers"], ["Responsible use", "/methods#responsible"], ["Safety flags on the leads", "/leads?safety=1"]],
    note: true,
  },
];

function Ways() {
  return (
    <section className="ways" aria-labelledby="ways-title">
      <div className="wrap">
        <h2 id="ways-title">Three ways in</h2>
        <div className="canon" role="list">
          {WAYS.map((w) => (
            <article key={w.who} className={`canon-col canon-col--${w.who}`} role="listitem" aria-labelledby={`way-${w.who}`}>
              <Arch />
              <h3 id={`way-${w.who}`}>{w.title}</h3>
              <p className="canon-text">{w.text}</p>
              <ul className="canon-links">
                {w.links.map(([label, target]) => <li key={target}><a href={to(target)}>{label}</a></li>)}
              </ul>
              {w.note && <Caution tone="line">Not medical advice. Several of these plants are poisonous; consult a qualified professional.</Caution>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ one claim, followed */

function Chain() {
  const rec = useResource<PlantRecord>(recordFile(WORMWOOD));
  const concepts = useResource<Concept[]>("concepts.json");
  const c = conceptMap(concepts.data ?? []).get(FOCUS);
  const r = rec.data;
  const d = r?.texts["dsc:3.23"], cu = r?.texts["cul:327-wormwood"];
  const ds = d?.text ? firstSpan(d, FOCUS) : null, cs = cu?.text ? firstSpan(cu, FOCUS) : null;
  const claim = r?.plant.claims?.find((x) => x.concept_id === FOCUS);
  const dk = d?.text && ds ? clause(d.text, ds, 30, 18) : null;
  const ck = cu?.text && cs ? clause(cu.text, cs, 36, 12) : null;
  return (
    <section className="chain-sec" aria-labelledby="chain-title">
      <div className="wrap">
        <div className="sec-head">
          <h2 id="chain-title">One claim, followed from the page to the paper</h2>
          <p className="sec-lede">Every number in the explorer can be walked back to the characters it came from. This is wormwood for jaundice.</p>
        </div>
        <ol className="trail">
          <li className="trail-step">
            <p className="trail-what"><span className="trail-when">c. 60 CE</span> Dioscorides 3.23, characters {ds ? `${ds.start}–${ds.end}` : "…"}</p>
            {dk && <p className="trail-quote grc" lang="grc">{dk.cutStart ? "… " : ""}{dk.pre}<mark className="hl hl--dsc">{dk.hit}</mark>{dk.post}{dk.cutEnd ? " …" : ""}</p>}
          </li>
          <li className="trail-step">
            <p className="trail-what"><span className="trail-when">Concept</span> {c?.label ?? "Jaundice"}{c?.mesh_id ? <>, MeSH <span className="num">{c.mesh_id}</span></> : null}</p>
            <p className="trail-quote">Ancient-Greek stem <span lang="grc" className="grc">ικτερ-</span> and the English historical crosswalk both resolve here.</p>
          </li>
          <li className="trail-step">
            <p className="trail-what"><span className="trail-when">1653</span> Culpeper, Wormwood</p>
            {ck && <p className="trail-quote">{ck.cutStart ? "… " : ""}{ck.pre}<mark className="hl hl--cul">{ck.hit}</mark>{ck.post}{ck.cutEnd ? " …" : ""}</p>}
          </li>
          <li className="trail-step">
            <p className="trail-what"><span className="trail-when">2026</span> Europe PMC</p>
            <p className="trail-quote"><b className="num">{fmt.int(claim?.epmc_pair)}</b> papers co-mention plant and indication; tier: {claim?.evidence_tier ?? "…"}. Lift <span className="num">{fmt.lift(claim?.lift)}</span>.</p>
          </li>
        </ol>
        <p className="chain-more"><a className="btn btn--line" href={href(`/plant/${WORMWOOD}`, { c: FOCUS })}>Open the wormwood record</a></p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ the codex */

const GALLERY = ["wiener-dioskurides-krokos", "wiener-dioskurides-cyclamen", "wiener-dioskurides-ion-porphyroyn", "melisse-wiener-dioskurides-6-jh", "wiener-dioskurides-konion", "iris-147v-dioscoride-vienne", "wiener-dioskurides-glykyrizon", "cannabissativadior", "wiener-dioskurides-chamomilla"];

function Codex() {
  const imgs = useImages();
  const search = useResource<{ plants: { s: string; t: string }[] }>("derived/search.json");
  const slugOf = useMemo(() => new Map((search.data?.plants ?? []).map((p) => [p.t, p.s])), [search.data]);
  const list = GALLERY.map((id) => imgs.byId.get(id)).filter((x): x is NonNullable<typeof x> => !!x && x.taxa.length > 0);
  const vd = new Set(imgs.list.filter((i) => i.work.startsWith("Vienna")).flatMap((i) => i.taxa));
  const nTaxa = vd.size;
  const nFuchs = new Set(imgs.list.filter((i) => i.work.startsWith("Leonhart")).flatMap((i) => i.taxa).filter((t) => !vd.has(t))).size;
  return (
    <section className="codex" aria-labelledby="codex-title">
      <div className="wrap">
        <div className="sec-head sec-head--split">
          <h2 id="codex-title">The plants as Constantinople painted them</h2>
          <p className="sec-lede">
            Around 512 CE, Byzantine illuminators made a luxury copy of Dioscorides for the princess Anicia Juliana. {nTaxa ? <><span className="num">{nTaxa}</span> of our plants keep their folio in it{nFuchs ? <>, and {nFuchs} more their 1542 woodcut by Fuchs</> : null}.</> : null} <a href={href("/credits")}>All {imgs.list.length || 94} images and their licences</a>.
          </p>
        </div>
      </div>
      <ul className="strip" aria-label="Folios from the Vienna Dioscurides">
        {list.map((im) => {
          const slug = slugOf.get(im.taxa[0]);
          const ratio = im.width / im.height;
          return (
            <li key={im.id} style={{ ["--r" as string]: ratio.toFixed(3) }}>
              <a href={slug ? href(`/plant/${slug}`) : href("/credits")}>
                <img src={smallest(im, 600)} srcSet={srcSet(im)} sizes="(max-width: 700px) 60vw, 22vw" width={im.srcs[0].w} height={im.srcs[0].h} alt="" loading="lazy" decoding="async" style={{ backgroundColor: im.color }} />
                <span className="strip-cap"><span lang="grc" className="grc">{im.label.split(",")[0]}</span><i>{im.taxa[0]}</i></span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ close */

function Close() {
  const cite = `Palimpsest: reading 2,000 years of European materia medica against modern evidence. EthnoHack 2026. ${SITE.repo}`;
  return (
    <section className="close" aria-labelledby="close-title">
      <div className="wrap close-grid">
        <div>
          <h2 id="close-title">Open, citable, reproducible</h2>
          <p className="sec-lede">The pipeline reruns offline from cached responses; every figure here is computed from files you can download.</p>
        </div>
        <div className="close-cite">
          <h3 className="close-label">Cite</h3>
          <p className="close-text">{cite}</p>
          <CopyButton text={cite} label="Copy citation" />
        </div>
        <div className="close-cite">
          <h3 className="close-label">Reproduce</h3>
          <pre className="close-code"><code>python -m palimpsest corpus extract evaluate</code></pre>
          <a className="btn btn--line" href={href("/data")}>Data, API and licences</a>
        </div>
      </div>
    </section>
  );
}

export function Landing({ onSearch }: { onSearch: () => void }) {
  // Prefetch the plant-page chunk when the visitor shows intent.
  useEffect(() => { const t = window.setTimeout(() => { void import("./PlantPage"); }, 3500); return () => window.clearTimeout(t); }, []);
  return (
    <div className="landing">
      <Hero onSearch={onSearch} />
      <Findings />
      <Ways />
      <Chain />
      <Codex />
      <Close />
    </div>
  );
}
