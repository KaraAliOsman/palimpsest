import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { fold, TIER_LABEL, TIERS, useResource, type SearchIndex, type SearchPlant, type Tier } from "../lib/data";
import { href, replaceParams, type Route } from "../lib/router";
import { fmt, plural } from "../lib/format";
import { download, toCSV } from "../lib/export";
import { smallest, useImages } from "../lib/images";
import { Arch, Empty, ErrorState, Skeleton, TierStack } from "../components/ui";

type Sort = "lead" | "name" | "persistent" | "papers" | "claims";
const SORTS: { id: Sort; label: string }[] = [
  { id: "lead", label: "Lead rank, then score" },
  { id: "persistent", label: "Claims in both herbals" },
  { id: "claims", label: "All claims" },
  { id: "papers", label: "Papers on the plant" },
  { id: "name", label: "Latin name" },
];
const PAGE = 60;
const T_INDEX: Record<Tier, number> = { unstudied: 0, sparse: 1, studied: 2 };

export function Plants({ route }: { route: Route }) {
  const index = useResource<SearchIndex>("derived/search.json");
  const imgs = useImages();
  const params = route.params;
  const q = params.get("q") ?? "";
  const cat = params.get("cat") ?? "";
  const concept = params.get("c") ?? "";
  const tier = (params.get("tier") ?? "") as Tier | "";
  const persistentOnly = params.get("persistent") === "1";
  const folioOnly = params.get("folio") === "1";
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
    const t = window.setTimeout(() => { if (draft.trim() !== q) set("q", draft.trim() || null); }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const data = index.data;
  const concepts = data?.concepts ?? [];
  const cmap = useMemo(() => new Map(concepts.map((c) => [c.id, c])), [concepts]);
  const categories = useMemo(() => [...new Set(concepts.map((c) => c.cat).filter((x): x is string => !!x))].sort(), [concepts]);
  const hay = useMemo(() => new Map((data?.plants ?? []).map((p) => [p.s, fold([p.t, p.c, p.f, p.e, ...p.g].filter(Boolean).join(" | "))])), [data]);
  const hasFolio = useMemo(() => new Set(imgs.list.flatMap((i) => i.taxa)), [imgs.list]);

  const results = useMemo(() => {
    if (!data) return [];
    const terms = fold(deferred).split(/\s+/).filter(Boolean);
    const out = data.plants.filter((p) => {
      if (terms.length && !terms.every((t) => hay.get(p.s)!.includes(t))) return false;
      if (concept && !p.k.includes(concept)) return false;
      if (cat && !p.k.some((k) => cmap.get(k)?.cat === cat)) return false;
      if (tier && !(p.tc?.[T_INDEX[tier]] > 0)) return false;
      if (persistentOnly && p.p === 0) return false;
      if (folioOnly && !hasFolio.has(p.t)) return false;
      return true;
    });
    const by: Record<Sort, (a: SearchPlant, b: SearchPlant) => number> = {
      lead: (a, b) => (a.lr ?? 999) - (b.lr ?? 999) || (b.ls ?? -1) - (a.ls ?? -1) || b.p - a.p,
      persistent: (a, b) => b.p - a.p || b.n - a.n,
      claims: (a, b) => b.n - a.n,
      papers: (a, b) => (b.pe ?? -1) - (a.pe ?? -1),
      name: (a, b) => a.t.localeCompare(b.t),
    };
    return out.sort((a, b) => by[sort](a, b) || a.t.localeCompare(b.t));
  }, [data, deferred, hay, concept, cat, cmap, tier, persistentOnly, folioOnly, hasFolio, sort]);

  const filtered = !!(q || cat || tier || persistentOnly || concept || folioOnly);
  const clear = () => { setDraft(""); replaceParams("/plants", new URLSearchParams(sort !== "lead" ? { sort } : {})); };
  const exportCSV = () => download("palimpsest-plants.csv", toCSV(results, [
    { key: "taxon", get: (p) => p.t }, { key: "common_name", get: (p) => p.c }, { key: "family", get: (p) => p.f },
    { key: "dioscorides_names", get: (p) => p.g.join(" | ") }, { key: "culpeper_name", get: (p) => p.e },
    { key: "claims", get: (p) => p.n }, { key: "claims_in_both", get: (p) => p.p },
    { key: "unstudied", get: (p) => p.tc?.[0] }, { key: "sparse", get: (p) => p.tc?.[1] }, { key: "studied", get: (p) => p.tc?.[2] },
    { key: "europepmc_papers", get: (p) => p.pe }, { key: "iucn", get: (p) => p.iu }, { key: "lead_score", get: (p) => p.ls },
    { key: "url", get: (p) => `https://karaaliosman.github.io/palimpsest/#/plant/${p.s}` },
  ]), "text/csv");
  const conceptLabel = concept ? cmap.get(concept)?.l ?? concept : "";

  return (
    <div className="wrap page">
      <header className="page-head">
        <h1 id="page-title" tabIndex={-1}>{conceptLabel ? <>Plants for <span className="page-head-em">{conceptLabel.toLowerCase()}</span></> : "Index of plants"}</h1>
        <p className="page-lede">
          {data ? <>{plural(data.plants.length, "accepted taxon", "accepted taxa")}, each traced from a Greek lemma or an English heading to a binomial on the GBIF backbone.</> : "Every accepted taxon, traced from its Greek or English name to a binomial."}
        </p>
      </header>

      <form className="filters" role="search" aria-label="Filter plants" onSubmit={(e) => { e.preventDefault(); set("q", draft.trim() || null); }}>
        <div className="field field--grow">
          <label htmlFor="pq">Name</label>
          <input id="pq" name="q" type="search" autoComplete="off" spellCheck={false} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="ἀψινθιον, wormwood, Artemisia" />
        </div>
        <div className="field">
          <label htmlFor="pc">Indication</label>
          <select id="pc" value={concept} onChange={(e) => set("c", e.target.value || null)}>
            <option value="">Any indication</option>
            {concepts.slice().sort((a, b) => a.l.localeCompare(b.l)).map((c) => <option key={c.id} value={c.id}>{c.l}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pcat">Category</label>
          <select id="pcat" value={cat} onChange={(e) => set("cat", e.target.value || null)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ptier">Has a claim that is</label>
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
        <div className="checks">
          <label className="check"><input type="checkbox" checked={persistentOnly} onChange={(e) => set("persistent", e.target.checked ? "1" : null)} /><span>In both herbals</span></label>
          <label className="check"><input type="checkbox" checked={folioOnly} onChange={(e) => set("folio", e.target.checked ? "1" : null)} /><span>With a folio</span></label>
        </div>
      </form>

      {index.status === "loading" && <Skeleton rows={10} label="Opening the index" />}
      {index.status === "error" && <ErrorState what="The plant index" error={index.error} retry={index.retry} />}
      {data && (
        <>
          <div className="result-bar">
            <p className="result-count" role="status" aria-live="polite">
              {filtered ? `${plural(results.length, "plant")} match` : plural(results.length, "plant")}
              {filtered && <button type="button" className="linkish" onClick={clear}>Clear filters</button>}
            </p>
            <ul className="tier-legend" aria-label="Claims by tier">
              <li><span className="tierstack-seg tierstack-seg--unstudied" aria-hidden="true" />Unstudied</li>
              <li><span className="tierstack-seg tierstack-seg--sparse" aria-hidden="true" />Sparse</li>
              <li><span className="tierstack-seg tierstack-seg--studied" aria-hidden="true" />Studied</li>
            </ul>
            <button type="button" className="btn btn--line btn--small" onClick={exportCSV} disabled={!results.length}>Export {fmt.int(results.length)} as CSV</button>
          </div>
          {results.length === 0 ? (
            <Empty title={q ? `No plant matches “${q}”.` : "No plant matches these filters."} action={<button type="button" className="btn btn--line" onClick={clear}>Clear the filters</button>}>
              Greek works with or without accents; Latin binomials and Culpeper’s English names both count.
            </Empty>
          ) : (
            <>
              <div className="table-scroll">
                <table className="canon-table plant-table">
                  <caption className="visually-hidden">Plants, sorted by {SORTS.find((s) => s.id === sort)?.label.toLowerCase()}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Plant</th>
                      <th scope="col" className="th-arch"><Arch />Dioscorides</th>
                      <th scope="col" className="th-arch"><Arch />Culpeper</th>
                      <th scope="col" className="num">In both</th>
                      <th scope="col" className="num">Papers</th>
                      <th scope="col">Claims by tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.slice(0, limit).map((p) => {
                      const im = imgs.byTaxon.get(p.t)?.[0];
                      return (
                        <tr key={p.s}>
                          <th scope="row"><div className="cell-plant">
                            {im ? <img className="thumb" src={smallest(im, 0)} alt="" width={36} height={Math.round((36 * im.height) / im.width)} loading="lazy" decoding="async" style={{ backgroundColor: im.color }} /> : <span className="thumb thumb--none" aria-hidden="true" />}
                            <span>
                              <a className="row-link" href={href(`/plant/${p.s}`, concept ? { c: concept } : undefined)}><i>{p.t}</i></a>
                              <span className="cell-sub">{[p.c, p.f].filter(Boolean).join(" · ")}{p.lr ? <span className="persist-tag">lead {p.lr}</span> : null}</span>
                            </span>
                          </div></th>
                          <td data-label="Dioscorides">{p.g[0] ? <span lang="grc" className="grc">{p.g[0]}</span> : <span className="muted">not in Dioscorides</span>}</td>
                          <td data-label="Culpeper">{p.e ?? <span className="muted">not in Culpeper</span>}</td>
                          <td data-label="In both" className="num">{p.p} <span className="muted">of {p.n}</span></td>
                          <td data-label="Papers" className="num">{fmt.compact(p.pe)}</td>
                          <td data-label="Claims by tier">{p.tc ? <TierStack counts={{ unstudied: p.tc[0], sparse: p.tc[1], studied: p.tc[2] }} /> : null}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {results.length > limit && (
                <div className="more-row">
                  <button type="button" className="btn btn--line" onClick={() => setLimit((l) => l + PAGE * 2)}>Show {Math.min(PAGE * 2, results.length - limit)} more</button>
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
