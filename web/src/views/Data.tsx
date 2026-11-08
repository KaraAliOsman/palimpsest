import { assetUrl, dataUrl, useResource, type Summary } from "../lib/data";
import { href } from "../lib/router";
import { fmt } from "../lib/format";
import { SITE } from "../lib/export";
import { CopyButton, Ext, Skeleton } from "../components/ui";

interface ManifestFile { id: string; path: string; what: string; format: string; bytes: number | null; rows: number | null; columns: string[] | null }

function size(b: number | null | undefined): string {
  if (b == null) return "n/a";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

const LICENCE: Record<string, string> = {
  "kg-nodes": "CC BY-SA 4.0", "kg-edges": "CC BY-SA 4.0", "kg-graphml": "CC BY-SA 4.0", claims: "CC BY-SA 4.0",
  pairs: "CC BY 4.0", leads: "CC BY-SA 4.0", "leads-all": "CC BY 4.0", compounds: "CC0 (Wikidata)", taxa: "CC BY 4.0", stats: "CC BY 4.0", "extraction-eval": "CC BY 4.0",
};

const API = [
  ["summary.json", "Counts, headline results, extraction and naming evaluation"],
  ["plants.json", "One entry per accepted taxon: names, claims, evidence, constituents, IUCN"],
  ["concepts.json", "The 85 indication concepts with MeSH identifiers"],
  ["texts.json", "Greek chapters and Culpeper sections with every claim’s character span"],
  ["leads.json", "The 60 ranked leads with quotations from both herbals"],
  ["stats.json", "Inputs for every chart on the Findings page"],
  ["graph.json", "Knowledge-graph excerpt for the explorer"],
  ["derived/search.json", "Compact index: one row per taxon and per concept"],
  ["derived/records/artemisia-absinthium.json", "One plant with only its own texts (one file per taxon)"],
  ["derived/geo/index.json", "Geography: what each geo file holds, match rate, licences, citations"],
  ["derived/geo/taxa/ruta-graveolens.json", "One plant’s native and introduced range (WCVP), a plain sentence and its GBIF grid"],
  ["derived/geo/ranges.json", "Every taxon’s native and introduced botanical countries in one file"],
  ["derived/geo/overview.json", "Per botanical country: species of each herbal native there, top plants, the insights"],
  ["derived/geo/regions.topo.json", "Botanical-country units drawn from Natural Earth, as TopoJSON (lon/lat, simplified)"],
];

interface GeoIndex { match?: { taxa: number; matched: number; species: number; species_matched: number; by_method: Record<string, number>; unmatched: string[] } }

export function Data() {
  const manifest = useResource<{ files: ManifestFile[] }>("derived/manifest.json");
  const summary = useResource<Summary>("summary.json");
  const geo = useResource<GeoIndex>("derived/geo/index.json");
  const gm = geo.data?.match;
  const rows = (id: string) => manifest.data?.files.find((f) => f.id === id)?.rows ?? null;
  const nodes = rows("kg-nodes"), edges = rows("kg-edges");
  const bib = `@misc{palimpsest2026,
  title  = {Palimpsest: reading 2,000 years of European materia medica against modern evidence},
  author = {{Palimpsest team}},
  year   = {2026},
  note   = {EthnoHack 2026, Track 1. Data exported ${summary.data?.generated?.slice(0, 10) ?? "2026-11-08"}},
  url    = {${SITE.repo}}
}`;
  const plain = `Palimpsest: reading 2,000 years of European materia medica against modern evidence. EthnoHack 2026. ${SITE.repo}`;
  const repro = `git clone ${SITE.repo} && cd palimpsest
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
export PYTHONPATH=src
python -m palimpsest corpus extract evaluate   # offline, about 10 s
python -m palimpsest all                        # full pipeline with cached API calls
python -m pytest -m "not network"`;

  return (
    <div className="wrap page data-page">
      <header className="page-head">
        <h1 id="page-title" tabIndex={-1}>Data and API</h1>
        <p className="page-lede">Everything behind the explorer is open: the knowledge graph{nodes && edges ? <> of <span className="num">{fmt.int(nodes)}</span> nodes and <span className="num">{fmt.int(edges)}</span> edges</> : null}, every claim with its span, the evidence pairs and the leads. Download, cite, rerun.</p>
      </header>

      <section aria-labelledby="dl-title" className="block">
        <h2 id="dl-title" className="sec-title">Downloads</h2>
        <p className="sec-lede">Files are served from the repository’s <code>main</code> branch on GitHub. Greek-derived text and spans are CC BY-SA 4.0, as the source edition requires.</p>
        {manifest.status === "loading" && <Skeleton rows={6} label="Reading the manifest" />}
        {manifest.status === "ready" && (
          <div className="table-scroll">
            <table className="canon-table dl-table">
              <caption className="visually-hidden">Downloadable files with size, format and licence</caption>
              <thead><tr><th scope="col">File</th><th scope="col">Contents</th><th scope="col" className="num">Rows</th><th scope="col" className="num">Size</th><th scope="col">Licence</th></tr></thead>
              <tbody>
                {manifest.data.files.map((f) => (
                  <tr key={f.id}>
                    <th scope="row"><a href={`${SITE.raw}${f.path}`} download className="dl-link"><code>{f.path.split("/").pop()}</code></a><span className="cell-sub">{f.format} · <code>{f.path}</code></span></th>
                    <td data-label="Contents">{f.what}{f.columns && <details className="cols"><summary>{f.columns.length} columns</summary><p><code>{f.columns.join(", ")}</code></p></details>}</td>
                    <td className="num" data-label="Rows">{fmt.int(f.rows, "")}</td>
                    <td className="num" data-label="Size">{size(f.bytes)}</td>
                    <td data-label="Licence">{LICENCE[f.id] ?? "CC BY 4.0"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="api-title" className="block">
        <h2 id="api-title" className="sec-title">A static JSON API</h2>
        <p className="sec-lede">The explorer reads plain JSON files beside this page; scripts can read them too. No key, no rate limit. The contract is documented in <Ext href={`${SITE.repo}/blob/main/docs/WEB_DATA.md`}>docs/WEB_DATA.md</Ext>.</p>
        <ul className="api-list">
          {API.map(([f, what]) => (
            <li key={f}><a href={dataUrl(f)}><code>data/{f}</code></a><span>{what}</span></li>
          ))}
          <li><a href={assetUrl("img/credits.json")}><code>img/credits.json</code></a><span>Every image: source, licence, and how it was matched to a plant</span></li>
        </ul>
        <pre className="code"><code>{`curl -s ${SITE.url}data/derived/records/ruta-graveolens.json | jq '.plant.claims[] | select(.persistent)'`}</code></pre>
      </section>

      <section aria-labelledby="geo-data-title" className="block" id="geo">
        <h2 id="geo-data-title" className="sec-title">Geography</h2>
        <p className="sec-lede">Native and introduced ranges come from Kew’s World Checklist of Vascular Plants, at the level of the 369 TDWG “botanical countries”; recorded occurrences come from GBIF. Built by <code>scripts/geo_regions.py</code>, <code>geo_wcvp.py</code>, <code>geo_gbif.py</code> and <code>geo_insights.py</code>; tables in <code>data/processed/geo/</code>.</p>
        <dl className="lic geo-method">
          <div><dt>Matching</dt><dd>{gm ? <><span className="num">{fmt.int(gm.matched)}</span> of <span className="num">{fmt.int(gm.taxa)}</span> taxa matched ({fmt.pct(gm.matched / gm.taxa)}); species <span className="num">{fmt.int(gm.species_matched)}</span> of <span className="num">{fmt.int(gm.species)}</span> ({fmt.pct(gm.species_matched / gm.species)}). </> : null}Our GBIF accepted binomial is looked up as an accepted WCVP name, then as a WCVP synonym (homotypic first), then through GBIF synonyms; spelling-only differences (Iris × germanica, Atropa bella-donna) are folded. Genus-rank identifications map the union of their accepted species and are never counted.{gm?.unmatched.length ? <> Unmatched, because WCVP covers vascular plants only: {gm.unmatched.map((t, i) => <span key={t}>{i ? ", " : ""}<i>{t}</i></span>)}.</> : null}</dd></div>
          <div><dt>Native</dt><dd>A WCVP distribution row with introduced = 0 that is neither extinct nor doubtful. A botanical country with both a native and an introduced row counts as native.</dd></div>
          <div><dt>Herbal counts</dt><dd>A species is Dioscorides’ if any of his chapters is identified as it, Culpeper’s likewise; it counts once in every botanical country where it is native. The eastern Mediterranean is GRC, KRI, EAI, TUE, TUR, CYP, LBS, PAL and EGY; Britain is GRB.</dd></div>
          <div><dt>Occurrences</dt><dd>GBIF maps API density tiles (plate carrée, zoom 0) binned by GBIF into 2.8125° squares; each square keeps its centre and record count. Records include cultivated and introduced plants and follow where people collect.</dd></div>
          <div><dt>Boundaries</dt><dd>Boundaries: <Ext href="https://www.naturalearthdata.com/">Natural Earth</Ext> (public domain); botanical-country units after TDWG WGSRPD (Brummitt 2001), drawn approximately. Each Natural Earth 1:10m admin-1 unit (and each island of a multi-part unit) goes to the WGSRPD unit its interior point falls in, else to the one its ISO code maps to, else the nearest; units whose drawn extent overlaps WGSRPD’s by under 90% are marked approximate in tooltips. Two islets too small for admin-1 are dots. Crosswalk: <code>data/processed/geo/wgsrpd_ne_crosswalk.csv</code>.</dd></div>
          <div><dt>Licences</dt><dd>WCVP: Govaerts R (ed.). 2026. WCVP: World Checklist of Vascular Plants. Facilitated by the Royal Botanic Gardens, Kew. https://doi.org/10.34885/egs6-cp24 [accessed 04 Jun 2026], licensed under CC BY 3.0. GBIF occurrences CC BY 4.0. Natural Earth public domain.</dd></div>
        </dl>
        <pre className="code"><code>{`curl -s ${SITE.url}data/derived/geo/taxa/ruta-graveolens.json | jq '{summary, native, introduced}'`}</code></pre>
      </section>

      <div className="block two-col">
        <section aria-labelledby="cite-title">
          <h2 id="cite-title" className="sec-title">How to cite</h2>
          <p className="cite-plain">{plain}</p>
          <pre className="code"><code>{bib}</code></pre>
          <div className="btn-row">
            <CopyButton text={plain} label="Copy citation" />
            <CopyButton text={bib} label="Copy BibTeX" done="BibTeX copied" />
          </div>
          <p className="fine">Plant pages have their own “Cite this record”. When quoting Greek, also credit the edition: Dioscorides, <i>De materia medica</i>, ed. M. Wellmann (Berlin, 1906–1914), digitised by Open Greek and Latin / First1KGreek, CC BY-SA 4.0.</p>
        </section>
        <section aria-labelledby="repro-title">
          <h2 id="repro-title" className="sec-title">Reproduce</h2>
          <p className="sec-lede">Every HTTP response is cached, so a second run is offline and deterministic. Literature counts grow over time; the numbers here were produced on {fmt.date(summary.data?.generated) ?? "8 November 2026"}.</p>
          <pre className="code"><code>{repro}</code></pre>
          <CopyButton text={repro} label="Copy commands" done="Commands copied" />
        </section>
      </div>

      <section aria-labelledby="lic-title" className="block">
        <h2 id="lic-title" className="sec-title">Licences</h2>
        <dl className="lic">
          <div><dt>Code</dt><dd>MIT</dd></div>
          <div><dt>Greek-derived data</dt><dd>CC BY-SA 4.0: texts, spans, claims, quotations and the graph that carries them (source: First1KGreek, CC BY-SA 4.0)</dd></div>
          <div><dt>Culpeper</dt><dd>Public domain (Project Gutenberg 49513)</dd></div>
          <div><dt>Curated tables and lexicons</dt><dd>CC BY 4.0</dd></div>
          <div><dt>Constituents</dt><dd>CC0 (Wikidata / LOTUS)</dd></div>
          <div><dt>Plant ranges</dt><dd>CC BY 3.0 (WCVP, Royal Botanic Gardens, Kew); occurrence grid CC BY 4.0 (GBIF)</dd></div>
          <div><dt>Images</dt><dd>Public domain; see <a href={href("/credits")}>credits</a></dd></div>
        </dl>
      </section>
    </div>
  );
}
