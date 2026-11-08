import { useResource, type Summary } from "../lib/data";
import { fmt } from "../lib/format";
import { Ext } from "../components/ui";

const STAGES = [
  { name: "Problem", text: "Did plant remedies survive sixteen centuries of copying, and does modern science back the survivors?" },
  { name: "Data", text: "Dioscorides in Greek and Culpeper in English, joined to literature, trials, phytochemistry and biodiversity records." },
  { name: "Method", text: "Names chained to accepted binomials, indications mapped to MeSH, persistence tested against permutation nulls." },
  { name: "Prototype", text: "The palimpsest pipeline, rerun offline from cached API responses, and this static explorer." },
  { name: "Results", text: "Agreement beyond chance, literature lift by claim group, and a ranked list of under-studied pairs." },
  { name: "Impact", text: "Sourced, checkable hypotheses for pharmacognosy, and a method other herbals can reuse." },
];

const SOURCES: { name: string; url: string; use: string; licence: string }[] = [
  { name: "First1KGreek: Dioscorides, De materia medica", url: "https://scaife.perseus.org/library/urn:cts:greekLit:tlg0656.tlg001/", use: "Greek text, chapter by chapter (tlg0656.tlg001.1st1K-grc1)", licence: "CC BY-SA 4.0" },
  { name: "Project Gutenberg 49513: Culpeper, The Complete Herbal", url: "https://www.gutenberg.org/ebooks/49513", use: "English text; the Government and virtues sections", licence: "Public domain in the USA" },
  { name: "Europe PMC", url: "https://europepmc.org/RestfulWebService", use: "Paper counts per plant and per plant-indication pair", licence: "Open API; counts only, no article text stored" },
  { name: "ClinicalTrials.gov", url: "https://clinicaltrials.gov/data-api/api", use: "Registered trials per plant", licence: "US government public data" },
  { name: "Wikidata and LOTUS", url: "https://www.wikidata.org/", use: "Compounds found in each taxon, identifiers, Greek names", licence: "CC0" },
  { name: "GBIF", url: "https://www.gbif.org/", use: "Accepted names, occurrences, vernacular names, IUCN category", licence: "Backbone CC BY 4.0; occurrences per dataset" },
  { name: "MeSH", url: "https://meshb.nlm.nih.gov/", use: "Identifiers for indication concepts", licence: "US National Library of Medicine terms" },
];

export function Methods() {
  const summary = useResource<Summary>("summary.json");
  const ev = summary.data?.extraction_eval ?? {};
  return (
    <div className="container page methods">
      <header className="page-head">
        <h1 id="page-title" tabIndex={-1}>Methods and limitations</h1>
        <p className="page-lede">How a sentence in a first-century Greek manuscript becomes a ranked research hypothesis, and where the chain can break.</p>
      </header>

      <section aria-labelledby="pipe-title" className="block">
        <h2 id="pipe-title">The pipeline</h2>
        <ol className="pipeline" aria-label="Pipeline, six stages">
          {STAGES.map((s, i) => (
            <li key={s.name} className="stage">
              <span className="stage-n num" aria-hidden="true">{i + 1}</span>
              <p className="stage-name">{s.name}</p>
              <p className="stage-text">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="src-title" className="block">
        <h2 id="src-title">Sources and licences</h2>
        <table className="ledger sources">
          <caption className="visually-hidden">Data sources, what each is used for, and its licence</caption>
          <thead><tr><th scope="col">Source</th><th scope="col">Used for</th><th scope="col">Licence</th></tr></thead>
          <tbody>
            {SOURCES.map((s) => (
              <tr key={s.name}>
                <th scope="row"><Ext href={s.url}>{s.name}</Ext></th>
                <td data-label="Used for">{s.use}</td>
                <td data-label="Licence">{s.licence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="split split--even block">
        <section aria-labelledby="resp-title">
          <h2 id="resp-title">Responsible research</h2>
          <div className="prose">
            <p>Palimpsest reads two published historical texts that have been in print for centuries. It collects no traditional knowledge from living communities, interviews no one and holds no personal data.</p>
            <p>Every ranked pair is a computational hypothesis for reading and laboratory work, never a recommendation to take a plant. Several of the plants are lethal.</p>
            <p>Texts keep their licences: the Greek edition is shared under CC BY-SA 4.0, and the explorer links back to each chapter.</p>
          </div>
        </section>
        <section aria-labelledby="lim-title">
          <h2 id="lim-title">Limitations</h2>
          <ul className="limits">
            <li><strong>Ancient names are uncertain.</strong> One Greek name can cover several modern species; every link carries a confidence level.</li>
            <li><strong>Agreement can be copying.</strong> Culpeper often cites Dioscorides by name, so persistence may be transmission rather than independent observation.</li>
            <li><strong>Papers measure attention, not efficacy.</strong> Famous plants attract literature whatever their merit; lift and the regression adjust for it only in part.</li>
            <li><strong>Lexicons miss paraphrase.</strong> Extraction F1 is {fmt.two(ev.dioscorides?.f1)} for the Greek and {fmt.two(ev.culpeper?.f1)} for the English on the hand-annotated sample.</li>
            <li><strong>Humoral language maps loosely.</strong> Choler, melancholy and the falling sickness only approximate their MeSH concepts.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
