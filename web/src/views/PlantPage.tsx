import { useMemo, useState } from "react";
import {
  asArray, conceptLabel, conceptMap, dscRef, indexPlants, links, tierOf, useResource,
  type Claim, type Concept, type Plant, type PlantIndex, type Texts,
} from "../lib/data";
import { href, replaceParams, type Route } from "../lib/router";
import { fmt } from "../lib/format";
import { AnnotatedText } from "../components/AnnotatedText";
import { Empty, ErrorState, Ext, Iucn, Skeleton, TierMeter } from "../components/ui";

const CONF: Record<string, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };

function Chain({ p }: { p: PlantIndex }) {
  const d = p.dscName, c = p.culName, r = d?.monograph_id ? dscRef(d.monograph_id) : null;
  return (
    <ol className="chain" aria-label="Name chain across the eras">
      <li className={`chain-step ${d ? "" : "is-absent"}`}>
        <span className="chain-era"><span className="swatch swatch--dsc" aria-hidden="true" />Dioscorides, c. 60 CE</span>
        {d?.name ? <span className="chain-name" lang="grc">{d.name}</span> : <span className="chain-name chain-name--none">Not identified in Dioscorides</span>}
        {d && <span className="chain-meta">{r ? `Book ${r.book}, chapter ${r.chapter}` : d.monograph_id}{d.confidence ? <><br />{CONF[d.confidence] ?? d.confidence}</> : null}
          {p.dscNames.length > 1 && <><br />Also {p.dscNames.slice(1).map((x) => { const rr = dscRef(x.monograph_id); return rr ? `${rr.book}.${rr.chapter}` : x.monograph_id; }).join(", ")}</>}</span>}
        {d?.note && <span className="chain-note">{d.note}</span>}
      </li>
      <li className={`chain-step ${c ? "" : "is-absent"}`}>
        <span className="chain-era"><span className="swatch swatch--cul" aria-hidden="true" />Culpeper, 1653</span>
        {c?.name ? <span className="chain-name">{c.name}</span> : <span className="chain-name chain-name--none">Not in Culpeper</span>}
        {c && <span className="chain-meta">The Complete Herbal{c.confidence ? <><br />{CONF[c.confidence] ?? c.confidence}</> : null}</span>}
        {c?.note && <span className="chain-note">{c.note}</span>}
      </li>
      <li className="chain-step">
        <span className="chain-era"><span className="swatch swatch--mod" aria-hidden="true" />Accepted name, 2026</span>
        <span className="chain-name"><i>{p.plant.taxon}</i></span>
        <span className="chain-meta">
          {p.plant.gbif_key ? <>GBIF <span className="num">{p.plant.gbif_key}</span></> : "GBIF backbone"}
          {p.plant.wikidata ? <><br />Wikidata <span className="num">{p.plant.wikidata}</span></> : null}
        </span>
      </li>
    </ol>
  );
}

function Folio({ id, kind, texts, textStatus, retry, error, cmap, persistent, lit, selected, onSelect, onHover }: {
  id: string | null | undefined; kind: "dsc" | "cul"; texts: Texts | undefined; textStatus: string; retry: () => void; error?: Error;
  cmap: Map<string, Concept>; persistent: Set<string>; lit: string | null; selected: string | null;
  onSelect: (id: string) => void; onHover: (id: string | null) => void;
}) {
  const t = id ? texts?.[id] : undefined;
  const isD = kind === "dsc";
  const r = isD ? dscRef(id) : null;
  const ext = isD ? links.scaife(id) : links.gutenberg;
  return (
    <article className={`folio folio--${kind}`} aria-labelledby={`folio-${kind}`}>
      <header className="folio-head">
        <h2 id={`folio-${kind}`} className="folio-title"><span className={`swatch swatch--${kind}`} aria-hidden="true" />{isD ? "Dioscorides" : "Culpeper"}</h2>
        <p className="folio-ref">
          {isD ? (t?.ref ?? (r ? `De materia medica ${r.book}.${r.chapter}` : "De materia medica")) : "Government and virtues"}
          {id && ext && <> <Ext href={ext}>{isD ? "Scaife reader" : "Gutenberg 49513"}</Ext></>}
        </p>
      </header>
      {!id && <p className="folio-empty">{isD ? "No chapter of Dioscorides is matched to this taxon." : "Culpeper has no monograph matched to this taxon."}</p>}
      {id && textStatus === "loading" && <Skeleton rows={8} label="Reading the text" />}
      {id && textStatus === "error" && <ErrorState what="The texts file" error={error} retry={retry} />}
      {id && textStatus === "ready" && !t?.text && <p className="folio-empty">The text of <code>{id}</code> is not in texts.json yet.</p>}
      {id && t?.text && (
        <AnnotatedText
          text={t.text} spans={asArray(t.spans)} lang={isD ? "grc" : "en"} source={kind}
          concepts={cmap} persistent={persistent} lit={lit} selected={selected} onSelect={onSelect} onHover={onHover}
        />
      )}
    </article>
  );
}

function Mark({ n }: { n: number | null | undefined }) {
  if (!n) return <span className="muted">no</span>;
  return <span className="tick-mark"><span aria-hidden="true">✓</span><span className="visually-hidden">claimed</span> {n > 1 && <span className="muted num">{n}</span>}</span>;
}

export function PlantPage({ slug, route }: { slug: string; route: Route }) {
  const plants = useResource<Plant[]>("plants.json");
  const concepts = useResource<Concept[]>("concepts.json");
  const texts = useResource<Texts>("texts.json");
  const [lit, setLit] = useState<string | null>(null);
  const [chapter, setChapter] = useState(0);
  const selected = route.params.get("c");
  const cs = asArray<Concept>(concepts.data);
  const cmap = conceptMap(cs);
  const settled = concepts.status !== "loading";
  const entry = useMemo(() => (plants.status === "ready" && settled ? indexPlants(asArray<Plant>(plants.data), cs).bySlug.get(slug) : undefined), [plants.status, plants.data, cs, slug, settled]);

  const claims = useMemo(() => {
    const list = asArray<Claim>(entry?.plant.claims).filter((c) => c && c.concept_id);
    return list.slice().sort((a, b) => Number(!!b.persistent) - Number(!!a.persistent) || ((b.dsc ?? 0) + (b.cul ?? 0)) - ((a.dsc ?? 0) + (a.cul ?? 0)));
  }, [entry]);
  const persistent = useMemo(() => new Set(claims.filter((c) => c.persistent).map((c) => c.concept_id)), [claims]);

  if (plants.status === "loading" || (plants.status === "ready" && !settled)) return <div className="container page"><Skeleton rows={12} label="Reading plants.json" /></div>;
  if (plants.status === "error") return <div className="container page"><ErrorState what="The plant list" error={plants.error} retry={plants.retry} /></div>;
  if (!entry) {
    return (
      <div className="container page">
        <h1 id="page-title" tabIndex={-1} className="page-title-s">No plant at this address</h1>
        <Empty title={`Nothing is filed under “${slug}”.`} action={<a className="btn btn--quiet" href={href("/plants", { q: slug.replace(/-/g, " ") })}>Search the plant list</a>}>
          The export may have renamed the taxon.
        </Empty>
      </div>
    );
  }

  const p = entry.plant;
  const select = (id: string) => {
    const next = new URLSearchParams(route.params);
    if (selected === id) next.delete("c"); else next.set("c", id);
    replaceParams(`/plant/${slug}`, next);
  };
  const compounds = asArray<{ name?: string; qid?: string | null }>(p.top_compounds).filter((c) => c?.name);
  const scaife = links.scaife(entry.dscName?.monograph_id);

  return (
    <div className="container page plant">
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href={href("/plants")}>Plants</a><span aria-hidden="true" className="crumbs-sep">/</span><span aria-current="page"><i>{p.taxon}</i></span>
      </nav>
      <header className="plant-head">
        <h1 id="page-title" tabIndex={-1} className="binomial">{p.taxon}</h1>
        <p className="plant-sub">{[p.common_name, p.family].filter(Boolean).join(", ") || " "}</p>
      </header>

      <Chain p={entry} />

      <p className="facing-hint">Highlighted words are extracted indications. Hover or focus one for its MeSH concept; select it to trace it in the table.</p>
      <section className="facing" aria-label="The two texts">
        <div className="folio-wrap">
          {entry.dscNames.length > 1 && (
            <div className="segmented chapters" role="group" aria-label="Dioscorides chapter">
              {entry.dscNames.map((n, i) => {
                const rr = dscRef(n.monograph_id);
                return <button key={n.monograph_id ?? i} type="button" aria-pressed={chapter === i} onClick={() => setChapter(i)}>{rr ? `Chapter ${rr.book}.${rr.chapter}` : n.monograph_id}</button>;
              })}
            </div>
          )}
          <Folio key={entry.dscNames[chapter]?.monograph_id ?? "none"} id={(entry.dscNames[chapter] ?? entry.dscName)?.monograph_id} kind="dsc" texts={texts.data} textStatus={texts.status} retry={texts.retry} error={texts.error}
          cmap={cmap} persistent={persistent} lit={lit} selected={selected} onSelect={select} onHover={setLit} />
        </div>
        <Folio id={entry.culName?.monograph_id} kind="cul" texts={texts.data} textStatus={texts.status} retry={texts.retry} error={texts.error}
          cmap={cmap} persistent={persistent} lit={lit} selected={selected} onSelect={select} onHover={setLit} />
      </section>

      <div className="plant-body">
        <section aria-labelledby="ev-title" className="plant-evidence">
          <h2 id="ev-title">Indications and evidence</h2>
          <p className="section-lede">{claims.length ? `${claims.length} indications, ${persistent.size} in both herbals. Papers count Europe PMC records that name the plant and the indication together.` : "No indications were extracted for this plant."}</p>
          {claims.length > 0 && (
            <table className="ledger claims-table">
              <caption className="visually-hidden">Indications claimed for {p.taxon}, with modern evidence</caption>
              <thead>
                <tr>
                  <th scope="col">Indication</th>
                  <th scope="col" className="center">Dioscorides</th>
                  <th scope="col" className="center">Culpeper</th>
                  <th scope="col" className="num">Papers</th>
                  <th scope="col" className="num">Lift</th>
                  <th scope="col">Tier</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => {
                  const label = conceptLabel(cmap, c.concept_id);
                  const meta = cmap.get(c.concept_id);
                  return (
                    <tr key={c.concept_id}
                      className={[c.persistent ? "is-persistent" : "", selected === c.concept_id ? "is-selected" : "", lit === c.concept_id ? "is-lit" : ""].filter(Boolean).join(" ")}
                      onMouseEnter={() => setLit(c.concept_id)} onMouseLeave={() => setLit(null)}>
                      <th scope="row">
                        <button type="button" className="concept-btn" aria-pressed={selected === c.concept_id} onClick={() => select(c.concept_id)} onFocus={() => setLit(c.concept_id)} onBlur={() => setLit(null)}>
                          {label}
                        </button>
                        <span className="cell-sub">{[meta?.category, meta?.mesh_id ? `MeSH ${meta.mesh_id}` : null].filter(Boolean).join(", ")}{c.persistent ? <span className="persist-tag">in both</span> : null}</span>
                      </th>
                      <td className="center" data-label="Dioscorides"><Mark n={c.dsc} /></td>
                      <td className="center" data-label="Culpeper"><Mark n={c.cul} /></td>
                      <td className="num" data-label="Papers"><a href={links.epmc(p.taxon, meta?.label ?? label)} target="_blank" rel="noopener noreferrer" aria-label={`${fmt.int(c.epmc_pair, "unknown")} papers, search Europe PMC (opens in a new tab)`}>{fmt.int(c.epmc_pair)}</a></td>
                      <td className="num" data-label="Lift">{fmt.lift(c.lift)}</td>
                      <td data-label="Tier"><TierMeter tier={tierOf(c)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <aside className="facts" aria-label="About this plant">
          <section>
            <h3>Phytochemistry</h3>
            <p className="fact-figure">{fmt.int(p.n_compounds)} <span className="fact-unit">known compounds</span></p>
            <p className="fact-note">LOTUS natural-products records, through Wikidata.</p>
            {compounds.length > 0 && (
              <ul className="compounds">
                {compounds.slice(0, 8).map((c) => <li key={c.name}>{c.qid ? <Ext href={links.wikidataItem(c.qid)}>{c.name}</Ext> : c.name}</li>)}
              </ul>
            )}
          </section>
          <section>
            <h3>Literature and trials</h3>
            <dl className="fact-list">
              <div><dt>Europe PMC papers on the plant</dt><dd className="num">{fmt.int(p.epmc_total)}</dd></div>
              <div><dt>Registered clinical trials</dt><dd className="num">{fmt.int(p.trials)}</dd></div>
            </dl>
          </section>
          <section>
            <h3>Conservation and range</h3>
            <dl className="fact-list">
              <div><dt>IUCN Red List</dt><dd><Iucn code={p.iucn} /></dd></div>
              <div><dt>GBIF occurrences</dt><dd className="num">{fmt.int(p.gbif_occurrences)}</dd></div>
            </dl>
          </section>
          <section>
            <h3>Records elsewhere</h3>
            <ul className="plain link-list">
              <li><Ext href={links.gbif(p)}>GBIF species page</Ext></li>
              <li><Ext href={links.wikidata(p)}>Wikidata</Ext></li>
              <li><Ext href={links.epmc(p.taxon)}>Europe PMC search</Ext></li>
              <li><Ext href={links.trials(p.taxon)}>ClinicalTrials.gov</Ext></li>
              {scaife && <li><Ext href={scaife}>Dioscorides in the Scaife reader</Ext></li>}
              {entry.culName && <li><Ext href={links.gutenberg}>Culpeper on Project Gutenberg</Ext></li>}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
