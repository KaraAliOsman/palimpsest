import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  asArray, conceptLabel, conceptMap, dscRef, links, recordFile, tierOf, TIER_LABEL, TIER_NOTE, TIERS, useResource, wordAt,
  type Claim, type CodexImage, type Concept, type PlantName, type PlantRecord,
} from "../lib/data";
import { href, replaceParams, type Route } from "../lib/router";
import { fmt } from "../lib/format";
import { download, SITE, toCSV, today } from "../lib/export";
import { BASIS_NOTE, srcSet, smallest, useImages } from "../lib/images";
import { AnnotatedText } from "../components/AnnotatedText";
import { Arch, Caution, CopyButton, Empty, ErrorState, Ext, Iucn, Skeleton, TierMeter } from "../components/ui";

const RangeMap = lazy(() => import("../charts/RangeMap").then((m) => ({ default: m.RangeMap })));

const CONF: Record<string, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };

function cap(s?: string | null) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

function Names({ rec }: { rec: PlantRecord }) {
  const names = asArray<PlantName>(rec.plant.names);
  const dsc = names.filter((n) => n.source === "dioscorides");
  const cul = names.filter((n) => n.source === "culpeper");
  const p = rec.plant;
  const col = (cls: string, era: string, body: ReactNode) => (
    <div className={`names-col names-col--${cls}`} role="listitem">
      <Arch />
      <p className="names-era">{era}</p>
      {body}
    </div>
  );
  return (
    <section className="names" aria-labelledby="names-title">
      <h2 id="names-title" className="sec-title">Names across the eras</h2>
      <div className="names-row" role="list">
        {col("dsc", "Dioscorides, c. 60 CE", dsc.length ? dsc.map((n, i) => {
          const r = dscRef(n.monograph_id);
          return (
            <div key={n.monograph_id ?? i} className="names-entry">
              <p className="names-name grc" lang="grc">{n.name}</p>
              <p className="names-meta">{r ? <>Book {r.book}, chapter {r.chapter}</> : n.monograph_id}{n.confidence ? <> · {CONF[n.confidence] ?? n.confidence}</> : null}</p>
              {n.note && <p className="names-note">{n.note}</p>}
            </div>
          );
        }) : <p className="names-none">No chapter of Dioscorides is matched to this taxon.</p>)}
        {col("cul", "Culpeper, 1653", cul.length ? cul.map((n, i) => (
          <div key={n.monograph_id ?? i} className="names-entry">
            <p className="names-name">{n.name}</p>
            <p className="names-meta">The Complete Herbal{n.confidence ? <> · {CONF[n.confidence] ?? n.confidence}</> : null}</p>
            {n.note && <p className="names-note">{n.note}</p>}
          </div>
        )) : <p className="names-none">Culpeper has no monograph matched to this taxon.</p>)}
        {col("now", "Accepted name, 2026", (
          <div className="names-entry">
            <p className="names-name"><i>{p.taxon}</i></p>
            <p className="names-meta">{[p.family, p.rank].filter(Boolean).join(" · ")}</p>
            <p className="names-note">GBIF backbone {p.gbif_key ? <span className="num">{p.gbif_key}</span> : ""}{p.wikidata ? <>, Wikidata <span className="num">{p.wikidata}</span></> : null}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Plate({ im, primary }: { im: CodexImage; primary: boolean }) {
  return (
    <figure className={`plate ${primary ? "plate--primary" : ""}`}>
      <a href={im.commons_page} target="_blank" rel="noopener noreferrer" className="plate-link">
        <img src={smallest(im, 640)} srcSet={srcSet(im)} sizes="(max-width: 860px) 90vw, 30vw" width={im.srcs[0].w} height={im.srcs[0].h}
          alt={`${im.label} in ${im.work.split(" (")[0]}`} loading={primary ? "eager" : "lazy"} decoding="async" style={{ backgroundColor: im.color }} />
        <span className="visually-hidden"> (Wikimedia Commons record, opens in a new tab)</span>
      </a>
      <figcaption className="seam">
        <span className="seam-label">{/[α-ωἀ-ῼ]/i.test(im.label) ? <span lang="grc" className="grc">{im.label}</span> : <span className="smcp">{im.label}</span>}</span>
        {" "}{im.work.split(" (")[0]}, {im.made}. {im.licence}.
        {im.basis && <span className="seam-basis"> {BASIS_NOTE[im.basis]}</span>}
      </figcaption>
    </figure>
  );
}

function Folio({ id, kind, rec, cmap, persistent, lit, selected, onSelect, onHover, otherId, interlinear }: {
  id: string | null | undefined; kind: "dsc" | "cul"; rec: PlantRecord; cmap: Map<string, Concept>; persistent: Set<string>;
  lit: string | null; selected: string | null; onSelect: (id: string) => void; onHover: (id: string | null) => void;
  otherId: string | null | undefined; interlinear: boolean;
}) {
  const other = otherId ? rec.texts[otherId] : undefined;
  const counterpart = useMemo(() => {
    if (!otherId) return undefined;
    return (cid: string) => {
      const sp = asArray<{ start: number; end: number; concept_id: string; polarity?: string | null }>(other?.spans).find((x) => x.concept_id === cid && x.polarity !== "adverse");
      return sp && other?.text ? wordAt(other.text, sp.start, sp.end) : null;
    };
  }, [other, otherId]);
  const t = id ? rec.texts[id] : undefined;
  const isD = kind === "dsc";
  const r = isD ? dscRef(id) : null;
  const ext = isD ? links.scaife(id) : links.gutenberg;
  return (
    <article className={`folio folio--${kind}`} aria-labelledby={`folio-${kind}`}>
      <header className="folio-head">
        <h3 id={`folio-${kind}`} className="folio-title"><span className={`mark-swatch mark-swatch--${kind}`} aria-hidden="true" />{isD ? "Dioscorides" : "Culpeper"}</h3>
        <p className="folio-ref">
          {isD ? (t?.ref ?? (r ? `De materia medica ${r.book}.${r.chapter}` : "De materia medica")) : "Government and virtues"}
          {id && ext && <> · <Ext href={ext}>{isD ? "Scaife reader" : "Gutenberg 49513"}</Ext></>}
        </p>
      </header>
      {!id && <p className="folio-empty">{isD ? "No chapter of Dioscorides is matched to this taxon." : "Culpeper has no monograph matched to this taxon."}</p>}
      {id && !t?.text && <p className="folio-empty">The text of <code>{id}</code> is not in the export.</p>}
      {id && t?.text && (
        <AnnotatedText text={t.text} spans={asArray(t.spans)} lang={isD ? "grc" : "en"} source={kind}
          concepts={cmap} persistent={persistent} lit={lit} selected={selected} onSelect={onSelect} onHover={onHover}
          gloss={rec.gloss?.[id]} interlinear={interlinear} counterpart={counterpart} otherName={isD ? "Culpeper" : "Dioscorides"} />
      )}
    </article>
  );
}

function Mark({ n, kind }: { n: number | null | undefined; kind: "dsc" | "cul" }) {
  if (!n) return <span className="cell-none" aria-label="not claimed">·</span>;
  return <span className={`claim-mark claim-mark--${kind}`}><span className="claim-dot" aria-hidden="true" /><span className="num">{n}</span><span className="visually-hidden"> {n === 1 ? "mention" : "mentions"}</span></span>;
}

export function PlantPage({ slug, route }: { slug: string; route: Route }) {
  const rec = useResource<PlantRecord>(slug ? recordFile(slug) : null);
  const concepts = useResource<Concept[]>("concepts.json");
  const imgs = useImages();
  const [lit, setLit] = useState<string | null>(null);
  const [chapter, setChapter] = useState(0);
  const [interlinear, setInterlinear] = useState(() => { try { return localStorage.getItem("ps-interlinear") === "1"; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem("ps-interlinear", interlinear ? "1" : "0"); } catch { /* private mode */ } }, [interlinear]);
  const selected = route.params.get("c");
  const cmap = conceptMap(asArray<Concept>(concepts.data));

  const claims = useMemo(() => {
    const list = asArray<Claim>(rec.data?.plant.claims).filter((c) => c && c.concept_id);
    return list.slice().sort((a, b) => Number(!!b.persistent) - Number(!!a.persistent) || ((b.dsc ?? 0) + (b.cul ?? 0)) - ((a.dsc ?? 0) + (a.cul ?? 0)));
  }, [rec.data]);
  const persistent = useMemo(() => new Set(claims.filter((c) => c.persistent).map((c) => c.concept_id)), [claims]);

  if (rec.status === "loading") return <div className="wrap page"><Skeleton rows={12} label="Opening the record" /></div>;
  if (rec.status === "error") {
    const missing = /404/.test(rec.error.message);
    return (
      <div className="wrap page">
        <h1 id="page-title" tabIndex={-1} className="page-title-s">{missing ? "No plant at this address" : "This record did not load"}</h1>
        {missing
          ? <Empty title={`Nothing is filed under “${slug}”.`} action={<a className="btn btn--line" href={href("/plants", { q: slug.replace(/-/g, " ") })}>Search the plant list</a>}>The taxon may have been renamed in a later export.</Empty>
          : <ErrorState what="The plant record" error={rec.error} retry={rec.retry} />}
      </div>
    );
  }

  const r = rec.data;
  const p = r.plant;
  const names = asArray<PlantName>(p.names);
  const dscNames = names.filter((n) => n.source === "dioscorides");
  const culName = names.find((n) => n.source === "culpeper") ?? null;
  const images = (r.images ?? []).map((id) => imgs.byId.get(id)).filter((x): x is CodexImage => !!x);
  const compounds = asArray<{ name?: string; qid?: string | null }>(p.top_compounds).filter((c) => c?.name);
  const tierCounts = TIERS.map((t) => claims.filter((c) => tierOf(c) === t).length);
  const pageUrl = `${SITE.url}#/plant/${slug}`;
  const citation = `Palimpsest (${SITE.year}). ${p.taxon}${p.common_name ? ` (${p.common_name})` : ""}: names, claims and modern evidence [data record]. Palimpsest explorer, EthnoHack 2026. ${pageUrl} (accessed ${today()}). Greek text after Wellmann (1906–1914), First1KGreek, CC BY-SA 4.0; Culpeper, Project Gutenberg 49513.`;

  const select = (id: string) => {
    const next = new URLSearchParams(route.params);
    if (selected === id) next.delete("c"); else next.set("c", id);
    replaceParams(`/plant/${slug}`, next);
  };
  const exportJSON = () => download(`palimpsest-${slug}.json`, JSON.stringify({
    source: pageUrl, licence: "Greek-derived text and spans CC BY-SA 4.0; Culpeper public domain; data fields CC BY 4.0", exported: today(), ...r,
  }, null, 2), "application/json");
  const exportCSV = () => download(`palimpsest-${slug}-claims.csv`, toCSV(claims, [
    { key: "taxon", get: () => p.taxon },
    { key: "concept_id", get: (c) => c.concept_id },
    { key: "indication", get: (c) => conceptLabel(cmap, c.concept_id) },
    { key: "mesh_id", get: (c) => cmap.get(c.concept_id)?.mesh_id },
    { key: "category", get: (c) => cmap.get(c.concept_id)?.category },
    { key: "dioscorides_mentions", get: (c) => c.dsc ?? 0 },
    { key: "culpeper_mentions", get: (c) => c.cul ?? 0 },
    { key: "persistent", get: (c) => !!c.persistent },
    { key: "europepmc_pair_papers", get: (c) => c.epmc_pair },
    { key: "lift", get: (c) => c.lift },
    { key: "evidence_tier", get: (c) => tierOf(c) },
  ]), "text/csv");

  const dscId = (dscNames[chapter] ?? dscNames[0])?.monograph_id;

  return (
    <div className="plant">
      <div className="wrap">
        <nav className="crumbs" aria-label="Breadcrumb">
          <a href={href("/plants")}>Plants</a><span aria-hidden="true" className="crumbs-sep">/</span><span aria-current="page"><i>{p.taxon}</i></span>
        </nav>
        <header className="plant-head">
          <div>
            <h1 id="page-title" tabIndex={-1} className="binomial"><i>{p.taxon}</i></h1>
            <p className="plant-sub">{[cap(p.common_name), p.family].filter(Boolean).join(" · ")}{p.lead_score != null && <> · lead score <span className="num">{fmt.two(p.lead_score)}</span></>}</p>
          </div>
          <div className="plant-actions">
            <CopyButton text={citation} label="Cite this record" done="Citation copied" />
            <button type="button" className="btn btn--line" onClick={exportJSON}>Download JSON</button>
            <button type="button" className="btn btn--line" onClick={exportCSV}>Download CSV</button>
          </div>
        </header>

        <div className={`plant-top ${images.length ? "" : "is-imageless"}`}>
          {images.length > 0 && (
            <div className="plant-plates">
              {images.slice(0, 2).map((im, i) => <Plate key={im.id} im={im} primary={i === 0} />)}
            </div>
          )}
          <div className="plant-top-main">
            <Names rec={r} />
            <dl className="ledger-facts">
              <div><dt>Indications</dt><dd className="num">{claims.length}</dd><dd className="fact-src">extracted from both texts</dd></div>
              <div><dt>In both herbals</dt><dd className="num">{persistent.size}</dd><dd className="fact-src">same plant, same indication</dd></div>
              <div><dt>Papers on the plant</dt><dd className="num">{fmt.int(p.epmc_total)}</dd><dd className="fact-src">Europe PMC, binomial in title or abstract</dd></div>
              <div><dt>Clinical trials</dt><dd className="num">{fmt.int(p.trials)}</dd><dd className="fact-src">ClinicalTrials.gov v2</dd></div>
              <div><dt>Known constituents</dt><dd className="num">{fmt.int(p.n_compounds)}</dd><dd className="fact-src">LOTUS via Wikidata P703</dd></div>
              <div><dt>IUCN Red List</dt><dd><Iucn code={p.iucn} /></dd><dd className="fact-src">via Wikidata P141</dd></div>
            </dl>
          </div>
        </div>
      </div>

      <section className="texts" aria-labelledby="texts-title">
        <div className="wrap">
          <div className="sec-head sec-head--split">
            <h2 id="texts-title" className="sec-title">The two texts, facing</h2>
            <p className="sec-lede">Marked words are extracted indications; red underlines are claimed in both herbals. Hover or focus a word for its literal English gloss, its MeSH concept and what the other herbal says; select it to trace it in the table.</p>
          </div>
          <div className="folio-tools">
            <button type="button" className="btn btn--line btn--small" aria-pressed={interlinear} onClick={() => setInterlinear((v) => !v)}>{interlinear ? "Hide the glosses" : "Show glosses inline"}</button>
            <span className="muted fine-inline">Glosses are the literal senses of the lexicon entry behind each match, not a translation of the chapter.</span>
          </div>
          {dscNames.length > 1 && (
            <div className="segmented" role="group" aria-label="Dioscorides chapter">
              {dscNames.map((n, i) => {
                const rr = dscRef(n.monograph_id);
                return <button key={n.monograph_id ?? i} type="button" aria-pressed={chapter === i} onClick={() => setChapter(i)}>{rr ? `Chapter ${rr.book}.${rr.chapter}` : n.monograph_id}</button>;
              })}
            </div>
          )}
          <div className="facing">
            <Folio key={dscId ?? "none"} id={dscId} kind="dsc" rec={r} cmap={cmap} persistent={persistent} lit={lit} selected={selected} onSelect={select} onHover={setLit} otherId={culName?.monograph_id} interlinear={interlinear} />
            <Folio id={culName?.monograph_id} kind="cul" rec={r} cmap={cmap} persistent={persistent} lit={lit} selected={selected} onSelect={select} onHover={setLit} otherId={dscId} interlinear={interlinear} />
          </div>
        </div>
      </section>

      <div className="wrap plant-body">
        <section aria-labelledby="ev-title" className="plant-evidence">
          <h2 id="ev-title" className="sec-title">Indications and modern evidence</h2>
          <p className="sec-lede">{claims.length ? `${claims.length} indications, ${persistent.size} in both herbals. Papers count Europe PMC records that name the plant and the indication together; lift compares that with what the plant’s and the indication’s research volumes predict.` : "No indications were extracted for this plant."}</p>
          {claims.length > 0 && (
            <>
              <ul className="tier-key" aria-label="Evidence tiers">
                {TIERS.map((t, i) => <li key={t}><TierMeter tier={t} /> <span className="muted">{TIER_NOTE[t]} · {tierCounts[i]} here</span></li>)}
              </ul>
              <div className="table-scroll">
                <table className="canon-table claims-table">
                  <caption className="visually-hidden">Indications claimed for {p.taxon}, with modern evidence</caption>
                  <thead>
                    <tr>
                      <th scope="col">Indication</th>
                      <th scope="col" className="center th-arch"><Arch />Dioscorides</th>
                      <th scope="col" className="center th-arch"><Arch />Culpeper</th>
                      <th scope="col" className="num">Papers</th>
                      <th scope="col" className="num">Lift</th>
                      <th scope="col">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((c) => {
                      const label = conceptLabel(cmap, c.concept_id);
                      const meta = cmap.get(c.concept_id);
                      const cls = [c.persistent ? "is-persistent" : "", selected === c.concept_id ? "is-selected" : "", lit === c.concept_id ? "is-lit" : ""].filter(Boolean).join(" ");
                      return (
                        <tr key={c.concept_id} className={cls} onMouseEnter={() => setLit(c.concept_id)} onMouseLeave={() => setLit(null)}>
                          <th scope="row">
                            <button type="button" className="concept-btn" aria-pressed={selected === c.concept_id} onClick={() => select(c.concept_id)} onFocus={() => setLit(c.concept_id)} onBlur={() => setLit(null)}>{label}</button>
                            <span className="cell-sub">{[meta?.category, meta?.mesh_id ? `MeSH ${meta.mesh_id}` : null].filter(Boolean).join(" · ")}{c.persistent ? <span className="persist-tag">both herbals</span> : null}</span>
                          </th>
                          <td className="center" data-label="Dioscorides"><Mark n={c.dsc} kind="dsc" /></td>
                          <td className="center" data-label="Culpeper"><Mark n={c.cul} kind="cul" /></td>
                          <td className="num" data-label="Papers"><a href={links.epmc(p.taxon, meta?.label?.split(" / ")[0] ?? label)} target="_blank" rel="noopener noreferrer" aria-label={`${fmt.int(c.epmc_pair, "unknown")} papers; search Europe PMC (opens in a new tab)`}>{fmt.int(c.epmc_pair)}</a></td>
                          <td className="num" data-label="Lift">{fmt.lift(c.lift)}</td>
                          <td data-label="Tier"><TierMeter tier={tierOf(c)} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Caution tone="line">A paper count measures attention, not efficacy: a co-mentioning paper may report no effect or harm. Not medical advice.</Caution>
            </>
          )}
        </section>

        <aside className="facts" aria-label="About this plant">
          <section>
            <h3>Constituents</h3>
            <p className="fact-figure num">{fmt.int(p.n_compounds)}</p>
            <p className="fact-note">compounds recorded in LOTUS via Wikidata (P703)</p>
            {compounds.length > 0 && (
              <ul className="compounds">
                {compounds.slice(0, 10).map((c) => <li key={c.name}>{c.qid ? <Ext href={links.wikidataItem(c.qid)}>{c.name}</Ext> : c.name}</li>)}
              </ul>
            )}
          </section>
          <section>
            <h3>Conservation and range</h3>
            <dl className="fact-list">
              <div><dt>IUCN Red List</dt><dd><Iucn code={p.iucn} /></dd></div>
              <div><dt>GBIF occurrences</dt><dd className="num">{fmt.int(p.gbif_occurrences)}</dd></div>
            </dl>
            <p className="fact-note"><a href={href(`/plant/${slug}`, null, "where")}>Where it grows</a>: native and introduced range.</p>
            {!p.iucn && <p className="fact-note">No IUCN assessment: “not assessed” is not “not threatened”.</p>}
          </section>
          <section>
            <h3>Elsewhere</h3>
            <ul className="plain link-list">
              <li><Ext href={links.gbif(p)}>GBIF species page</Ext></li>
              <li><Ext href={links.wikidata(p)}>Wikidata</Ext></li>
              <li><Ext href={links.epmc(p.taxon)}>Europe PMC search</Ext></li>
              <li><Ext href={links.trials(p.taxon)}>ClinicalTrials.gov</Ext></li>
              {links.scaife(dscId) && <li><Ext href={links.scaife(dscId)!}>Dioscorides in the Scaife reader</Ext></li>}
              {culName && <li><Ext href={links.gutenberg}>Culpeper on Project Gutenberg</Ext></li>}
              {images[0] && <li><Ext href={images[0].commons_page}>The folio on Wikimedia Commons</Ext></li>}
            </ul>
          </section>
          <section>
            <h3>Tiers</h3>
            <p className="fact-note">{TIERS.map((t) => `${TIER_LABEL[t]}: ${TIER_NOTE[t]}`).join(". ")}. <a href={href("/methods", null, "tiers")}>How tiers are computed</a>.</p>
          </section>
        </aside>
      </div>

      <section className="where" id="where" aria-labelledby="where-title">
        <div className="wrap">
          <Suspense fallback={<Skeleton rows={6} label="Drawing the range" />}><RangeMap slug={slug} taxon={p.taxon} /></Suspense>
        </div>
      </section>
    </div>
  );
}
