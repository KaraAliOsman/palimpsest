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
];

export function Data() {
  const manifest = useResource<{ files: ManifestFile[] }>("derived/manifest.json");
  const summary = useResource<Summary>("summary.json");
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
          <div><dt>Images</dt><dd>Public domain; see <a href={href("/credits")}>credits</a></dd></div>
        </dl>
      </section>
    </div>
  );
}
