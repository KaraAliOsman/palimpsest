import type { ReactNode } from "react";
import { assetUrl, namingAgreement, useResource, type Summary } from "../lib/data";
import { href } from "../lib/router";
import { fmt } from "../lib/format";
import { SITE } from "../lib/export";
import { Caution, Ext } from "../components/ui";
import { ExpertBenchmark, TestsLedger } from "../components/Extras";

function Part({ id, title, plain, children }: { id: string; title: string; plain: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="part" aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`} className="part-title">{title}</h2>
      <div className="part-grid">
        <div className="part-plain"><h3 className="part-label">In short</h3><p>{plain}</p></div>
        <div className="part-tech"><h3 className="part-label">In detail</h3>{children}</div>
      </div>
    </section>
  );
}

const PARTS: [string, string][] = [
  ["sources", "Sources"], ["names", "Names across eras"], ["benchmark", "Checked against experts"], ["extraction", "Reading the claims"], ["transmission", "Transmission"],
  ["evidence", "Modern evidence"], ["tiers", "Evidence tiers"], ["leads", "Leads"], ["tests", "Tests we wrote down"], ["limits", "Limitations"], ["responsible", "Responsible use"],
];

export function Methods() {
  const summary = useResource<Summary>("summary.json");
  // sections fed by data/extra/ appear in the contents only when their file exists
  const hasBench = useResource<unknown>("extra/expert_benchmark.json").status === "ready";
  const hasTests = useResource<unknown>("extra/tests_ledger.json").status === "ready";
  const parts = PARTS.filter(([id]) => (id !== "benchmark" || hasBench) && (id !== "tests" || hasTests));
  const ev = summary.data?.extraction_eval ?? {};
  const d = ev.dioscorides, c = ev.culpeper;
  const gr = namingAgreement(summary.data?.naming_eval, "greek");
  const en = namingAgreement(summary.data?.naming_eval, "english");
  const gbif = (summary.data?.naming_eval as Record<string, unknown> | undefined)?.["gbif_resolution_rate"] as number | undefined;
  const pr = (x?: { precision?: number | null; recall?: number | null; f1?: number | null; n_monographs?: number | null }) => x ? <>P {fmt.two(x.precision)}, R {fmt.two(x.recall)}, <b>F1 {fmt.two(x.f1)}</b> on {fmt.int(x.n_monographs)} monographs</> : "n/a";

  return (
    <div className="wrap page methods">
      <header className="page-head">
        <h1 id="page-title" tabIndex={-1}>Methods and responsible use</h1>
        <p className="page-lede">How a clause in a first-century Greek herbal becomes a ranked research hypothesis, in plain language and in full, and where the chain can break.</p>
      </header>
      <div className="methods-grid">
        <nav className="side-toc" aria-label="Sections">
          <ol>{parts.map(([id, t]) => <li key={id}><a href={href("/methods", null, id)}>{t}</a></li>)}</ol>
        </nav>
        <div className="methods-body">
          <Part id="sources" title="Sources" plain="Two published herbals in their original languages, and open modern databases. Nothing was collected from living people or communities.">
            <p>Dioscorides, <i>De materia medica</i>, in M. Wellmann’s critical edition (1906–1914) as digitised by Open Greek and Latin / First1KGreek (<code>tlg0656.tlg001.1st1K-grc1</code>, CC BY-SA 4.0). The apparatus criticus is removed so that only Dioscorides’ words are analysed. The published TEI nests the later chapters of books 1, 2 and 4 inside chapters 1.66, 2.105 and 4.134; the parser walks chapters recursively and recovers all 822, where a naive parser finds 623.</p>
            <p>Culpeper, <i>The Complete Herbal</i>, Project Gutenberg 49513 (the 1850 London edition of the 1653 work, which adds about a hundred later herbs). Only the <i>Government and virtues</i> sections are mined; astrological statements are not extracted.</p>
            <p>Modern layers: Europe PMC (titles and abstracts), ClinicalTrials.gov v2, the GBIF backbone, Wikidata (LOTUS occurrences, IUCN status) and NLM MeSH. Every response is cached.</p>
          </Part>

          <Part id="names" title="Names across eras" plain="Each Greek chapter and English monograph was assigned a modern plant, with a confidence level and a reason, then joined on the currently accepted scientific name.">
            <p>Identifications were curated with AI assistance (Claude, Anthropic) from the lemma, its synonyms, the author’s own description and standard scholarly identifications (Wellmann, Berendes, Gunther/Goodyer, Beck; annotated Culpeper editions). Each row records kind, rank, confidence (high, medium, low), alternatives and a one-line justification (<code>data/curated/</code>), and is resolved on the GBIF backbone to the accepted taxon, following synonyms.</p>
            <p>Checks: GBIF resolution {gbif != null ? <b>{fmt.pct(gbif)}</b> : "n/a"}; agreement with independent Wikidata Greek labels {fmt.pct(gr.rate)}{gr.n ? ` (n = ${gr.n})` : ""}; with GBIF English vernacular names {fmt.pct(en.rate)}{en.n ? ` (n = ${en.n})` : ""}. These are indicative: label coverage is patchy. The stronger check is against expert botanists, below. Every test is repeated at genus level and with high-confidence identifications only.</p>
          </Part>

          <section id="benchmark" className="part" aria-labelledby="benchmark-t">
            <ExpertBenchmark heading={(t) => <h2 id="benchmark-t" className="part-title">{t}</h2>} />
          </section>

          <Part id="extraction" title="Reading the claims" plain="Hand-built word lists in Ancient Greek and in seventeenth-century English find each mention of a complaint, and keep the exact characters it came from.">
            <figure className="inline-fig">
              <img src={assetUrl("img/codex/bibelmajuskel-und-transkription-wiener-dioskurides-1400.webp")} srcSet={`${assetUrl("img/codex/bibelmajuskel-und-transkription-wiener-dioskurides-720.webp")} 720w, ${assetUrl("img/codex/bibelmajuskel-und-transkription-wiener-dioskurides-1400.webp")} 1400w`} sizes="(max-width: 900px) 92vw, 52vw" width={1400} height={550} alt="A passage in Greek majuscule from the Vienna Dioscurides, with a later scribe’s minuscule transcription in red ink beneath." loading="lazy" decoding="async" />
              <figcaption className="seam">A later scribe re-wrote the codex’s majuscule in minuscule, in red, under the line. Palimpsest does the same to the Greek, with a length-preserving normalisation, so every hit maps back to its exact characters. Vienna Dioscurides; public domain.</figcaption>
            </figure>
            <p>Ancient Greek patterns run on an accent-free, lower-case, final-sigma-folded copy of the text; stems absorb inflection (<span lang="grc" className="grc">ἰκτερικούς</span> and <span lang="grc" className="grc">ἰκτέρῳ</span> both match <code>ικτερ</code>) and short-gap patterns encode idioms (<span lang="grc" className="grc">ἔμμηνα ἄγει</span> is read as emmenagogue). Early Modern English uses a historical-disease crosswalk: agues, dropsy, king’s evil, strangury, the whites. 85 concepts link both to MeSH. Overlaps resolve longest-match first; English negation and warning cues mark a hit as negated or adverse, and only therapeutic and action claims enter the analyses.</p>
            <p>Evaluation against a blind reference (random monographs, seed 2026, annotated without seeing the lexicons): Greek {pr(d ?? undefined)}; English {pr(c ?? undefined)}, at the (monograph, concept) level with bootstrap intervals.</p>
          </Part>

          <Part id="transmission" title="Transmission" plain="If Culpeper’s claims were assigned to the wrong plants at random, how often would he agree with Dioscorides? Far less often than he does.">
            <p>For species identified in both sources, the statistic is the number of (plant, indication) pairs claimed by both. The null re-assigns Culpeper’s per-plant claim sets among the shared species (10,000 label permutations), preserving each author’s claims per plant and each indication’s frequency. Stricter nulls permute only within the same quintile of entry length, and only within the same botanical family. See <a href={href("/findings", null, "transmission")}>figures 1 and 2</a>.</p>
          </Part>

          <Part id="evidence" title="Modern evidence" plain="For each plant, we compare the complaints the herbals claim with complaints they do not claim for the same plant, and ask which have been studied.">
            <p>For every species with a claim, Europe PMC is queried for papers naming the binomial, the indication, and both. Controls are 12 indications per plant claimed by neither herbal, sampled at random. Expected co-mentions E = n<sub>plant</sub> · n<sub>indication</sub> / N; lift = (n<sub>pair</sub> + 0.5) / (E + 0.5).</p>
            <p>Primary: logistic regression of <i>any co-mentioning paper</i> on claim group with indication fixed effects and log plant research volume, cluster-robust by plant; Poisson GLM of counts with offset log E; secondary conditional logit (strata = plant). Matched comparisons use unclaimed indications of exactly the same plants. See <a href={href("/findings", null, "controls")}>figures 3 to 5</a>.</p>
          </Part>

          <Part id="tiers" title="Evidence tiers" plain="A tier counts papers that mention a plant and a complaint together. It does not say whether those papers found the plant works.">
            <dl className="tier-def">
              <div><dt>Unstudied</dt><dd>0 co-mentioning papers</dd></div>
              <div><dt>Sparse</dt><dd>1 to 4 papers</dd></div>
              <div><dt>Studied</dt><dd>5 or more papers</dd></div>
            </dl>
            <p>A co-mentioning paper may report benefit, no effect, or toxicity. The published numbers search the accepted GBIF binomial only, so literature under synonyms is missed (rosemary: <i>Salvia rosmarinus</i> finds 211 papers, <i>Rosmarinus officinalis</i> 1,994). The loss affects a plant’s claimed and control indications alike, but inflates “unstudied” for renamed plants. A synonym-expanded re-run (accepted name, curated names and all GBIF synonyms; 10 names per plant at the median) was done, and the conclusions hold: OR 2.48 [1.84–3.36] for claims in both herbals, RR once studied 1.03, not significant.</p>
          </Part>

          <Part id="leads" title="Leads" plain="Leads are pairs both herbals agree on, with few modern papers, a plant with known chemistry, and a chapter about the plant itself in both books.">
            <p>Persistent pairs with ≤ 4 papers are scored 0.35 · persistence + 0.25 · chemistry + 0.40 · gap, where persistence = min(1, mentions / 6), chemistry = log(1 + constituents) / log 501, and gap mixes 1/(1 + papers) with a surprise term under a Poisson whose mean is the plant’s biomedical co-mentions shared out by indication volume. The list is diversified (≤ 2 per plant, ≤ 4 per indication). Weights are a transparent heuristic. Safety warnings and IUCN status are flags, never part of the score. Identification doubt can be propagated into the score on the leads page (high 1.0, medium 0.6, low 0.3), with the change in ranking reported as Kendall’s τ. <a href={href("/leads")}>The leads</a>.</p>
          </Part>

          <section id="tests" className="part" aria-labelledby="tests-t">
            <TestsLedger heading={(t) => <h2 id="tests-t" className="part-title">{t}</h2>} />
          </section>

          <Part id="limits" title="Limitations" plain="Read these before citing a number. The method is a screen for hypotheses, not a test of whether a remedy works.">
            <ul className="limits">
              <li><b>Circularity.</b> Modern research is partly motivated by tradition, so co-mention measures attention plus evidence.</li>
              <li><b>Co-occurrence is not a positive result.</b> Tiers count papers, not findings.</li>
              <li><b>Retrospective identification</b> of ancient plants is uncertain; hence confidence levels and genus-level sensitivity.</li>
              <li><b>Lexicon recall is bounded.</b> Misses lower power but do not bias within-plant comparisons unless they correlate with modern evidence.</li>
              <li><b>Culpeper is not independent of Dioscorides</b> (via Galen, Mattioli, Gerard): persistence measures a textual tradition, not rediscovery.</li>
              <li><b>Synonyms.</b> The published numbers search the accepted binomial only. We re-ran the whole evidence analysis with every curated name and GBIF synonym, and the conclusions hold: claims in both herbals still have higher odds of being studied (OR 2.48 [1.84–3.36]) and are still not studied harder once studied (RR 1.03, not significant).</li>
              <li><b>AI-assisted reference annotation.</b> A human double-annotated subset with kappa is the next validation step.</li>
            </ul>
          </Part>

          <Part id="responsible" title="Responsible use" plain="Nothing here is medical advice. Many of these plants are poisonous, and the explorer says so wherever it shows a lead.">
            <Caution tone="full" />
            <p><b>Traditional knowledge.</b> Palimpsest uses only published, public-domain or openly licensed European texts. No knowledge was collected from living communities, and no Indigenous knowledge is redistributed. Leads keep their historical provenance.</p>
            <p><b>AI use, disclosed.</b> Plant identifications and the blind reference annotations were produced with AI assistance and carry confidence levels and justifications open to expert correction. Extraction itself is rule-based and fully reproducible. Corrections are welcome as <Ext href={`${SITE.repo}/issues`}>issues on GitHub</Ext>.</p>
          </Part>
        </div>
      </div>
    </div>
  );
}
