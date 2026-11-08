import { useMemo, useState } from "react";
import { asArray, cleanQuote, conceptLabel, conceptMap, fold, indexPlants, THREATENED, useResource, type Concept, type Lead, type Plant } from "../lib/data";
import { href, replaceParams, type Route } from "../lib/router";
import { fmt, plural } from "../lib/format";
import { Empty, ErrorState, Iucn, Meter, Skeleton } from "../components/ui";

const STEP = 25;

export function Leads({ route }: { route: Route }) {
  const leads = useResource<Lead[]>("leads.json");
  const concepts = useResource<Concept[]>("concepts.json");
  const plants = useResource<Plant[]>("plants.json");
  const cs = asArray<Concept>(concepts.data);
  const cmap = conceptMap(cs);
  const [limit, setLimit] = useState(STEP);
  const cat = route.params.get("cat") ?? "";
  const hideThreatened = route.params.get("threatened") === "0";
  const q = route.params.get("q") ?? "";
  const [draft, setDraft] = useState(q);

  const slugs = useMemo(() => {
    const m = new Map<string, { slug: string; common?: string | null; grc?: string }>();
    if (plants.status !== "ready" || concepts.status === "loading") return m;
    for (const p of indexPlants(asArray<Plant>(plants.data), cs).list) m.set(p.plant.taxon, { slug: p.slug, common: p.plant.common_name, grc: p.dscName?.name });
    return m;
  }, [plants.status, plants.data, cs, concepts.status]);

  const all = useMemo(() => asArray<Lead>(leads.data).filter((l) => l && l.taxon && l.concept_id).slice().sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || (b.score ?? 0) - (a.score ?? 0)), [leads.data]);
  const categories = useMemo(() => [...new Set(all.map((l) => cmap.get(l.concept_id)?.category).filter((x): x is string => !!x))].sort(), [all, cmap]);
  const shown = useMemo(() => {
    const t = fold(q);
    return all.filter((l) => {
      if (cat && cmap.get(l.concept_id)?.category !== cat) return false;
      if (hideThreatened && (l.flag_threatened || (l.iucn && THREATENED.has(l.iucn.toUpperCase())))) return false;
      if (t) {
        const s = slugs.get(l.taxon);
        if (!fold([l.taxon, s?.common, s?.grc, conceptLabel(cmap, l.concept_id)].filter(Boolean).join(" ")).includes(t)) return false;
      }
      return true;
    });
  }, [all, cat, hideThreatened, q, cmap, slugs]);

  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(route.params);
    if (v) next.set(k, v); else next.delete(k);
    replaceParams("/leads", next);
    setLimit(STEP);
  };
  const maxScore = Math.max(1e-9, ...all.map((l) => l.score ?? 0));

  return (
    <div className="container page">
      <header className="page-head">
        <h1 id="page-title" tabIndex={-1}>Leads</h1>
        <p className="page-lede">Plant and indication pairs that both herbals name and modern literature has barely touched, ranked as research hypotheses.</p>
      </header>

      <aside className="caution" role="note" aria-labelledby="caution-title">
        <p id="caution-title" className="caution-title">Computational hypotheses, not medical advice.</p>
        <p>A rank says two old books agree and few papers have looked. It says nothing about safety or dose, and many plants in these herbals, hemlock and henbane among them, are poisons the ancients knew well. Read the primary literature and consult a qualified professional.</p>
      </aside>

      <form className="filters" role="search" onSubmit={(e) => { e.preventDefault(); set("q", draft.trim() || null); }}>
        <div className="field field--grow">
          <label htmlFor="lq">Filter</label>
          <input id="lq" type="search" autoComplete="off" spellCheck={false} value={draft} onChange={(e) => { setDraft(e.target.value); set("q", e.target.value.trim() || null); }} placeholder="Plant or indication" />
        </div>
        <div className="field">
          <label htmlFor="lcat">Category</label>
          <select id="lcat" value={cat} onChange={(e) => set("cat", e.target.value || null)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <label className="check">
          <input type="checkbox" checked={hideThreatened} onChange={(e) => set("threatened", e.target.checked ? "0" : null)} />
          <span>Hide threatened species</span>
        </label>
      </form>

      {leads.status === "loading" && <Skeleton rows={10} label="Reading leads.json" />}
      {leads.status === "error" && <ErrorState what="The leads" error={leads.error} retry={leads.retry} />}
      {leads.status === "ready" && (
        <>
          <p className="result-count" role="status" aria-live="polite">{plural(shown.length, "lead")}{shown.length !== all.length ? ` of ${fmt.int(all.length)}` : ""}</p>
          {shown.length === 0 ? (
            <Empty title="No lead matches." action={<button type="button" className="btn btn--quiet" onClick={() => { setDraft(""); replaceParams("/leads", new URLSearchParams()); }}>Clear the filters</button>} />
          ) : (
            <ol className="leads">
              {shown.slice(0, limit).map((l) => {
                const s = slugs.get(l.taxon);
                const label = l.label || conceptLabel(cmap, l.concept_id);
                return (
                  <li key={`${l.taxon}|${l.concept_id}`} className="lead-row">
                    <div className="lead-id">
                      <span className="lead-rank num">{l.rank ?? ""}</span>
                      <div>
                        <p className="lead-title">
                          {s ? <a href={href(`/plant/${s.slug}`, { c: l.concept_id })}><i>{l.taxon}</i></a> : <i>{l.taxon}</i>}
                        </p>
                        <p className="lead-concept">{label}{s?.common ? <span className="muted">, {s.common.toLowerCase()}</span> : null}</p>
                        {(l.flag_historical_safety || l.flag_threatened) && (
                          <p className="lead-flags">
                            {l.flag_historical_safety && <span className="flag">Historically toxic</span>}
                            {l.flag_threatened && <span className="flag">Threatened species</span>}
                          </p>
                        )}
                        <p className="lead-score"><span className="num">{fmt.two(l.score)}</span><Meter value={l.score} max={maxScore} label={`Score ${fmt.two(l.score)}`} /></p>
                      </div>
                    </div>
                    <div className="lead-quotes">
                      {l.dsc_quote && <blockquote className="quote quote--grc" lang="grc"><span className="quote-src"><span className="swatch swatch--dsc" aria-hidden="true" />Dioscorides{l.dsc_ref ? ` ${l.dsc_ref.replace(/^dsc:/, "")}` : ""}</span>{cleanQuote(l.dsc_quote)}</blockquote>}
                      {l.cul_quote && <blockquote className="quote quote--en"><span className="quote-src"><span className="swatch swatch--cul" aria-hidden="true" />Culpeper</span>{cleanQuote(l.cul_quote)}</blockquote>}
                      {l.why && <p className="lead-why">{l.why}</p>}
                    </div>
                    <dl className="lead-facts">
                      <div><dt>Papers on the pair</dt><dd className="num">{fmt.int(l.epmc_pair)}</dd></div>
                      {l.epmc_taxon != null && <div><dt>Papers on the plant</dt><dd className="num">{fmt.int(l.epmc_taxon)}</dd></div>}
                      <div><dt>Known compounds</dt><dd className="num">{fmt.int(l.n_compounds)}</dd></div>
                      <div><dt>IUCN</dt><dd><Iucn code={l.iucn} /></dd></div>
                    </dl>
                  </li>
                );
              })}
            </ol>
          )}
          {shown.length > limit && (
            <div className="more-row">
              <button type="button" className="btn btn--quiet" onClick={() => setLimit((n) => n + STEP)}>Show {Math.min(STEP, shown.length - limit)} more</button>
              <span className="muted">{fmt.int(limit)} of {fmt.int(shown.length)} shown</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
