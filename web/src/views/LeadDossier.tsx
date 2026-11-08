// One lead as a document a laboratory could forward: both quotations, the identification and its confidence,
// the exact literature query, constituents, safety and conservation, and a citation. Prints to A4/Letter.
import { useEffect } from "react";
import {
  asArray, cleanQuote, conceptMap, slugify, dscRef, links, recordFile, splitGloss, tierOf, TIER_LABEL, TIER_NOTE, useResource, wordAt,
  type Concept, type Lead, type PlantName, type PlantRecord,
} from "../lib/data";
import { href } from "../lib/router";
import { fmt } from "../lib/format";
import { download, SITE, today } from "../lib/export";
import { BASIS_NOTE, smallest, srcSet, useImages } from "../lib/images";
import { CONF_WEIGHT, certaintyOf, epmcSearchUrl, useLeadCertainty } from "../lib/leads";
import { Caution, CopyButton, Empty, ErrorState, Ext, Iucn, Skeleton, TierMeter } from "../components/ui";
import { Mechanism } from "../components/Extras";

const CONF: Record<string, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };

export function LeadDossier({ rank }: { rank: number }) {
  const leads = useResource<Lead[]>("leads.json");
  const concepts = useResource<Concept[]>("concepts.json");
  const cert = useLeadCertainty();
  const imgs = useImages();
  const all = asArray<Lead>(leads.data);
  const lead = all.find((l) => l.rank === rank);
  const meta = cert.meta.get(rank);
  const slug = meta?.slug ?? (lead ? slugify(lead.taxon) : null);
  const rec = useResource<PlantRecord>(slug ? recordFile(slug) : null);

  useEffect(() => {
    if (lead) document.title = `Lead ${lead.rank}: ${lead.taxon}, ${lead.label ?? lead.concept_id} · Palimpsest`;
  }, [lead]);

  if (leads.status === "loading" || (!meta && cert.ready === false)) return <div className="wrap page"><Skeleton rows={12} label="Opening the dossier" /></div>;
  if (leads.status === "error") return <div className="wrap page"><ErrorState what="The leads" error={leads.error} retry={leads.retry} /></div>;
  if (!lead) {
    return (
      <div className="wrap page">
        <h1 id="page-title" tabIndex={-1} className="page-title-s">No lead {Number.isFinite(rank) ? rank : ""}</h1>
        <Empty title={`The list has ${all.length} leads.`} action={<a className="btn btn--line" href={href("/leads")}>All leads</a>}>Lead numbers run from 1 to {all.length}.</Empty>
      </div>
    );
  }

  const cmap = conceptMap(asArray<Concept>(concepts.data));
  const c = cmap.get(lead.concept_id);
  const label = lead.label ?? c?.label ?? lead.concept_id;
  const p = rec.data?.plant;
  const names = asArray<PlantName>(p?.names);
  const dN = names.find((n) => n.monograph_id === lead.dsc_ref);
  const cN = names.find((n) => n.monograph_id === lead.cul_ref);
  const claim = asArray<{ concept_id: string; dsc?: number | null; cul?: number | null; epmc_pair?: number | null; evidence_tier?: string | null; lift?: number | null }>(p?.claims).find((x) => x.concept_id === lead.concept_id);
  const tier = claim ? tierOf(claim) : (lead.epmc_pair === 0 ? "unstudied" : (lead.epmc_pair ?? 0) < 5 ? "sparse" : "studied");
  const dr = dscRef(lead.dsc_ref);
  const im = imgs.byTaxon.get(lead.taxon)?.[0];
  const w = certaintyOf(meta);
  const idx = all.findIndex((l) => l.rank === rank);
  const prev = all[idx - 1], next = all[idx + 1];
  const compounds = asArray<{ name?: string; qid?: string | null }>(p?.top_compounds).filter((x) => x?.name);

  // literal glosses of the Greek words behind this claim, from the lexicon entry that matched each one
  const dT = lead.dsc_ref ? rec.data?.texts[lead.dsc_ref] : undefined;
  const glosses = asArray<{ start: number; end: number; concept_id: string; polarity?: string | null }>(dT?.spans)
    .filter((s) => s.concept_id === lead.concept_id && s.polarity !== "adverse")
    .map((s) => ({ word: dT?.text ? wordAt(dT.text, s.start, s.end) : "", g: splitGloss(rec.data?.gloss?.[lead.dsc_ref ?? ""]?.[String(s.start)]), at: s.start }))
    .filter((x) => x.word);

  const url = `${SITE.url}#/lead/${lead.rank}`;
  const key = `palimpsest2026lead${lead.rank}`;
  const title = `${lead.taxon} for ${label.toLowerCase()}: a persistent, under-studied indication in Dioscorides and Culpeper (lead ${lead.rank})`;
  const bib = `@misc{${key},
  author       = {{Team Palimpsest}},
  title        = {${title}},
  year         = {${SITE.year}},
  howpublished = {Palimpsest explorer, EthnoHack 2026},
  url          = {${url}},
  note         = {Dioscorides ${dr ? `${dr.book}.${dr.chapter}` : ""} (ed. Wellmann, First1KGreek, CC BY-SA 4.0); Culpeper, Complete Herbal (Gutenberg 49513). Accessed ${today()}}
}`;
  const csl = JSON.stringify([{
    id: key, type: "dataset", title, author: [{ literal: "Team Palimpsest" }], issued: { "date-parts": [[SITE.year]] },
    publisher: "Palimpsest explorer, EthnoHack 2026", URL: url, accessed: { "date-parts": [today().split("-").map(Number)] },
    note: `Rank ${lead.rank} of ${all.length}; ${fmt.int(lead.epmc_pair)} co-mentioning papers (Europe PMC).`,
  }], null, 2);
  const plain = `Team Palimpsest (${SITE.year}). ${title}. Palimpsest explorer, EthnoHack 2026. ${url} (accessed ${today()}).`;

  const exportJSON = () => download(`palimpsest-lead-${lead.rank}.json`, JSON.stringify({
    source: url, exported: today(), licence: "Greek quotation CC BY-SA 4.0 (First1KGreek, ed. Wellmann); Culpeper public domain",
    lead, identification: meta, certainty_weight: w, europepmc_query: meta?.query ?? null, evidence_tier: tier,
  }, null, 2), "application/json");

  return (
    <article className="wrap dossier" aria-labelledby="page-title">
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href={href("/leads")}>Leads</a><span aria-hidden="true" className="crumbs-sep">/</span><span aria-current="page">Lead {lead.rank}</span>
      </nav>
      <header className="dossier-head">
        <p className="dossier-rank num"><small>Lead</small>{lead.rank}</p>
        <div>
          <h1 id="page-title" tabIndex={-1} className="dossier-title"><i>{lead.taxon}</i></h1>
          <p className="dossier-sub">{label}{p?.common_name ? <> · {p.common_name}</> : null}{p?.family ? <> · {p.family}</> : null}</p>
        </div>
        <div className="dossier-actions">
          <button type="button" className="btn btn--ink" onClick={() => window.print()}>Print or save as PDF</button>
          <button type="button" className="btn btn--line" onClick={exportJSON}>Download JSON</button>
        </div>
      </header>

      <div className="dossier-grid">
        <div>
          <section className="dossier-sec" aria-labelledby="dq">
            <h2 id="dq">What the two herbals say</h2>
            <div className="dossier-quotes">
              <figure className="dossier-quote dossier-quote--dsc">
                <h3><span className="mark-swatch mark-swatch--dsc" aria-hidden="true" />Dioscorides, c. 60 CE{dr ? `, ${dr.book}.${dr.chapter}` : ""}</h3>
                <blockquote lang="grc"><p>{cleanQuote(lead.dsc_quote)}</p></blockquote>
                {glosses.length > 0 && (
                  <p className="leaf-gloss"><span className="leaf-gloss-tag">Glossed</span>{glosses.map((x, i) => <span key={x.at}>{i ? "; " : ""}<span lang="grc" className="grc">{x.word}</span>{x.g ? <> “{x.g.gloss}”</> : null}</span>)}</p>
                )}
                <p className="dossier-ref">{dN?.name ? <><span lang="grc" className="grc">{dN.name}</span>, </> : null}Wellmann’s edition via First1KGreek, CC BY-SA 4.0 · {links.scaife(lead.dsc_ref) && <Ext href={links.scaife(lead.dsc_ref)!}>Scaife reader</Ext>}</p>
              </figure>
              <figure className="dossier-quote dossier-quote--cul">
                <h3><span className="mark-swatch mark-swatch--cul" aria-hidden="true" />Culpeper, 1653</h3>
                <blockquote><p>{cleanQuote(lead.cul_quote)}</p></blockquote>
                <p className="dossier-ref">{cN?.name ?? "The Complete Herbal"}, Project Gutenberg 49513, public domain · <Ext href={links.gutenberg}>Gutenberg</Ext></p>
              </figure>
            </div>
            <p className="fine">Mentions: Dioscorides {fmt.int(claim?.dsc ?? null, "n/a")}, Culpeper {fmt.int(claim?.cul ?? null, "n/a")}. <a href={href(`/plant/${slug ?? ""}`, { c: lead.concept_id })}>Both texts in full, with every claim marked</a>.</p>
          </section>

          <section className="dossier-sec" aria-labelledby="dev">
            <h2 id="dev">Modern evidence, 2026</h2>
            <dl className="dossier-dl">
              <div><dt>Papers on the pair</dt><dd><span className="dossier-big num">{fmt.int(lead.epmc_pair)}</span> <TierMeter tier={tier} /> <span className="muted">{tier ? TIER_NOTE[tier] : ""}</span></dd></div>
              <div><dt>Papers on the plant</dt><dd className="num">{fmt.int(lead.epmc_taxon)}</dd></div>
              <div><dt>Lift</dt><dd className="num">{fmt.lift(claim?.lift)} <span className="muted">observed co-mentions against what the plant’s and the indication’s research volumes predict</span></dd></div>
              <div><dt>Clinical trials</dt><dd className="num">{fmt.int(p?.trials)} <span className="muted">on the plant, any condition (ClinicalTrials.gov)</span></dd></div>
            </dl>
            {meta?.query && (
              <>
                <p className="fine">The exact query the pipeline sent to Europe PMC (title, abstract and keywords; no MeSH expansion):</p>
                <code className="query">{meta.query}</code>
                <p><Ext href={epmcSearchUrl(meta.query)}>Run this search on Europe PMC</Ext></p>
              </>
            )}
            <Caution tone="line">A paper count measures attention, not efficacy; a co-mentioning paper may report no effect or harm.</Caution>
          </section>

          <section className="dossier-sec" aria-labelledby="did">
            <h2 id="did">Identification</h2>
            <dl className="dossier-dl">
              <div><dt>Dioscorides’ name</dt><dd>{dN ? <><span lang="grc" className="grc">{dN.name}</span> · {CONF[dN.confidence ?? ""] ?? "confidence not recorded"}{dN.note ? <span className="cell-sub">{dN.note}</span> : null}</> : "n/a"}</dd></div>
              <div><dt>Culpeper’s name</dt><dd>{cN ? <>{cN.name} · {CONF[cN.confidence ?? ""] ?? "confidence not recorded"}{cN.note ? <span className="cell-sub">{cN.note}</span> : null}</> : "n/a"}</dd></div>
              <div><dt>Accepted name</dt><dd><i>{lead.taxon}</i>{p?.gbif_key ? <> · GBIF <Ext href={links.gbif(p)}><span className="num">{p.gbif_key}</span></Ext></> : null}{p?.wikidata ? <> · <Ext href={links.wikidata(p)}>{p.wikidata}</Ext></> : null}</dd></div>
              <div><dt>Certainty weight</dt><dd><span className="num">{fmt.two(w)}</span> <span className="muted">the weaker identification: high {CONF_WEIGHT.high}, medium {CONF_WEIGHT.medium}, low {CONF_WEIGHT.low}{meta?.taxon_rank && meta.taxon_rank !== "species" ? "; genus only × 0.6" : ""}</span></dd></div>
            </dl>
            {cert.mechanism(lead) && <p className="fine">Mechanism: {cert.mechanism(lead)}</p>}
          </section>

          <Mechanism rank={lead.rank ?? 0} label={label} />

          <section className="dossier-sec" aria-labelledby="dcite">
            <h2 id="dcite">Cite this lead</h2>
            <p className="cite-plain">{plain}</p>
            <div className="btn-row copy-row">
              <CopyButton text={plain} label="Copy citation" />
              <CopyButton text={bib} label="Copy BibTeX" done="BibTeX copied" />
              <CopyButton text={csl} label="Copy CSL JSON" done="CSL JSON copied" />
            </div>
          </section>
        </div>

        <aside aria-label="About the plant">
          {im && (
            <figure className="dossier-plate">
              <img src={smallest(im, 480)} srcSet={srcSet(im)} sizes="(max-width: 980px) 90vw, 28vw" width={im.srcs[0].w} height={im.srcs[0].h} alt={`${im.label} in ${im.work.split(" (")[0]}`} loading="lazy" decoding="async" style={{ backgroundColor: im.color }} />
              <figcaption className="seam"><span lang="grc" className="grc">{im.label}</span> {im.work.split(" (")[0]}, {im.made}. {im.licence}.{im.basis ? <span className="seam-basis">{BASIS_NOTE[im.basis]}</span> : null}</figcaption>
            </figure>
          )}
          <section className="dossier-sec" aria-labelledby="dsafe">
            <h2 id="dsafe">Safety and conservation</h2>
            <ul className="flags">
              {lead.flag_historical_safety ? <li className="flag flag--warn">The herbals record a warning</li> : <li className="flag">No historical warning recorded</li>}
              <li className="flag"><Iucn code={lead.iucn} /></li>
            </ul>
            {!lead.iucn && <p className="fact-note">No IUCN assessment: “not assessed” is not “not threatened”.</p>}
            <Caution tone="line">A research hypothesis from historical texts, not medical advice. Do not self-treat.</Caution>
          </section>
          <section className="dossier-sec" aria-labelledby="dchem">
            <h2 id="dchem">Constituents</h2>
            <p><span className="dossier-big num">{fmt.int(lead.n_compounds)}</span> <span className="muted">compounds recorded in LOTUS (Wikidata P703)</span></p>
            {compounds.length > 0 && <ul className="compounds">{compounds.slice(0, 8).map((x) => <li key={x.name}>{x.qid ? <Ext href={links.wikidataItem(x.qid)}>{x.name}</Ext> : x.name}</li>)}</ul>}
          </section>
          <section className="dossier-sec" aria-labelledby="dwhy">
            <h2 id="dwhy">Why it ranks here</h2>
            <p className="fine">{lead.why}</p>
            <p className="fine">Score <span className="num">{fmt.two(lead.score)}</span> = 0.35 persistence + 0.25 chemistry + 0.40 literature gap. <a href={href("/methods", null, "leads")}>Method</a>.</p>
          </section>
        </aside>
      </div>
      <p className="dossier-printnote">Printed from {url} on {today()}. Palimpsest, EthnoHack 2026. Tier: {tier ? TIER_LABEL[tier] : "n/a"}. Not medical advice.</p>
      <nav className="dossier-nav" aria-label="Other leads">
        {prev ? <a className="dossier-nav-link" href={href(`/lead/${prev.rank}`)}><span className="nav-arrow nav-arrow--back" aria-hidden="true" />Lead {prev.rank}: <i>{prev.taxon}</i></a> : <span />}
        {next ? <a className="dossier-nav-link" href={href(`/lead/${next.rank}`)}>Lead {next.rank}: <i>{next.taxon}</i><span className="nav-arrow" aria-hidden="true" /></a> : <span />}
      </nav>
    </article>
  );
}
