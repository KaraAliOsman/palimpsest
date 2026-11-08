import { useMemo, useState } from "react";
import { asArray, cleanQuote, dscRef, fold, THREATENED, useResource, type Lead, type SearchIndex } from "../lib/data";
import { href, replaceParams, type Route } from "../lib/router";
import { fmt, plural } from "../lib/format";
import { download, toCSV } from "../lib/export";
import { smallest, useImages } from "../lib/images";
import { Caution, Empty, ErrorState, Iucn, Meter, Skeleton } from "../components/ui";
import { kendallTau, useLeadCertainty } from "../lib/leads";

const CONF_LABEL: Record<string, string> = { high: "high", medium: "medium", low: "low" };

type Sort = "rank" | "papers" | "compounds" | "mentions";
const SORTS: { id: Sort; label: string }[] = [
  { id: "rank", label: "Rank (score)" },
  { id: "papers", label: "Fewest papers on the pair" },
  { id: "compounds", label: "Most known constituents" },
  { id: "mentions", label: "Most mentions in the herbals" },
];
const STEP = 20;

function mentions(l: Lead): number {
  const m = /\((\d+)\+(\d+) mentions\)/.exec(l.why ?? "");
  return m ? Number(m[1]) + Number(m[2]) : 0;
}

export function Leads({ route }: { route: Route }) {
  const leads = useResource<Lead[]>("leads.json");
  const index = useResource<SearchIndex>("derived/search.json");
  const imgs = useImages();
  const P = route.params;
  const q = P.get("q") ?? "";
  const cat = P.get("cat") ?? "";
  const safety = P.get("safety") ?? ""; // "" any, "1" flagged only, "0" hide flagged
  const iucn = P.get("iucn") ?? ""; // "" any, "assessed", "nothreat"
  const sort = (SORTS.find((s) => s.id === P.get("sort"))?.id ?? "rank") as Sort;
  const [limit, setLimit] = useState(STEP);
  const alpha = Math.max(0, Math.min(1, Number(P.get("w") ?? 0) || 0));
  const cert = useLeadCertainty();
  const [draft, setDraft] = useState(q);

  const plants = useMemo(() => new Map((index.data?.plants ?? []).map((p) => [p.t, p])), [index.data]);
  const cmap = useMemo(() => new Map((index.data?.concepts ?? []).map((c) => [c.id, c])), [index.data]);
  const all = useMemo(() => asArray<Lead>(leads.data).filter((l) => l && l.taxon && l.concept_id), [leads.data]);
  const categories = useMemo(() => [...new Set(all.map((l) => cmap.get(l.concept_id)?.cat).filter((x): x is string => !!x))].sort(), [all, cmap]);

  // Certainty weighting: adjusted = score × weight^alpha (alpha 0 = as published, 1 = fully weighted).
  const adj = (l: Lead) => (l.score ?? 0) * Math.pow(cert.weight(l), alpha);
  const position = useMemo(() => {
    const order = all.slice().sort((a, b) => adj(b) - adj(a) || (a.rank ?? 0) - (b.rank ?? 0));
    return new Map(order.map((l, i) => [l, i + 1]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, alpha, cert.ready, cert.fromExtra]);
  const tau = useMemo(() => kendallTau(all.map((l) => l.rank ?? 0), all.map((l) => position.get(l) ?? 0)), [all, position]);
  const moved = all.filter((l) => Math.abs((position.get(l) ?? 0) - (l.rank ?? 0)) > 2).length;

  const shown = useMemo(() => {
    const t = fold(q);
    const out = all.filter((l) => {
      if (cat && cmap.get(l.concept_id)?.cat !== cat) return false;
      if (safety === "1" && !l.flag_historical_safety) return false;
      if (safety === "0" && l.flag_historical_safety) return false;
      if (iucn === "assessed" && !l.iucn) return false;
      if (iucn === "nothreat" && (l.flag_threatened || (l.iucn && THREATENED.has(l.iucn.toUpperCase())))) return false;
      if (t) {
        const p = plants.get(l.taxon);
        if (!fold([l.taxon, p?.c, p?.e, ...(p?.g ?? []), l.label, cmap.get(l.concept_id)?.l].filter(Boolean).join(" ")).includes(t)) return false;
      }
      return true;
    });
    const by: Record<Sort, (a: Lead, b: Lead) => number> = {
      rank: (a, b) => (position.get(a) ?? 1e9) - (position.get(b) ?? 1e9),
      papers: (a, b) => (a.epmc_pair ?? 0) - (b.epmc_pair ?? 0) || (a.rank ?? 0) - (b.rank ?? 0),
      compounds: (a, b) => (b.n_compounds ?? 0) - (a.n_compounds ?? 0),
      mentions: (a, b) => mentions(b) - mentions(a) || (a.rank ?? 0) - (b.rank ?? 0),
    };
    return out.sort(by[sort]);
  }, [all, cat, safety, iucn, q, cmap, plants, sort, position]);

  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(route.params);
    if (v) next.set(k, v); else next.delete(k);
    replaceParams("/leads", next);
    setLimit(STEP);
  };
  const maxScore = Math.max(1e-9, ...all.map((l) => l.score ?? 0));
  const exportCSV = () => download("palimpsest-leads.csv", toCSV(shown, [
    { key: "rank", get: (l) => l.rank }, { key: "certainty_weighted_position", get: (l) => position.get(l) }, { key: "certainty_weight", get: (l) => cert.weight(l) }, { key: "taxon", get: (l) => l.taxon }, { key: "common_name", get: (l) => plants.get(l.taxon)?.c },
    { key: "concept_id", get: (l) => l.concept_id }, { key: "indication", get: (l) => l.label }, { key: "mesh_id", get: (l) => cmap.get(l.concept_id)?.m },
    { key: "score", get: (l) => l.score }, { key: "papers_on_pair", get: (l) => l.epmc_pair }, { key: "papers_on_plant", get: (l) => l.epmc_taxon },
    { key: "known_constituents", get: (l) => l.n_compounds }, { key: "iucn", get: (l) => l.iucn }, { key: "historical_safety_flag", get: (l) => !!l.flag_historical_safety },
    { key: "dioscorides_ref", get: (l) => l.dsc_ref }, { key: "dioscorides_quote", get: (l) => cleanQuote(l.dsc_quote) },
    { key: "culpeper_ref", get: (l) => l.cul_ref }, { key: "culpeper_quote", get: (l) => cleanQuote(l.cul_quote) },
    { key: "licence_note", get: () => "Greek quotations CC BY-SA 4.0 (First1KGreek, ed. Wellmann)" },
  ]), "text/csv");

  return (
    <div className="wrap page">
      <header className="page-head">
        <h1 id="page-title" tabIndex={-1}>Leads</h1>
        <p className="page-lede">Plant–indication pairs that both herbals agree on, that modern literature has barely touched, and that a plant chapter in each book supports. Ranked as research hypotheses.</p>
      </header>

      <Caution tone="full" />

      <details className="score-note">
        <summary>How the score is built</summary>
        <p><span className="num">0.35</span> × persistence (mentions in both texts, capped at 6) + <span className="num">0.25</span> × chemistry (log LOTUS constituents) + <span className="num">0.40</span> × gap (few papers, and fewer than the plant’s own research volume predicts). Weights are a transparent heuristic, not fitted. Safety and IUCN status are shown as flags and never folded into the score. At most two leads per plant and four per indication. <a href={href("/methods", null, "leads")}>Full method</a>.</p>
      </details>

      <form className="filters" role="search" aria-label="Filter leads" onSubmit={(e) => { e.preventDefault(); set("q", draft.trim() || null); }}>
        <div className="field field--grow">
          <label htmlFor="lq">Plant or indication</label>
          <input id="lq" type="search" autoComplete="off" spellCheck={false} value={draft} onChange={(e) => { setDraft(e.target.value); set("q", e.target.value.trim() || null); }} placeholder="rue, πήγανον, eye" />
        </div>
        <div className="field">
          <label htmlFor="lcat">Category</label>
          <select id="lcat" value={cat} onChange={(e) => set("cat", e.target.value || null)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="liucn">IUCN</label>
          <select id="liucn" value={iucn} onChange={(e) => set("iucn", e.target.value || null)}>
            <option value="">Any status</option>
            <option value="assessed">Assessed only</option>
            <option value="nothreat">Hide threatened</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="lsort">Sort by</label>
          <select id="lsort" value={sort} onChange={(e) => set("sort", e.target.value === "rank" ? null : e.target.value)}>
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </form>

      <div className="certainty">
        <div className="certainty-ctl">
          <label htmlFor="lw">Weight the ranking by identification certainty</label>
          <div className="certainty-row">
            <span className="muted">Off</span>
            <input id="lw" type="range" min={0} max={1} step={0.25} value={alpha}
              aria-valuetext={alpha === 0 ? "Off: the published ranking" : `${Math.round(alpha * 100)}% weight`}
              onChange={(e) => set("w", Number(e.target.value) ? e.target.value : null)} />
            <span className="muted">Full</span>
            <span className="certainty-val num">{alpha === 0 ? "Off" : `${Math.round(alpha * 100)}%`}</span>
          </div>
          <label className="check"><input type="checkbox" checked={safety === "0"} onChange={(e) => set("safety", e.target.checked ? "0" : null)} /><span>Hide plants the herbals themselves warn about</span></label>
        </div>
        <p className="certainty-note" aria-live="polite">
          Each lead takes the weaker of its two identifications: high <b>1.0</b>, medium <b>0.6</b>, low <b>0.3</b>{cert.fromExtra ? ", genus-only capped at 0.5" : ", × 0.6 if only the genus is known"}. 
          Score × weight<sup>{alpha === 0 ? "0" : alpha}</sup>.{" "}
          {alpha === 0 ? <>This is the published ranking; slide to see how much it rests on uncertain names.</> : <><b>{moved}</b> of {all.length} leads move more than two places; Kendall’s τ against the published ranking is <b className="num">{fmt.two(tau)}</b> (1 = identical).</>}
          {cert.summary?.tauAll != null && <> Re-ranking all <span className="num">{fmt.int(cert.summary.nAll)}</span> candidates at full weight keeps <b className="num">{fmt.int(cert.summary.kept)}</b> of the published 60 in the top 60 (τ<sub>b</sub> <span className="num">{fmt.two(cert.summary.tauAll)}</span>){cert.summary.firstLeft ? <>; lead 1, rue, drops out, because Dioscorides’ <span lang="grc" className="grc">πήγανον</span> is identified with medium confidence only (it could be <i>Ruta chalepensis</i>)</> : null}.</>}
        </p>
      </div>

      {leads.status === "loading" && <Skeleton rows={10} label="Reading the leads" />}
      {leads.status === "error" && <ErrorState what="The leads" error={leads.error} retry={leads.retry} />}
      {leads.status === "ready" && (
        <>
          <div className="result-bar">
            <p className="result-count" role="status" aria-live="polite">{plural(shown.length, "lead")}{shown.length !== all.length ? ` of ${fmt.int(all.length)}` : ""}</p>
            <button type="button" className="btn btn--line btn--small" onClick={exportCSV} disabled={!shown.length}>Export {fmt.int(shown.length)} as CSV</button>
          </div>
          {shown.length === 0 ? (
            <Empty title="No lead matches these filters." action={<button type="button" className="btn btn--line" onClick={() => { setDraft(""); replaceParams("/leads", new URLSearchParams()); }}>Clear the filters</button>} />
          ) : (
            <ol className="leads">
              {shown.slice(0, limit).map((l) => {
                const p = plants.get(l.taxon);
                const im = imgs.byTaxon.get(l.taxon)?.[0];
                const label = l.label || cmap.get(l.concept_id)?.l || l.concept_id;
                const dr = dscRef(l.dsc_ref);
                const threatened = !!(l.flag_threatened || (l.iucn && THREATENED.has(l.iucn.toUpperCase())));
                return (
                  <li key={`${l.taxon}|${l.concept_id}`} className="lead">
                    <div className="lead-id">
                      <p className="lead-rank num" aria-label={`Position ${position.get(l)}, published rank ${l.rank}`}>{position.get(l)}{position.get(l) !== l.rank && <span className={`rank-move ${(position.get(l) ?? 0) < (l.rank ?? 0) ? "is-up" : "is-down"}`}>was {l.rank}</span>}</p>
                      <div className="lead-name">
                        <h2 className="lead-title">{p ? <a href={href(`/plant/${p.s}`, { c: l.concept_id })}><i>{l.taxon}</i></a> : <i>{l.taxon}</i>}</h2>
                        <p className="lead-concept">{label}</p>
                        <p className="lead-common">{[p?.c, p?.g[0]].filter(Boolean).map((x, i) => i === 1 ? <span key={i} lang="grc" className="grc">{x}</span> : <span key={i}>{x}</span>).reduce<React.ReactNode[]>((a, x, i) => (i ? [...a, " · ", x] : [x]), [])}</p>
                        <ul className="flags" aria-label="Flags">
                          {l.flag_historical_safety && <li className="flag flag--warn" title="The herbals themselves record a warning about this plant">Historical warning</li>}
                          {threatened ? <li className="flag flag--warn">Threatened (IUCN)</li> : <li className="flag"><Iucn code={l.iucn} /></li>}
                          {cert.meta.get(l.rank ?? -1) && <li className="flag flag--conf" title="Identification confidence: Dioscorides name / Culpeper name">ID {CONF_LABEL[cert.meta.get(l.rank ?? -1)!.dsc_conf ?? ""] ?? "n/a"} / {CONF_LABEL[cert.meta.get(l.rank ?? -1)!.cul_conf ?? ""] ?? "n/a"}</li>}
                        </ul>
                        <a className="lead-dossier-link" href={href(`/lead/${l.rank}`)}>Lead dossier</a>
                      </div>
                      {im && <img className="lead-thumb" src={smallest(im, 0)} alt="" width={64} height={Math.round((64 * im.height) / im.width)} loading="lazy" decoding="async" style={{ backgroundColor: im.color }} />}
                    </div>
                    <div className="lead-quotes">
                      {l.dsc_quote && (
                        <blockquote className="quote quote--dsc" lang="grc">
                          <p>{cleanQuote(l.dsc_quote)}</p>
                          <footer><span className="mark-swatch mark-swatch--dsc" aria-hidden="true" />Dioscorides{dr ? ` ${dr.book}.${dr.chapter}` : ""}</footer>
                        </blockquote>
                      )}
                      {l.cul_quote && (
                        <blockquote className="quote quote--cul">
                          <p>{cleanQuote(l.cul_quote)}</p>
                          <footer><span className="mark-swatch mark-swatch--cul" aria-hidden="true" />Culpeper, 1653</footer>
                        </blockquote>
                      )}
                    </div>
                    <dl className="lead-facts">
                      <div><dt>Score</dt><dd><span className="num">{fmt.two(l.score)}</span><Meter value={l.score} max={maxScore} label={`Score ${fmt.two(l.score)} of ${fmt.two(maxScore)}`} /></dd></div>
                      <div><dt>Papers on the pair</dt><dd className="num">{fmt.int(l.epmc_pair)}</dd></div>
                      <div><dt>Papers on the plant</dt><dd className="num">{fmt.int(l.epmc_taxon)}</dd></div>
                      <div><dt>Known constituents</dt><dd className="num">{fmt.int(l.n_compounds)}</dd></div>
                      <div><dt>Mentions</dt><dd className="num">{mentions(l) || "n/a"}</dd></div>
                    </dl>
                  </li>
                );
              })}
            </ol>
          )}
          {shown.length > limit && (
            <div className="more-row">
              <button type="button" className="btn btn--line" onClick={() => setLimit((n) => n + STEP * 2)}>Show {Math.min(STEP * 2, shown.length - limit)} more</button>
              <span className="muted">{fmt.int(limit)} of {fmt.int(shown.length)} shown</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
