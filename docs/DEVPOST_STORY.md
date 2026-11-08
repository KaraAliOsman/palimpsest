# Devpost story (paste into the Devpost template fields)

**Tagline:** Dioscorides in the original Greek and Culpeper's 1653 herbal, read word by word and tested against modern science — which claims survived, and which has science ignored?

## Inspiration
A palimpsest is a manuscript scraped and written over, yet the older text still shows through. European herbal medicine works the same way: Culpeper (1653) wrote over Galen, who wrote over Dioscorides (c. 60 CE). Historical herbals are routinely cited as sources of drug leads, but almost always through translations read by hand, without controls and with unverified plant names. We wanted to read the oldest layer in its own language and measure, rigorously, which claims survived sixteen centuries of copying — and whether modern science has really looked at them.

## What it does
Palimpsest is an open pipeline, knowledge graph, research explorer and MCP server built on two landmark herbals.
- **Reads the original Greek.** All 822 chapters of Dioscorides' *De materia medica* (Wellmann's edition) and 328 Culpeper monographs become 10,400 indication claims in 85 MeSH concepts, each kept with its exact words and character span. Extraction F1 is 0.86 in Greek and 0.90 in English against a blind reference annotation.
- **Maps names across eras.** Every Greek lemma and English heading resolves to an accepted species: 692 taxa. Against the expert identifications of Lardos et al. 2024, our species matches the experts' top choice in **70%** of chapters (81% for species-level identifications) and the genus in **91%**; a 30-plant staples check is 30/30.
- **Measures transmission.** Culpeper repeats Dioscorides' indication for the same plant **2.65×** more often than chance (642 vs 242 expected; p < 0.0001). It is still 2.1× when plants are matched by entry length, and 1.6× even within the same botanical family.
- **Screens the modern evidence** in 12,797 plant–indication pairs against 48.2 M Europe PMC records with matched same-plant controls. Remedies both herbals agree on are more often studied (**45% vs 32%**, OR 2.77). Once studied, though, they are not studied more (RR 1.04, n.s.): *science has looked, but not looked hard.* Searching under every synonym (rosemary: 211 → 2,179 papers) changes no conclusion.
- **Tests a prediction.** Among pairs that no paper had touched by 2010, those both herbals claim received their first paper afterwards more often (28.8% vs 19.6%; **OR 2.77**, p = 2e-9). This holds with 2005 and 2015 cut-offs and answers the "modern research just follows tradition" objection prospectively.
- **Ranks 60 research leads** (persistent, plausible, barely studied), each with both quotations, LOTUS constituents, mechanism paths (ChEMBL → targets), historical safety warnings and IUCN status. Leads are shown with and without uncertainty weighting. Rue for the eyes ranks first.
- **Shows where every plant grows:** native and introduced ranges from Kew's WCVP, GBIF records, and a rotating globe of where each herbal's plants are native. 80% of Dioscorides' plants are native to the eastern Mediterranean; 56% of Culpeper's are native to Britain, against 26% of Dioscorides'.
- **Is open and citable.** Every record can be cited and downloaded, and a knowledge graph of 20,425 nodes and 51,431 edges is published. An MCP server lets any AI assistant `trace_claim` from a Greek word to the papers behind it.

## How we built it
Python (pandas, SciPy, statsmodels, NetworkX) over TEI/XML from Open Greek and Latin (First1KGreek) and Project Gutenberg.
- **Extraction:** an offset-preserving Ancient-Greek normaliser and hand-built lexicons for Ancient Greek and 17th-century English.
- **Data sources:** cached, rate-limited clients for Europe PMC, ClinicalTrials.gov, GBIF, Wikidata/LOTUS (SPARQL), MeSH, ChEMBL and Kew WCVP; every response is cached, so a re-run is offline and deterministic.
- **Statistics:** permutation tests with size- and family-stratified nulls, logit and Poisson models with indication fixed effects and cluster-robust errors, cluster bootstrap, a synonym sensitivity analysis and a pseudo-prospective time-machine test.
- **Front end:** a React + TypeScript explorer, with hand-built SVG charts, a d3-geo globe and Natural Earth boundaries, deployed on GitHub Pages with CI. It uses 95 public-domain images from the Vienna Dioscurides (c. 512 CE) and early printed herbals.
- **MCP server:** a stdio server built with the official MCP Python SDK.
- **AI use:** plant-name curation and the blind reference annotation were AI-assisted (Claude). We disclose this, and every curated row carries a confidence level and a justification. The extraction itself is rule-based and reproducible. 85 automated tests pass.

## Challenges we ran into
- **A hidden quarter of Dioscorides.** The published TEI nests the later chapters of three books inside other chapters, hiding 199 of them; we repaired the parsing.
- **Ancient Greek morphology and obsolete medicine.** We needed stems and idioms immune to accents and inflection, and a crosswalk from *dropsy*, *king's evil* or *the whites* to MeSH.
- **Confounding.** Some plants and some diseases are simply studied more. Within-plant comparisons, indication fixed effects and matched controls deal with this. An internal review showed our first null was too lenient, so we report the stricter ones.
- **Trust in identifications.** We validated our identifications against independent experts rather than asking judges to trust them.
- **Circularity.** Modern research is partly motivated by tradition, so we added the time-machine test.
- **Licensing.** Every source carries a clean licence: we replaced boundary data that had none with public-domain Natural Earth.

## Accomplishments that we're proud of
- An automatic, evaluated extraction of therapeutic indications from Dioscorides' **original Greek**, mapped to MeSH, with every claim traceable to its characters.
- Identifications that agree with expert botanists (70% species, 91% genus).
- A robust, quantified measure of 1,600 years of knowledge transmission, which survives three stricter nulls.
- A positive pseudo-prospective result: the herbals predicted where research went next.
- Honest nulls published alongside the positives in a "tests we wrote down" ledger.
- A research-grade, open product: explorer, knowledge graph, distribution maps and an MCP server, all citable and reproducible.

## What we learned
- **Persistence is a real signal, but measuring it honestly takes strict nulls.**
- **Literature counts measure attention, not efficacy.** The most interesting finding is a gap: tradition predicts *whether* science looks, not *how hard*.
- **Philology and data science need each other.** Most errors were identification or segmentation problems, not modelling problems.

## What's next for Palimpsest
- Expert review of the name concordance with the ETHCSTWIN network, and a human double-annotated gold standard.
- The missing links of the chain: Pliny, Galen, Paul of Aegina and Arabic sources such as Ibn al-Bayṭār.
- Outcome-aware evidence (classifying abstracts as positive, negative or toxic), and laboratory follow-up of the top leads with natural-product chemists.
- An RDF release of the knowledge graph with MeSH, Wikidata and GBIF identifiers.

## Built with
python · pandas · statsmodels · scipy · networkx · react · typescript · vite · d3-geo · mcp · europe-pmc · gbif · wikidata · sparql · chembl · kew-wcvp · tei-xml · github-pages · hyperframes
