import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { asArray, fold, indexPlants, TIER_LABEL, TIERS, useResource, type Concept, type Plant, type PlantIndex, type Tier } from "../lib/data";
import { href, replaceParams, type Route } from "../lib/router";
import { fmt, plural } from "../lib/format";
import { Empty, ErrorState, Skeleton, TierStack } from "../components/ui";

type Sort = "lead" | "name" | "persistent" | "papers";
const SORTS: { id: Sort; label: string }[] = [
  { id: "lead", label: "Lead score" },
  { id: "persistent", label: "Persistent claims" },
  { id: "papers", label: "Papers on the plant" },
  { id: "name", label: "Latin name" },
];
const PAGE = 60;


export function Plants({ route }: { route: Route }) {
  const plants = useResource<Plant[]>("plants.json");
  const concepts = useResource<Concept[]>("concepts.json");
  const params = route.params;
  const q = params.get("q") ?? "";
  const cat = params.get("cat") ?? "";
  const tier = (params.get("tier") ?? "") as Tier | "";
  const persistentOnly = params.get("persistent") === "1";
  const sort = (SORTS.find((s) => s.id === params.get("sort"))?.id ?? "lead") as Sort;
  const [draft, setDraft] = useState(q);
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => { setDraft(q); }, [q]);
  const deferred = useDeferredValue(draft);

  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    replaceParams("/plants", next);
    setLimit(PAGE);
  };

  useEffect(() => {
    const t = window.setTimeout(() => { if (draft !== q) set("q", draft.trim() || null); }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const cs = asArray<Concept>(concepts.data);
  const settled = concepts.status !== "loading";
  const index = useMemo(() => (plants.status === "ready" && settled ? indexPlants(asArray<Plant>(plants.data), cs) : null), [plants.status, plants.data, cs, settled]);
  const categories = useMemo(() => [...new Set(cs.map((c) => c.category).filter((x): x is string => !!x))].sort(), [cs]);

  const results = useMemo(() => {
    if (!index) return [];
    const terms = fold(deferred).split(/\s+/).filter(Boolean);
    const out = index.list.filter((p) => {
      if (terms.length && !terms.every((t) => p.haystack.includes(t))) return false;
      if (cat && !p.categories.has(cat)) return false;
      if (tier && !p.tiers.has(tier)) return false;
      if (persistentOnly && p.nPersistent === 0) return false;
      return true;
    });
    const by: Record<Sort, (a: PlantIndex, b: PlantIndex) => number> = {
      lead: (a, b) => (b.plant.lead_score ?? -1) - (a.plant.lead_score ?? -1) || b.nPersistent - a.nPersistent,
      persistent: (a, b) => b.nPersistent - a.nPersistent || b.nClaims - a.nClaims,
      papers: (a, b) => (b.plant.epmc_total ?? -1) - (a.plant.epmc_total ?? -1),
      name: (a, b) => a.plant.taxon.localeCompare(b.plant.taxon),
    };
    return out.sort((a, b) => by[sort](a, b) || a.plant.taxon.localeCompare(b.plant.taxon));
  }, [index, deferred, cat, tier, persistentOnly, sort]);

  const filtered = !!(q || cat || tier || persistentOnly);
  const clear = () => { setDraft(""); replaceParams("/plants", new URLSearchParams(sort !== "lead" ? { sort } : {})); };

  return (
    <div className="container page">
      <header className="page-head">
        <h1 id="page-title" tabIndex={-1}>Plants</h1>
        <p className="page-lede">
          {index ? <>{plural(index.list.length, "accepted taxon", "accepted taxa")}, each traced from its Greek or English name to a binomial.</> : "Every accepted taxon, traced from its Greek or English name to a binomial."}
        </p>
      </header>

      <form className="filters" role="search" onSubmit={(e) => { e.preventDefault(); set("q", draft.trim() || null); }}>
        <div className="field field--grow">
          <label htmlFor="pq">Search</label>
          <input id="pq" name="q" type="search" autoComplete="off" spellCheck={false} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="ἀψινθιον, wormwood, Artemisia" />
        </div>
        <div className="field">
          <label htmlFor="pcat">Category</label>
          <select id="pcat" value={cat} onChange={(e) => set("cat", e.target.value || null)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ptier">Evidence tier</label>
          <select id="ptier" value={tier} onChange={(e) => set("tier", e.target.value || null)}>
            <option value="">Any tier</option>
            {TIERS.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="psort">Sort by</label>
          <select id="psort" value={sort} onChange={(e) => set("sort", e.target.value === "lead" ? null : e.target.value)}>
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <label className="check">
          <input type="checkbox" checked={persistentOnly} onChange={(e) => set("persistent", e.target.checked ? "1" : null)} />
          <span>Persistent claims only</span>
        </label>
      </form>

      {(plants.status === "loading" || (plants.status === "ready" && !index)) && <Skeleton rows={10} label="Reading plants.json" />}
      {plants.status === "error" && <ErrorState what="The plant list" error={plants.error} retry={plants.retry} />}
      {index && (
        <>
          <p className="result-count" role="status" aria-live="polite">
            {filtered ? `${plural(results.length, "plant")} match` : `${plural(results.length, "plant")}`}
            {filtered && <button type="button" className="linkish" onClick={clear}>Clear filters</button>}
          </p>
          {results.length === 0 ? (
            <Empty title={q ? `No plant matches “${q}”.` : "No plant matches these filters."} action={<button type="button" className="btn btn--quiet" onClick={clear}>Clear the filters</button>}>
              Greek works with or without accents; Latin binomials and Culpeper’s English names both count.
            </Empty>
          ) : (
            <>
              <table className="ledger plant-table">
                <caption className="visually-hidden">Plants, sorted by {SORTS.find((s) => s.id === sort)?.label.toLowerCase()}</caption>
                <thead>
                  <tr>
                    <th scope="col">Plant</th>
                    <th scope="col">Dioscorides</th>
                    <th scope="col">Culpeper</th>
                    <th scope="col" className="num">Persistent</th>
                    <th scope="col" className="num">Papers</th>
                    <th scope="col">Claims by evidence tier</th>
                  </tr>
                </thead>
                <tbody>
                  {results.slice(0, limit).map((p) => (
                    <tr key={p.slug}>
                      <th scope="row" className="cell-plant">
                        <a className="row-link" href={href(`/plant/${p.slug}`)}><i>{p.plant.taxon}</i></a>
                        <span className="cell-sub">{[p.plant.common_name, p.plant.family].filter(Boolean).join(", ")}</span>
                      </th>
                      <td data-label="Dioscorides">{p.dscName?.name ? <span lang="grc" className="grc">{p.dscName.name}</span> : <span className="muted">Not in Dioscorides</span>}</td>
                      <td data-label="Culpeper">{p.culName?.name ?? <span className="muted">Not in Culpeper</span>}</td>
                      <td data-label="Persistent" className="num">{p.nPersistent} <span className="muted">of {p.nClaims}</span></td>
                      <td data-label="Papers" className="num">{fmt.compact(p.plant.epmc_total)}</td>
                      <td data-label="Claims by tier"><TierStack counts={p.tierCounts} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {results.length > limit && (
                <div className="more-row">
                  <button type="button" className="btn btn--quiet" onClick={() => setLimit((l) => l + PAGE * 2)}>Show {Math.min(PAGE * 2, results.length - limit)} more</button>
                  <span className="muted">{fmt.int(limit)} of {fmt.int(results.length)} shown</span>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
