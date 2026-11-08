import { useMemo, useState, type FormEvent } from "react";
import { asArray, cleanQuote, conceptLabel, conceptMap, dscRef, indexPlants, namingAgreement, useResource, type Concept, type Lead, type Plant, type PlantIndex, type Summary } from "../lib/data";
import { go, href } from "../lib/router";
import { fmt } from "../lib/format";
import { Meter, Skeleton } from "../components/ui";

const YEARS = { dsc: 60, cul: 1653, now: 2026 };
/** The leaf shows an opening, not a chapter: cut long quotations at a word. */
function clip(q: string, max = 170): string {
  if (q.length <= max) return q;
  const cut = q.lastIndexOf(" ", max);
  return `${q.slice(0, cut > max * 0.6 ? cut : max).replace(/[,;·.\s]+$/, "")} …`;
}

const CONF: Record<string, string> = { high: "high confidence", medium: "medium confidence", low: "low confidence" };

function Leaf({ lead, status, cmap, entry }: { lead: Lead | null; status: string; cmap: Map<string, Concept>; entry: PlantIndex | undefined }) {
  if (!lead) {
    return (
      <figure className="leaf fibre" aria-busy={status === "loading"}>
        {status === "loading" ? <Skeleton rows={9} label="Reading the first lead" /> : <p className="leaf-empty">The ranked leads arrive with the pipeline export.</p>}
      </figure>
    );
  }
  const label = lead.label || conceptLabel(cmap, lead.concept_id);
  const grc = entry?.dscName?.name;
  const common = entry?.plant.common_name;
  return (
    <figure className="leaf fibre" aria-labelledby="leaf-cap">
      <div className="leaf-head">
        {grc ? <span className="leaf-headword" lang="grc">{grc}</span> : <span className="leaf-headword">{common ?? lead.taxon}</span>}
        <span className="leaf-taxon"><i>{lead.taxon}</i></span>
      </div>
      <ol className="leaf-layers">
        <li className="layer">
          <p className="layer-siglum"><span className="swatch swatch--dsc" aria-hidden="true" /><span className="layer-date">c. 60 CE</span><span className="layer-who">Dioscorides</span></p>
          {lead.dsc_quote ? <blockquote className="layer-text layer-text--grc" lang="grc">{clip(cleanQuote(lead.dsc_quote))}</blockquote> : <p className="layer-text muted">No Greek quotation exported for this lead.</p>}
        </li>
        <li className="layer">
          <p className="layer-siglum"><span className="swatch swatch--cul" aria-hidden="true" /><span className="layer-date">1653</span><span className="layer-who">Culpeper</span></p>
          {lead.cul_quote ? <blockquote className="layer-text layer-text--en">{clip(cleanQuote(lead.cul_quote), 150)}</blockquote> : <p className="layer-text muted">No English quotation exported for this lead.</p>}
        </li>
        <li className="layer">
          <p className="layer-siglum"><span className="swatch swatch--mod" aria-hidden="true" /><span className="layer-date">2026</span><span className="layer-who">Evidence</span></p>
          <dl className="layer-gloss">
            <div><dt>Papers on {label.toLowerCase()}</dt><dd className="num">{fmt.int(lead.epmc_pair)}</dd></div>
            <div><dt>Known compounds</dt><dd className="num">{fmt.int(lead.n_compounds)}</dd></div>
            <div><dt>IUCN</dt><dd>{lead.iucn ?? "Not assessed"}</dd></div>
          </dl>
        </li>
      </ol>
      <figcaption id="leaf-cap">
        <span>Lead {lead.rank ?? 1}: {common ? common.toLowerCase() : <i>{lead.taxon}</i>} for {label.toLowerCase()}.</span>{" "}
        {entry && <a href={href(`/plant/${entry.slug}`, { c: lead.concept_id })}>Open the plant</a>}
      </figcaption>
    </figure>
  );
}

function StageRuler({ summary }: { summary: Summary }) {
  const pos = (y: number) => `${(y / YEARS.now) * 100}%`;
  const c = summary.counts ?? {};
  const tally: [number | null | undefined, string][] = [
    [c.dsc_chapters, "Greek chapters"], [c.cul_monographs, "English monographs"], [c.taxa, "accepted taxa"],
    [c.taxa_shared, "species in both herbals"], [c.claims, "extracted claims"],
    c.pairs_queried != null ? [c.pairs_queried, "pairs searched in Europe PMC"] : [c.papers_queried, "papers queried"],
  ];
  return (
    <section className="stage-section" aria-labelledby="s1">
      <div className="container">
        <div className="stage-headblock">
          <h2 id="s1">I. Two herbals on one ruler</h2>
          <p className="section-lede">A Greek pharmacology of about 60 CE and an English herbal of 1653, read chapter by chapter.</p>
        </div>
        <div className="ruler" role="img" aria-label="Timeline from year 1 to 2026: Dioscorides about 60 CE, Culpeper 1653, the evidence in 2026. 1,593 years separate the herbals; 373 separate Culpeper from today.">
          <div className="ruler-line" />
          {[500, 1000, 1500].map((y) => <span key={y} className="ruler-tick" style={{ left: pos(y) }}><span>{y}</span></span>)}
          <span className="ruler-mark ruler-mark--dsc" style={{ left: pos(YEARS.dsc) }}><span>c. 60 CE</span></span>
          <span className="ruler-mark ruler-mark--cul" style={{ left: pos(YEARS.cul) }}><span>1653</span></span>
          <span className="ruler-mark ruler-mark--mod" style={{ left: pos(YEARS.now) }}><span>2026</span></span>
          <span className="ruler-gap" style={{ left: pos(YEARS.dsc), width: pos(YEARS.cul - YEARS.dsc) }}><span>{fmt.int(YEARS.cul - YEARS.dsc)} years</span></span>
          <span className="ruler-gap ruler-gap--short" style={{ left: pos(YEARS.cul), width: pos(YEARS.now - YEARS.cul) }}><span>{YEARS.now - YEARS.cul}</span></span>
        </div>
        <ol className="layers-key">
          <li>
            <p className="layers-key-title"><span className="swatch swatch--dsc" aria-hidden="true" />Dioscorides, <i>De materia medica</i></p>
            <p>Greek, about 60 CE, from the First1KGreek edition. Searched with lexicons that ignore accents and breathings.</p>
          </li>
          <li>
            <p className="layers-key-title"><span className="swatch swatch--cul" aria-hidden="true" />Culpeper, <i>The Complete Herbal</i></p>
            <p>English, 1653, from Project Gutenberg. Only the Government and virtues sections are mined.</p>
          </li>
          <li>
            <p className="layers-key-title"><span className="swatch swatch--mod" aria-hidden="true" />The evidence, 2026</p>
            <p>Europe PMC, ClinicalTrials.gov, LOTUS compounds through Wikidata, IUCN status and GBIF records.</p>
          </li>
        </ol>
        <dl className="tally">
          {tally.map(([v, l]) => <div key={l}><dt>{l}</dt><dd>{fmt.int(v)}</dd></div>)}
        </dl>
      </div>
    </section>
  );
}

function StageNames({ summary, example }: { summary: Summary; example: PlantIndex | undefined }) {
  const gr = namingAgreement(summary.naming_eval, "greek");
  const en = namingAgreement(summary.naming_eval, "english");
  const r = dscRef(example?.dscName?.monograph_id);
  return (
    <section className="stage-section stage-section--well fibre" aria-labelledby="s2">
      <div className="container">
        <div className="stage-headblock">
          <h2 id="s2">II. Names chained across sixteen centuries</h2>
          <p className="section-lede">Every Greek or English name resolves to one accepted binomial, with a stated confidence.</p>
        </div>
        {example ? (
          <ol className="bigchain" aria-label={`Name chain for ${example.plant.taxon}`}>
            <li>
              <span className="bigchain-era"><span className="swatch swatch--dsc" aria-hidden="true" />Dioscorides{r ? `, ${r.book}.${r.chapter}` : ""}</span>
              <span className="bigchain-name" lang="grc">{example.dscName?.name}</span>
              <span className="bigchain-meta">{CONF[example.dscName?.confidence ?? ""] ?? ""}</span>
            </li>
            <li>
              <span className="bigchain-era"><span className="swatch swatch--cul" aria-hidden="true" />Culpeper</span>
              <span className="bigchain-name">{example.culName?.name}</span>
              <span className="bigchain-meta">{CONF[example.culName?.confidence ?? ""] ?? ""}</span>
            </li>
            <li>
              <span className="bigchain-era"><span className="swatch swatch--mod" aria-hidden="true" />Accepted name</span>
              <span className="bigchain-name"><i>{example.plant.taxon}</i></span>
              <span className="bigchain-meta"><a href={href(`/plant/${example.slug}`)}>Open {example.plant.common_name?.toLowerCase() ?? "the plant"}</a></span>
            </li>
          </ol>
        ) : <Skeleton rows={3} label="Reading plants.json" />}
        <dl className="agreement">
          <div><dt>Greek identifications that agree with Wikidata{gr.n ? `, of ${fmt.int(gr.n)} checked` : ""}</dt><dd>{fmt.pct(gr.rate)}</dd></div>
          <div><dt>English identifications that agree with GBIF vernaculars{en.n ? `, of ${fmt.int(en.n)} checked` : ""}</dt><dd>{fmt.pct(en.rate)}</dd></div>
        </dl>
      </div>
    </section>
  );
}

function StageReading({ summary }: { summary: Summary }) {
  const ev = summary.extraction_eval ?? {};
  const rows = [
    { key: "dioscorides", name: "Dioscorides", lang: "Greek" },
    { key: "culpeper", name: "Culpeper", lang: "English" },
  ].map((x) => ({ ...x, s: ev[x.key] ?? null }));
  const nOf = (x: { s: { n?: number | null; n_monographs?: number | null } | null }) => x.s?.n_monographs ?? x.s?.n ?? null;
  const n = rows.map(nOf).find((v) => typeof v === "number");
  return (
    <section className="stage-section" aria-labelledby="s3">
      <div className="container">
        <div className="stage-headblock">
          <h2 id="s3">III. Indications mapped to MeSH</h2>
          <p className="section-lede">Lexicons find each indication; blind hand annotation{n ? ` of ${n} monographs per herbal` : ""} checks them.</p>
        </div>
        <table className="ledger ledger--scores">
          <caption className="visually-hidden">Indication extraction scores per herbal</caption>
          <thead>
            <tr><th scope="col">Herbal</th><th scope="col" className="num">Precision</th><th scope="col" className="num">Recall</th><th scope="col" className="num">F1</th></tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.key}>
                <th scope="row"><span className="ledger-name">{x.name}</span><span className="cell-sub">{x.lang}{nOf(x) ? `, ${nOf(x)} monographs` : ""}</span></th>
                {(["precision", "recall", "f1"] as const).map((k) => (
                  <td key={k} className="num"><span className="score">{fmt.two(x.s?.[k])}</span><Meter value={x.s?.[k]} label={`${k} ${fmt.two(x.s?.[k])}`} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StageFindings({ summary }: { summary: Summary }) {
  const items = asArray<NonNullable<Summary["headline"]>[number]>(summary.headline).filter((h) => h && (h.value !== undefined || h.label)).slice(0, 4);
  return (
    <section className="stage-section stage-section--ruled" aria-labelledby="s4">
      <div className="container">
        <div className="stage-headblock">
          <h2 id="s4">IV. Agreement tested against chance</h2>
          <p className="section-lede">Culpeper against Dioscorides plant by plant, then both against today’s papers. <a href={href("/evidence")}>See the charts</a></p>
        </div>
        {items.length ? (
          <ol className="findings">
            {items.map((h, i) => (
              <li key={i}>
                <span className="finding-value">{h.value ?? ""}</span>
                <span className="finding-label">{h.label}</span>
                {h.detail ? <span className="finding-detail">{h.detail}</span> : <span />}
              </li>
            ))}
          </ol>
        ) : <p className="muted">The headline findings arrive with the pipeline export.</p>}
      </div>
    </section>
  );
}

function StageLeads({ leads, cmap, bySlug }: { leads: Lead[]; cmap: Map<string, Concept>; bySlug: Map<string, PlantIndex> }) {
  const [q, setQ] = useState("");
  const submit = (e: FormEvent) => { e.preventDefault(); go(href("/plants", { q: q.trim() })); };
  return (
    <section className="stage-section stage-section--close" aria-labelledby="s5">
      <div className="container">
        <div className="stage-headblock">
          <h2 id="s5">V. What survives is a list of leads</h2>
          <p className="section-lede">Pairs both herbals name and modern literature has barely touched, ranked for testing.</p>
        </div>
        {leads.length > 0 && (
          <ol className="toplist">
            {leads.slice(0, 3).map((l) => {
              const e = bySlug.get(l.taxon);
              return (
                <li key={`${l.taxon}|${l.concept_id}`}>
                  <span className="toplist-rank num">{l.rank ?? ""}</span>
                  <span className="toplist-name">{e ? <a href={href(`/plant/${e.slug}`, { c: l.concept_id })}><i>{l.taxon}</i></a> : <i>{l.taxon}</i>}</span>
                  <span className="toplist-concept">{l.label || conceptLabel(cmap, l.concept_id)}</span>
                  <span className="toplist-papers"><span className="num">{fmt.int(l.epmc_pair)}</span> papers</span>
                </li>
              );
            })}
          </ol>
        )}
        <div className="close-actions">
          <form className="lookup" role="search" onSubmit={submit}>
            <label htmlFor="lookup-q" className="lookup-label">Look a plant up in Greek, English or Latin</label>
            <div className="lookup-row">
              <input id="lookup-q" name="q" type="search" autoComplete="off" spellCheck={false} value={q} onChange={(e) => setQ(e.target.value)} placeholder="ἀψίνθιον, wormwood, Artemisia" />
              <button type="submit" className="btn btn--primary">Search the plants</button>
            </div>
          </form>
          <div className="actions">
            <a className="btn btn--quiet" href={href("/leads")}>Read all the leads</a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Overview() {
  const summary = useResource<Summary>("summary.json");
  const leads = useResource<Lead[]>("leads.json");
  const concepts = useResource<Concept[]>("concepts.json");
  const plants = useResource<Plant[]>("plants.json");
  const s = summary.data ?? {};
  const cs = asArray<Concept>(concepts.data);
  const cmap = conceptMap(cs);
  const sorted = useMemo(() => asArray<Lead>(leads.data).filter((l) => l && l.taxon).slice().sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9)), [leads.data]);
  const idx = useMemo(() => (plants.status === "ready" && concepts.status !== "loading" ? indexPlants(asArray<Plant>(plants.data), cs) : null), [plants.status, plants.data, concepts.status, cs]);
  const byTaxon = useMemo(() => new Map((idx?.list ?? []).map((p) => [p.plant.taxon, p])), [idx]);
  const example = useMemo(() => {
    const list = idx?.list ?? [];
    return list.find((p) => p.plant.taxon === "Artemisia absinthium" && p.dscName && p.culName)
      ?? list.find((p) => p.dscName?.confidence === "high" && p.culName?.confidence === "high")
      ?? list.find((p) => p.dscName && p.culName);
  }, [idx]);
  const top = sorted[0] ?? null;

  return (
    <>
      <section className="hero container" aria-labelledby="page-title">
        <div className="hero-text">
          <h1 id="page-title" className="hero-head" tabIndex={-1}>
            <span className="hero-pre">Two thousand years, one question.</span>
            <span className="hero-main">Did the old herbals know something?</span>
          </h1>
          <p className="lead">Dioscorides’ Greek and Culpeper’s English, read together and tested against modern evidence.</p>
          <div className="actions">
            <a className="btn btn--primary" href={href("/plants")}>Explore the plants</a>
            <a className="btn btn--quiet" href={href("/leads")}>Read the leads</a>
          </div>
        </div>
        <Leaf lead={top} status={leads.status} cmap={cmap} entry={top ? byTaxon.get(top.taxon) : undefined} />
      </section>
      <StageRuler summary={s} />
      <StageNames summary={s} example={example} />
      <StageReading summary={s} />
      <StageFindings summary={s} />
      <StageLeads leads={sorted} cmap={cmap} bySlug={byTaxon} />
    </>
  );
}
