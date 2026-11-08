import { lazy, Suspense, useEffect, useMemo, type ReactNode } from "react";
import {
  conceptMap, load, recordFile, useResource,
  type Concept, type PlantRecord,
} from "../lib/data";
import { href, to } from "../lib/router";
import { fmt } from "../lib/format";
import { clause, firstSpan } from "../lib/text";
import { useImages, srcSet, smallest } from "../lib/images";
import { SITE } from "../lib/export";
import { Arch, Caution, CopyButton, Ext, Kbd, Skeleton, TierMeter, isMac } from "../components/ui";
import { Scrape, type ScrapeLayer } from "../components/Scrape";
import { useInView } from "../charts/kit";
import INLINE from "../generated/inline.json";

const SurvivalFlow = lazy(() => import("../charts/SurvivalFlow").then((m) => ({ default: m.SurvivalFlow })));

const H = INLINE.hero;
const WORMWOOD = "artemisia-absinthium";
const FOCUS = "jaundice";

type Mark = { k: string; s: number; e: number };
const MARK_CLASS: Record<string, string> = { eye: "lm lm--claim", juice: "lm lm--same", fennel: "lm lm--same", honey: "lm lm--same" };

/** Text from one source with its aligned words marked; offsets are characters in the edition. */
function Marked({ text, base, marks, lang }: { text: string; base: number; marks: Mark[]; lang?: string }) {
  const out: ReactNode[] = [];
  let at = 0;
  const ms = marks.map((m) => ({ ...m, s: m.s - base, e: m.e - base })).filter((m) => m.s >= 0 && m.e <= text.length).sort((a, b) => a.s - b.s);
  ms.forEach((m, i) => {
    if (m.s > at) out.push(text.slice(at, m.s));
    out.push(<span key={i} className={MARK_CLASS[m.k] ?? "lm"} data-k={m.k} lang={lang}>{text.slice(m.s, m.e)}</span>);
    at = m.e;
  });
  out.push(text.slice(at));
  return <>{out}</>;
}

const LAYERS: [ScrapeLayer, ScrapeLayer, ScrapeLayer] = [
  {
    id: "cul", era: "1653", who: "Culpeper", label: `Culpeper on ${H.names.cul}, the eye remedy`,
    body: (
      <div className="leaf-body">
        <p className="leaf-head"><span className="leaf-src">Culpeper, <i>The Complete Herbal</i></span><span className="leaf-ref num">1653 · {H.cul.title}</span></p>
        <p className="leaf-name leaf-name--cul">{H.names.cul}</p>
        <p className="leaf-text leaf-text--cul"><span className="leaf-initial" aria-hidden="true">{H.cul.text.charAt(0)}</span><span className="visually-hidden">{H.cul.text.charAt(0)}</span><Marked text={H.cul.text.slice(1)} base={H.cul.start + H.cul.lead + 1} marks={H.cul.marks} /></p>
        <p className="leaf-foot">Project Gutenberg 49513, characters <span className="num">{fmt.int(H.cul.start + H.cul.lead)}–{fmt.int(H.cul.start + H.cul.lead + H.cul.text.length)}</span></p>
      </div>
    ),
  },
  {
    id: "dsc", era: "c. 60 CE", who: "Dioscorides", label: `Dioscorides on ${H.names.dsc}, the same recipe in Greek`,
    body: (
      <div className="leaf-body">
        <p className="leaf-head"><span className="leaf-src">Dioscorides, <i>De materia medica</i> {H.dsc.ref.replace("dsc:", "")}</span><span className="leaf-ref num">c. 60 CE</span></p>
        <p className="leaf-name leaf-name--dsc" lang="grc">{H.names.dsc}</p>
        <p className="leaf-text leaf-text--dsc" lang="grc">
          <Marked text={H.dsc.head} base={H.dsc.headStart} marks={H.dsc.marks} lang="grc" /> … <Marked text={H.dsc.text} base={H.dsc.start} marks={H.dsc.marks} lang="grc" />
        </p>
        <p className="leaf-gloss"><span className="leaf-gloss-tag">Literal gloss</span> “the <b>juice</b> … helps <b>dim sight</b>, smeared on with <b>fennel</b> juice and <b>honey</b>.”</p>
        <p className="leaf-foot">Wellmann’s edition via First1KGreek, characters <span className="num">{fmt.int(H.dsc.start)}–{fmt.int(H.dsc.start + H.dsc.text.length)}</span> · CC BY-SA 4.0</p>
      </div>
    ),
  },
  {
    id: "now", era: "2026", who: "the evidence", label: `${H.papers_pair} papers name ${H.taxon} with an eye complaint`,
    body: (
      <div className="leaf-body leaf-body--now">
        <p className="leaf-head"><span className="leaf-src">Europe PMC, searched 2026</span><span className="leaf-ref num">Lead {H.rank} of {INLINE.leads}</span></p>
        <p className="leaf-name leaf-name--now"><i>{H.taxon}</i></p>
        <p className="leaf-zero"><span className="leaf-zero-n num">{H.papers_pair}</span><span className="leaf-zero-t">papers name {H.common ?? "the plant"} together with an eye complaint, out of <span className="num">{fmt.int(H.papers_plant)}</span> papers on {H.common ?? "the plant"}. Two herbals agree across sixteen centuries; nobody has written on this page yet.</span></p>
        <p className="leaf-actions">
          <a className="btn btn--ink btn--small" href={href(`/lead/${H.rank}`)}>Open the lead dossier</a>
          <Ext className="leaf-query" href={`https://europepmc.org/search?query=${encodeURIComponent(H.query)}`}>Run the exact search</Ext>
        </p>
        {H.warn && <Caution tone="line">The herbals themselves warn about {H.common ?? "this plant"}. A research hypothesis, not medical advice.</Caution>}
      </div>
    ),
  },
];

function Hero({ onSearch }: { onSearch: () => void }) {
  const n = INLINE.counts;
  const fold = INLINE.persistence.fold;
  return (
    <section className="hero" aria-labelledby="page-title">
      <div className="wrap hero-grid">
        <div className="hero-text">
          <h1 id="page-title" tabIndex={-1} className="hero-title">Scrape a 1653 herbal and Dioscorides is underneath.</h1>
          <p className="hero-lede">
            Culpeper’s cure for dim sight, {H.common} juice with fennel and honey, is the recipe Dioscorides wrote in Greek sixteen centuries earlier. Palimpsest reads both herbals to the word, finds <b className="num">{fmt.int(INLINE.persistence.observed)}</b> claims that survived, <b className="num">{fmt.two(fold)}×</b> more than chance, and checks which ones modern science has studied. For this one: <b>none</b>.
          </p>
          <div className="hero-actions">
            <button type="button" className="searchbox" onClick={onSearch} aria-label="Search plants, Greek names and indications" aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}>
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="m12.7 12.7 4.3 4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              <span className="searchbox-ph">Search <span lang="grc" className="grc">πήγανον</span>, wormwood, jaundice…</span>
              <span className="searchbox-keys" aria-hidden="true"><Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd><Kbd>K</Kbd></span>
            </button>
            <a className="btn btn--ink" href={href("/findings")}>Read the findings</a>
          </div>
          <p className="hero-scope">
            <span className="num">{fmt.int(n.dsc_chapters)}</span> Greek chapters · <span className="num">{fmt.int(n.cul_monographs)}</span> English monographs · <span className="num">{fmt.int(n.taxa)}</span> plants · <span className="num">{fmt.int(n.claims)}</span> claims, each kept with its exact characters
          </p>
        </div>
        <Scrape
          layers={LAYERS}
          caption={<>One leaf, written three times: Culpeper’s <i>Garden-Rue</i> over Dioscorides’ <span lang="grc" className="grc">{H.names.dsc}</span> (identified as <i>{H.taxon}</i>, {H.names.dsc_conf} confidence), over the modern record. Dotted words are the shared ingredients; the red underline is the claim both herbals make. <a href={href(`/plant/${H.slug}`, { c: H.concept_id })}>Both texts in full</a></>}
        />
      </div>
      <HowToRead />
    </section>
  );
}

/* ------------------------------------------------------------------ how to read this */

function HowToRead() {
  return (
    <div className="wrap">
      <ol className="howto" aria-label="How to read the explorer">
        <li className="howto-step">
          <h2 className="howto-title"><span className="howto-n">i</span>Read the marks</h2>
          <p>Every complaint a herbal claims to treat is marked in place: <span className="span span--dsc howto-sample" lang="grc">ἀμβλυωπίαις</span> in Dioscorides’ Greek, <span className="span span--cul howto-sample">dimness</span> in Culpeper’s English. Hover a Greek word for its English gloss.</p>
        </li>
        <li className="howto-step">
          <h2 className="howto-title"><span className="howto-n">ii</span>Look for red</h2>
          <p>A <span className="span span--cul is-persistent howto-sample">red underline</span> means both herbals make the same claim for the same plant: it survived sixteen centuries of copying.</p>
        </li>
        <li className="howto-step">
          <h2 className="howto-title"><span className="howto-n">iii</span>Check 2026</h2>
          <p>Each claim carries a tier, <TierMeter tier="unstudied" /> <TierMeter tier="sparse" /> <TierMeter tier="studied" />, counting papers that name the plant with the complaint. Papers, not proof: a paper may report no effect.</p>
        </li>
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ survival flow (lazy) */

function FlowSection() {
  const [ref, seen] = useInView<HTMLElement>();
  return (
    <section className="flow-sec" aria-labelledby="flow-title" ref={ref}>
      <div className="wrap">
        <div className="sec-head sec-head--split">
          <h2 id="flow-title">What happened to every claim</h2>
          <p className="sec-lede">Follow each plant–indication claim for the species both men wrote about: did Culpeper keep it, drop it or add it, and has modern research looked? Choose a body system, then point at a ribbon to see its plants.</p>
        </div>
        {seen ? (
          <Suspense fallback={<Skeleton rows={8} label="Drawing the flow" />}><SurvivalFlow /></Suspense>
        ) : <div className="flow-placeholder" aria-hidden="true" />}
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

type Share = { k: number; n: number; share: number; ci: number[] | null };
function BenchBars({ rows }: { rows: readonly (readonly [string, Share])[] }) {
  const W = 300, x0 = 112, w = W - x0 - 40, row = 21;
  const x = (v: number) => x0 + v * w;
  return (
    <svg className="mini" viewBox={`0 0 ${W} ${rows.length * row + 14}`} role="img" aria-label={rows.map(([l, r]) => `${l}: ${fmt.pct(r.share)} (${r.k} of ${r.n}${r.ci ? `, 95% interval ${fmt.pct(r.ci[0])} to ${fmt.pct(r.ci[1])}` : ""})`).join("; ")}>
      {rows.map(([l, r], i) => {
        const y = i * row + 3;
        return (
          <g key={l}>
            <text x={0} y={y + 10} className="mini-label">{l}</text>
            <rect x={x0} y={y} width={w} height={11} className="mini-bar mini-bar--ref" />
            <rect x={x0} y={y} width={r.share * w} height={11} className="mini-bar" />
            {r.ci && <line x1={x(r.ci[0])} x2={x(r.ci[1])} y1={y + 15} y2={y + 15} className="mini-ci mini-ci--thin" />}
            <text x={x0 + w + 6} y={y + 10} className="mini-label mini-label--strong">{fmt.pct(r.share)}</text>
          </g>
        );
      })}
      <text x={x0} y={rows.length * row + 13} className="mini-tickl">0</text>
      <text x={x0 + w} y={rows.length * row + 13} textAnchor="end" className="mini-tickl">100%</text>
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
  // Build-time copy of stats.json (scripts/derive.mjs): the band paints complete, with no loading state.
  const P = INLINE.persistence;
  const [qLo, , qHi] = P.q;
  const or = INLINE.or, rr = INLINE.rr;
  const B = INLINE.bench;
  return (
    <section className="gilt" aria-labelledby="findings-title">
      <div className="wrap">
        <div className="gilt-head">
          <h2 id="findings-title">{B?.species ? "Four findings" : "Three findings"}</h2>
          <p className="gilt-sub">Every number below is computed from the shipped data and opens as a full figure with its model, interval and caveats.</p>
        </div>
        <ol className={`finds ${B ? "finds--4" : ""}`}>
          {B && B.species && (
            <li className="find">
              <h3 className="find-claim">The names are right. Experts pick the same plant in <span className="find-fig num">{fmt.pct(B.species.share)}</span> of chapters.</h3>
              <BenchBars rows={[
                ["Same species", B.species], ...(B.speciesRank ? [["Species-rank IDs", B.speciesRank] as const] : []), ...(B.genus ? [["Same genus", B.genus] as const] : []),
              ]} />
              <p className="find-body">Our identification against the expert top choice of Lardos et al. (2024) for {fmt.int(B.chapters ?? B.species.n)} Dioscorides chapters{B.speciesRank ? <>, {fmt.pct(B.speciesRank.share)} where we name a species</> : null}{B.genus ? <>, {fmt.pct(B.genus.share)} at genus</> : null}. {B.staples ? <>Staples check: {B.staples.ok} of {B.staples.n} everyday plants (barley, lentil, broad bean…) identified correctly.</> : null}</p>
              <a className="find-link" href={href("/methods", null, "benchmark")}>The expert benchmark</a>
            </li>
          )}
          <li className="find">
            <h3 className="find-claim">Knowledge persisted. Culpeper repeats Dioscorides <span className="find-fig num">{fmt.two(P.fold)}×</span> more often than chance.</h3>
            <NullStrip observed={P.observed} mean={P.nullMean} lo={qLo} hi={qHi} />
            <p className="find-body">{fmt.int(P.observed)} shared plant–indication claims across {fmt.int(P.nTaxa)} species, against about {fmt.int(P.nullMean)} if Culpeper’s claims were shuffled among the same plants. It holds when plants are only swapped with plants of similar entry length ({fmt.two(INLINE.size)}×) and within the same botanical family ({fmt.two(INLINE.family)}×).</p>
            <a className="find-link" href={href("/findings", null, "transmission")}>The transmission test</a>
          </li>
          <li className="find">
            <h3 className="find-claim">Science has looked. Claims both herbals make are studied at all more often: <span className="find-fig num">{fmt.pct(INLINE.shareBoth)}</span> against {fmt.pct(INLINE.matchedBoth)}.</h3>
            <ShareBars a={INLINE.shareBoth} b={INLINE.matchedBoth} />
            <p className="find-body">Share of plant–indication pairs with at least one co-mentioning paper, compared with unclaimed indications of exactly the same plants. Odds ratio {fmt.two(or.v)} [{fmt.two(or.ci[0])}–{fmt.two(or.ci[1])}] with indication fixed effects and plant research volume.</p>
            <a className="find-link" href={href("/findings", null, "controls")}>Matched controls and odds ratios</a>
          </li>
          <li className="find">
            <h3 className="find-claim">But not hard. Once studied, persistent claims draw <span className="find-fig num">{fmt.two(rr.v)}×</span> the papers: no more than any other.</h3>
            <RatioStrip v={rr.v} lo={rr.ci[0]} hi={rr.ci[1]} />
            <p className="find-body">Tradition predicts <em>whether</em> modern research looked, not <em>how hard</em>. That gap is where the leads come from: pairs both herbals agree on that have at most four papers.</p>
            <a className="find-link" href={href("/leads")}>The {INLINE.leads} ranked leads</a>
          </li>
        </ol>
        <p className="gilt-foot">
          {INLINE.tests?.n ? <>{INLINE.tests.n} tests written down with their predictions{INLINE.tests.counts ? <>: {Object.entries(INLINE.tests.counts as Record<string, number>).map(([k, v]) => `${v} ${k}`).join(", ")}</> : null}. <a href={href("/findings", null, "tests")}>The ledger</a>. </> : null}
          Co-mention counts measure research attention, not efficacy. <a href={href("/methods", null, "limits")}>Read the limitations</a>.
        </p>
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
    links: [["The ranked leads", "/leads"], ["Lead 1: rue for dim sight, the dossier", "/lead/1"], ["Knowledge graph and claims", "/data"]],
  },
  {
    who: "clinicians",
    title: "Clinicians and the public",
    text: "These are hypotheses drawn from historical texts, for laboratory follow-up. An evidence tier counts papers, not results; a paper can report harm or no effect.",
    links: [["What a tier means, and does not", "/methods#tiers"], ["Responsible use", "/methods#responsible"], ["Leads without historical warnings", "/leads?safety=0"]],
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
  useEffect(() => {
    // Warm the survival flow (chunk and data) soon after first paint, and the plant page a little later.
    const a = window.setTimeout(() => { void import("../charts/SurvivalFlow"); void load("derived/flow.json").catch(() => {}); }, 1200);
    const b = window.setTimeout(() => { void import("./PlantPage"); }, 3500);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, []);
  return (
    <div className="landing">
      <Hero onSearch={onSearch} />
      <Findings />
      <FlowSection />
      <Ways />
      <Chain />
      <Codex />
      <Close />
    </div>
  );
}
