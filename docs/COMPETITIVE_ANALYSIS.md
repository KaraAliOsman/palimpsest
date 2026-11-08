# Competitive analysis: EthnoHack 2026 (written 2026-11-08)

Internal working document. Not for publication. We checked every claim below against the live
sites (built-in browser, 1440×900) and the repositories (`gh api`) on 2026-11-08, between
12:30 and 13:45 local time. Screenshots are in the session scratchpad under `competitors/`:
`pharmakon_*.jpg`, `ethnoharvest_*.jpg`, `materia_*.png`, and `palimpsest_full.png` for us.

**Verdict.** Four names, three projects: **EcoRoots is the repository behind EthnoHarvest**
(`backend/ethnoharvest/`, same README title). **Pharmakon** is a direct, dangerous rival. It
reads the same Greek text, opens on the same chapter (3.23, ἀψίνθιον), shows the same Vienna
Dioscurides folio, and two of its top leads are the same as ours. It is ahead of us on
presentation and on validating its plant identifications. Its data has visible errors we can
exploit. **EthnoHarvest** is a different problem (sustainable wild harvest). It is the most
impressive engineering in the field and competes with us for the overall prize, not on our
science. **Materia Incerta** runs on synthetic data only and is a low threat, though it has two
ideas worth taking.

---

## 1. Pharmakon (LSUDOKO/Pharmakon, pharmakon.adoranto737.workers.dev)

**Track.** EthnoHack 2026 Track 1, as stated on its README badge. Solo author (B.Tech CS, NIT
Hamirpur). Repo created 2026-11-07 09:18 UTC, v1.0.0 released 2026-11-08, about 56 MB.

**Problem.** Which plant each Dioscorides name means, with a probability. Which uses survived
through Galen, John the Physician and modern Greek villages. Whether history predicts what
science studied next. The output is "untested research leads".

**Data.**
- Texts: Dioscorides (Wellmann, First1KGreek) and Galen's *De simpl. med.* books 6–8.
- Reference data: LSJ via Perseus, and Lardos et al. 2024 (figshare, CC BY 4.0) as expert gold
  for 61 names and as the John the Physician crosswalk.
- Modern Greek village use: Mount Pelion 2023 and North Aegean 2018 field studies.
- Biodiversity and names: GBIF occurrences in Greece, Cyprus and Turkey; Wikidata vernacular
  names and IUCN status.
- Chemistry and disease: LOTUS, ChEMBL 37, Open Targets, PubChem GHS hazards, and PubMed
  E-utilities with a separate query for each year.
- Morphology: Wikipedia species descriptions.

**Methods.**
- **Claim extraction.** Rule-based extraction gives 3,696 claims. A Claude session then re-read
  all 1,158 passages and produced 5,075 LLM claims. Every span is substring-verified (100%
  pass), giving 3,550 usable claims.
- **Identification.** A conditional-logit model with an explicit "unidentified" option. Its
  features are geography from GBIF counts, name similarity to modern Greek vernacular names and
  to the epithet, scholarly references, an LSJ flag, genus consensus, and an LLM-extracted
  morphology match against Wikipedia (f1). Bootstrap 90% intervals and temperature scaling.
- **Persistence test.** A permutation test across four eras: 48.6% observed against 40.8%
  under the null, p = 0.001.
- **Temporal backtest ("time machine").** Rolling-origin cutoffs at 2000, 2005, 2010 and 2015,
  scored by AUPRC against PubMed co-mention up to 2025. The result is an honest null: history
  adds nothing beyond research popularity.
- **Leads.** 1,781 leads, ranked by forecast score × P(species), with "rank if certainty
  ignored" and Kendall τ = 0.50. Each lead has a compound → target → disease path through
  ChEMBL and Open Targets.
- **Knowledge graph.** 2,585 nodes and 9,146 edges.

**Evaluation.**
- **Identification against the Lardos gold** (leave-one-out): top-1 0.62 [0.51–0.75], against
  0.31 for LSJ, 0.39 for a uniform guess and 0.59 for an LLM judge. Brier 0.50; ECE 0.21, a
  missed target they disclose.
- **Extraction** is checked only for span validity, not for precision or recall. Human audit
  sheets are generated but **not filled in** ("pending").
- **Tests:** 27 tests and CI.

**UI and UX.** One long dark page. It opens with a torn-paper reveal over a Vienna folio, then:
- the hero "One word, more than one plant": ἀψίνθιον with P bars;
- a pipeline section with counters;
- a 40-second autoplay tour recording;
- the **ancient name explorer**: search by Greek with or without accents, by transliteration or
  by Latin name; filter chips; a 250-row list; the chapter with uses highlighted, the CTS URN
  and a Perseids link; P(species) bars with whiskers; candidate cards giving "+ / −" reasons
  and modern photos; a four-era survival table; the Galen passage with its word-overlap score;
  and modern village uses;
- an **alluvial chart** of all 1,146 uses flowing Dioscorides → Galen → John → Modern Greece,
  with body-system tabs (`pharmakon_alluvial_through_time.jpg`), next to "Is the survival
  real?" bars;
- results cards for identification against experts and for the time machine, with year tabs
  and CI dot-plots;
- a leads gallery with condition filter, certainty slider, hide-toxic toggle and CSV export;
- "Use it": MCP, API and a CLI.

**Delivery.**
- A 9-minute YouTube film with a live claude.ai MCP demo, a Google Drive pitch deck and a
  10-slide PDF.
- 15 Devpost gallery images.
- A README full of hosted GIFs (explorer, leads, MCP, KG path).
- **MCP server with 6 tools** and a **JSON API**, both on the same Cloudflare Worker.
- A Streamlit dashboard, a Docker image on ghcr, `CITATION.cff` and a release.

**Visual design.** High-gloss dark "tech brand" look: geometric sans, mint-green accent, glass
nav, motion. Very polished and on-trend, but generic SaaS in feel rather than scholarly. The
first viewport is black until the animation runs (headless capture `pharmakon_full_part0.jpg`
is almost entirely black). Sections fade in on scroll.

**Standout ideas.**
1. Identification as a calibrated probability with an "unidentified" option, carried through
   to the leads.
2. A temporal backtest that reports a null as a finding.
3. Four eras, including Byzantine and living village medicine.
4. An MCP server you can use from Claude, demoed in the film.
5. Mechanistic compound → target → disease paths.
6. An LLM judge baseline, flagged for possible memorisation.

**Weaknesses (verified).**
- **Glaring identification errors on staple foods.** We checked these through their own API
  (`/api/names?q=krithe`, `?q=phakos`, `/api/leads/1`):
  - κριθή (2.86, barley) → *Sorghum halepense* (P 0.57).
  - φακός (2.107, lentil) → *Vicia faba* (P 0.38). φακὸς ὁ ἐπὶ τῶν τελμάτων (4.87, duckweed)
    → *Vicia faba* (P 0.36).
  - Their **#1 lead** (*Vicia faba*, eye diseases) is built from `ancient_names:
    ["dmm-2-105", "dmm-2-107"]`, so it partly rests on the lentil chapter.
  - Our concordance has Hordeum vulgare, Lens culinaris and Lemna minor for these three
    chapters (`data/curated/taxa_dioscorides.csv`).
- **Junk headwords in the public explorer.** Function words and fragments are listed as drug
  names: τῆς (twice), ἀπὸ, ἐκ, ὁμοίως, μέντοι, καλούμενον, σκευάζεται, ἱστορεῖται, ὑ, ὠ, φ.
  There are also duplicates (Ἑλένιον ×2, κράμβη ×2).
- **Most names are unidentified.** 196 of the 250 names listed in the explorer show "not
  identified" (78%, counted in the DOM). Only 653 names in all.
- The Galen passage shown for ἀψίνθιον is the ἀβρότονον chapter ("0% word overlap").
- Body-system mapping looks doubtful, for example "Metabolic" and "Cardiovascular" for
  wormwood.
- Calibration target missed (ECE 0.21). The backtest is a null. Evidence labels are PubMed
  co-mention, the same proxy we use. No human audit. No precision or recall for extraction.
- Modern Greek layer: the Mount Pelion study covers skin only, as they admit.
- One language only (Greek). No Early Modern or Western European transmission.
- The knowledge graph is 8× smaller than ours (2.6k nodes against our 20.4k).

---

## 2. EthnoHarvest / EcoRoots (ethnoharvest.vercel.app, ZENODIUM/EcoRoots)

**Track.** Not stated in the README. The topic is sustainable wild harvest of medicinal plants
(conservation and value chain). Repo created 2026-11-08 10:39 UTC; Python (FastAPI) and React.
There is no repo link on the live site.

**Problem.** A harvesting cooperative needs to know whether it has the right plant, whether
harvest will shrink the population, what to measure next, and whether a batch can be shown to
a buyer. The tool refuses to invent a local quota until six local measurements exist.

**Data.**
- Population and life-history: COMPADRE 6.26.3.0 (9,178 matrices, 812 taxa, 200 of them
  medicinal), PhenObs, and an environmental demography archive.
- Names and ranges: WCVP/POWO and WFO name checks (752 of 812 names agree), TDWG ranges.
- Live map layers: GBIF, WorldClim, NASA POWER, Copernicus DEM through Open-Meteo, SoilGrids,
  NASA FIRMS fire detections, CITES Species+, Hansen tree-cover loss and ESA WorldCover.
- Literature and use records: Europe PMC and OpenAlex; USDA Duke and Herbolario for documented
  use.

**Methods.**
- Matrix population models: λ by eigen-decomposition with a power-iteration check, LTRE, and
  harvest-versus-control comparisons.
- A habitat model scored with spatial-block cross-validation; random CV would have flattered
  it by up to 0.19.
- An ILP survey and evidence planner, which beat a greedy baseline in 15 of 24 budgets.
- A 13-step agent pipeline ("JEV" triage) with Groq for grounded explanations, numeric
  grounding checks and fault injection.
- Document checks on PDFs (synthetic packets, 14 of 15 planted issues found by rules alone).

**Evaluation.** **Fifteen hypotheses written down before running** (E01–E15), each with
outcome: 6 held, 2 replicated, 2 inconclusive, 4 failed, 1 early look. Each has "what we
asked / expected / how / found" and a reproduce command (`ethnoharvest_preregistered_tests.jpg`).
The Ghimire 2008 reproduction gives Spearman ρ = −1.00. The LLM was no better than keyword rules
(F1 0.768 against 0.773), which they report openly.

**UI and UX.**
- A Cesium 3D globe with draw-box and point-radius region analysis and layer toggles that
  report their own status ("display-only", "pending").
- A **3D "Living Ecosystem Studio"**: GLB plant models on a soil plot, animated year by year
  from the matrix projection, with a harvest-scenario radio and a play/scrub control.
- An agent-run trace: step DAG, event log and verification checks (`ethnoharvest_agent_run.jpg`).
- HarvestOps workbench: passports, exceptions queue, stock ledger, and a role switcher.
- A **Plain / Scientific** reading-mode toggle, a PWA, mobile layouts and Playwright e2e tests.

**Visual design.** A dense, dark green "field instrument" look in serif and mono. Very
professional, but busy. A first-time visitor is dropped into a GIS tool and has to work to find
the story.

**Standout ideas.** Pre-registered hypotheses with honest outcomes. Refusing to answer when
evidence is missing ("not yet", never draw unknown as zero). Plain/Scientific toggle.
Simulation you can watch. Fault injection.

**Weaknesses.** No traditional-knowledge or historical-text component (medicinal use is a
USDA list). The static deployment cannot run the models; recent runs are canned. The HarvestOps
data is entirely synthetic. No licence on the code. The scope is so wide that a 3-minute pitch
will struggle. There is no public repo link on the site.

**Relevance to us.** We do not compete on the same question, but we may compete for the
overall prize. Judges will remember the 3D studio and the pre-registered test ledger.

---

## 3. Materia Incerta (fozagtx/Materia-Incerta-)

**Track.** EthnoHack 2026 Track 1. Repo created 2026-11-08 09:54 UTC. No live site found. It
has a 90-second Remotion pitch video with Kokoro TTS, but the rendered file is not committed
and the README section was removed.

**Problem.** Automate Lardos et al. 2024: an LLM scores each Dioscorides botanical detail
against modern flora descriptions (all plant names masked), then applies the paper's
degree-of-congruence formula.

**Methods.** Name masking (a prompt that still contains a name is refused). A quote-or-absent
evidence rule. Reproduction of the paper's labels before any model run. 1,000 category
resamples for label and rank stability. A compound ledger that sorts compounds into
**robust / ID-dependent / no data**. A tuning/held-out split fixed in advance, with a kappa
target of 0.6 or more set before the run.

**Status.** "Runs end to end on synthetic data · Real Lardos data not loaded yet." The site
data (`client/public/data/index.json`, 18 bytes) is empty, and the screenshots carry a red
"Synthetic test data" banner. There is one live 10-call demo on Dioscorides 3.91.

**Design.** Clean light Next.js and shadcn tables. Plain and scholarly, but modest.

**Ideas worth taking:** "ID-dependent compound" (which constituents depend on which
identification) and masking names to test for LLM memorisation.

**Threat:** low, unless they load the real data before the deadline.

---

## 4. Gap analysis

### (a) What they have that we lack or do worse

| # | Gap | Who | Severity |
|---|---|---|---|
| 1 | **Identification is not validated against experts.** Pharmakon reports 0.62 top-1 against Lardos, 2× the dictionary. We report only "99.2% resolved" and 64/72% agreement with Wikidata and GBIF names, which are weak and indicative checks. Our identifications are AI-curated, and a judge can ask "how do you know?" | Pharmakon | **Critical** |
| 2 | **Same opening as Pharmakon.** Both heroes are ἀψίνθιον, 3.23, the Vienna Dioscurides and "the uses through time". Two of the top leads also overlap (*Ruta graveolens* for eyes, *Vicia faba* for bleeding). Judges will see two versions of one idea and remember the one with the film. | Pharmakon | **Critical** |
| 3 | **No uncertainty propagation.** Our high/medium/low confidence does not feed the lead score. They show P(species), intervals and "rank if certainty ignored". | Pharmakon | High |
| 4 | **Only two eras.** Our name implies Culpeper → Galen → Dioscorides layers, but we skip Galen and every Byzantine source. They have four eras, including living villages. | Pharmakon | High |
| 5 | **No prospective or temporal test.** Ours is cross-sectional (OR 2.77) and exposed to circularity: tradition motivates research. Their backtest asks the predictive question, even though the answer is null. | Pharmakon | High |
| 6 | **No MCP or live API story.** Ours is static JSON files. Theirs has a 6-tool MCP demoed inside Claude, plus a REST API. | Pharmakon | Medium-high |
| 7 | **Presentation assets.** Their README GIFs, 9-minute film, deck, Devpost gallery, Docker, CI badge and release are all live today. Our video exists only as a script (`docs/pitch/video_script.md`). | Pharmakon | High (time-critical) |
| 8 | **No signature visual.** They have the alluvial era flow; EthnoHarvest has the 3D studio and globe. Our findings charts are clean but static bar and dot charts. | both | Medium-high |
| 9 | **No mechanism layer.** We show LOTUS constituent counts only, while they draw compound → target → disease paths. | Pharmakon | Medium |
| 10 | **No modern toxicity source.** Our ⚠ is a historical warning (creative, but not enough on its own). They use PubChem GHS. | Pharmakon | Medium |
| 11 | **Extraction reference is AI-annotated** (METHODS §8). Our F1 of 0.86/0.90 is against an AI "blind" reference with no human subset or kappa. Nobody has human audits, but ours carry a headline number that can be called circular. | (all) | Medium |
| 12 | **No pre-registration or "tests we wrote down" ledger.** EthnoHarvest makes honesty visible as a product feature. | EthnoHarvest | Medium |
| 13 | **No plain/expert reading toggle and no guided autoplay tour.** EthnoHarvest has Plain/Scientific; Pharmakon has a 40-second tour. | both | Low-medium |
| 14 | **Loading states.** The landing page shows "n/a shared plant–indication claims across n/a species…" until the JSON arrives. We captured this in the first `get_page_text` read; it resolves after about 1 s. Crawlers and slow links see "n/a". | us | Low (cheap fix) |

### (b) Where we are clearly stronger

- **Two languages, two cultures, 1,600 years.** We transmit Greek → Early Modern English with a
  historical disease crosswalk (agues, dropsy, king's evil, strangury). Nobody else crosses a
  language boundary, and this is our unique headline.
- **Measured extraction quality.** Precision, recall and F1 with CIs in both languages (0.86 /
  0.90). Pharmakon only checks that spans are valid substrings.
- **Coverage and correctness of names.** 822 chapters and 692 accepted taxa, against their 653
  names of which most are "not identified" in the explorer. We have no junk headwords. We get
  barley, lentil and duckweed right where they fail.
- **Stronger nulls on transmission.** 2.65× overall, 2.11× size-matched and 1.56× within
  family, with z = 26. Their single shuffle gives 48.6% against 40.8%.
- **A positive, well-controlled modern-evidence finding.** OR 2.77 with within-plant matched
  controls, indication fixed effects and cluster-robust errors; RR 1.04 once studied; and a
  synonym sensitivity check that holds. Theirs is a null.
- **Scale of claims and graph.** 10,400 claims against 3,550, and a knowledge graph of 20.4k
  nodes and 51k edges against 2.6k and 9k.
- **Design voice.** A scholarly manuscript aesthetic: serif, rubrication, ochre findings band,
  94 Vienna images with licences. It reads like a digital edition, which suits historians,
  while theirs looks like a SaaS landing page.
- **Facing texts.** Dioscorides and Culpeper side by side with rubricated "both herbals" marks.
  No competitor has a parallel-text reader.
- **Cite and download on every record**, Ctrl+K search, and a data page with sizes and licences.

### (c) Prioritised improvements (about 6–10 h of agent work)

Ordered by impact per hour. **P1–P5 are must-dos before the deadline.**

**P1. Expert-gold identification benchmark against Lardos et al. 2024 (about 1.5 h).**
- Download the figshare record (10.17637/rh.23736189, CC BY 4.0) and score our concordance
  against the expert identifications: top-1 at species, top-1 at genus, and agreement by
  confidence level.
- Add a "staples check": the 30 commonest food and garden plants, which any reader can verify.
- Report the memorisation caveat honestly, since the AI curation may have seen Lardos.
- Show it on Methods and as a fourth number in the findings band.
- **Why it wins:** it removes Pharmakon's strongest card. If our curated concordance beats
  0.62, we lead on their own metric, and the staples check exposes their barley/lentil errors
  without naming them.

**P2. Make the hero our own, with a "scrape the palimpsest" interaction (about 1.5 h).**
- Replace the wormwood hero with a signature interaction. A drag handle "scrapes" the 1653
  Culpeper layer off a page to reveal the Greek beneath, then the 2026 evidence layer. This
  extends the existing era-layer tabs (All / c. 60 CE / 1653 / 2026).
- Open on a different plant: rue (*Ruta graveolens*, our lead #1), with a different Vienna folio.
- **Why it wins:** it ends the side-by-side comparison with Pharmakon's identical 3.23 opening
  and makes our name the interaction. Nobody else has a metaphor you can touch.

**P3. "Survival flow" alluvial across our three layers (about 1.5 h).**
- One D3/SVG Sankey: Dioscorides claims → also in Culpeper / lost / new in Culpeper → 2026
  evidence tier (unstudied / sparse / studied).
- Filter by body system; hovering a ribbon lists the plants.
- **Why it wins:** it matches Pharmakon's best visual and adds the modern-evidence column that
  their flow lacks, so the whole thesis fits on one screen.

**P4. Uncertainty-weighted leads (about 1 h).**
- Map confidence to a weight (high 1.0, medium 0.6, low 0.3, or genus-only), multiply it into
  the lead score, and show "rank if certainty ignored" and Kendall τ.
- Add a certainty slider and a "hide toxic" toggle on the Leads page.
- **Why it wins:** it closes gap 3 and shows we take identification doubt seriously.

**P5. Time-machine test on our own signal (about 2–3 h, needs API calls).**
- For the persistent pairs and matched unclaimed controls, re-query Europe PMC with
  `PUB_YEAR` cutoffs (2005, 2010, 2015) and ask whether pairs unstudied at the cutoff gain
  papers by 2026 more often when both herbals claim them.
- Use the same within-plant design and the same cache. Report the result whatever it is.
- **Why it wins:** it answers the circularity objection prospectively. A positive result beats
  Pharmakon's null head to head; a null still matches their rigour, and our cross-sectional
  OR 2.77 remains.

**P6. Pitch film and README GIF tour (about 1.5 h agent work plus a voice-over).**
- Render the existing `video_script.md` with HyperFrames/Remotion from real screen captures
  (headless Chrome).
- Add three GIFs to the README (parallel reader, scrape hero, survival flow).
- Make a Devpost gallery of 8–10 images at 3:2.
- **Why it wins:** Pharmakon's assets are already live, and first impressions decide close
  calls. This is time-critical.

**P7. "Tests we wrote down" ledger (about 1 h).**
- A Methods/Findings section listing every test with question → prediction → method → result
  → status (held / did not hold / null), including the honest ones: RR 1.04 n.s., the
  category-level 1.42×, and the synonym sensitivity check.
- Date them from git history and give each a reproduce command.
- **Why it wins:** it borrows EthnoHarvest's most persuasive device and makes our negative
  results a strength.

**P8. MCP server, stdio, from the repo (about 1.5 h).**
- `python -m palimpsest.mcp` serving our committed JSON, with tools `search_plants`,
  `get_plant` (both texts plus spans), `list_leads`, `get_lead`, `get_findings` and
  `trace_claim` (span → concept → Culpeper → papers).
- Add one-line setup on the Data page: `claude mcp add palimpsest -- python -m palimpsest.mcp`.
- Record a 20-second GIF of Claude answering "What did Dioscorides and Culpeper both say about
  rue, and has anyone tested it?"
- **Why it wins:** it neutralises Pharmakon's MCP. `trace_claim` is a tool they cannot offer,
  because they have no second text.

**P9. English gloss on every Greek span (about 1 h).**
- Hovering a highlighted Greek word shows a literal gloss built from the lexicon stem (for
  example ἰκτερικούς → "the jaundiced"), the MeSH concept and the matching Culpeper wording.
- Add a "show glosses inline" toggle.
- **Why it wins:** judges cannot read Greek. Pharmakon highlights spans but never translates
  them, so this makes our extraction readable to anyone.

**P10. Mechanism and modern toxicity for the 60 leads (about 2 h).**
- Join our LOTUS InChIKeys (`taxon_compounds.csv` already carries ChEMBL IDs) to ChEMBL
  activities (pChEMBL ≥ 6) → human targets → Open Targets disease scores restricted to the
  lead's MeSH concept. Show one or two "closed paths" per lead.
- Add PubChem GHS flags next to our historical ⚠.
- **Why it wins:** we reach parity on mechanism and keep our unique historical warnings, so
  each lead carries "ancient warning + modern hazard" together.

**P11. Lead dossier one-pager (about 1 h).**
- A print-styled, PDF-friendly page per lead: both quotations, identification and confidence,
  evidence tier with the exact Europe PMC query, constituents, mechanism path, safety, IUCN and
  a BibTeX/CSL citation.
- **Why it wins:** it is the artefact a pharmacognosy lab would forward. None of the
  competitors offers a shareable lead record.

**P12. Human audit subset with kappa (about 0.5 h agent work plus 1–2 h of a team member).**
- Generate a 40-claim sheet (20 Greek with a Culpeper/English gloss, 20 English).
- Have a team member annotate it blind, then compute Cohen's κ against the AI reference and
  P/R/F1 against the human annotation.
- **Why it wins:** we would be the only team with any human-verified extraction number, which
  answers gap 11.

**P13. Plain / Scholarly reading toggle and a 45-second guided tour (about 1 h).**
- One switch rewrites figure captions in plain language (the "In plain terms" text already
  exists).
- A "Take the tour" button auto-walks through hero → facing texts → survival flow → a lead.
- **Why it wins:** it combines EthnoHarvest's toggle with Pharmakon's tour, for demo day and
  for non-specialist judges.

**P14. Loading skeletons, prerendered key numbers and an OG card (about 0.5 h).**
- Replace "n/a" with skeletons and inline the stats from `stats.json` at build time.
- Add a social card image (scrape hero frame) and meta description.
- **Why it wins:** cheap, and it removes the only visible defect we found on our own site.

**P15 (stretch). Add Galen as the middle layer (about 3 h).**
- Ingest First1KGreek `tlg0057.tlg075` books 6–8, reuse our Greek lexicon (same language),
  and add a Galen column to the facing texts and the survival flow.
- **Why it wins:** it makes "Palimpsest" literally three layers and matches Pharmakon's era
  depth. Do it only if P1–P8 are done.

**Do not chase:** a 3D globe or simulation (EthnoHarvest's territory, no scientific gain for
us), or LLM re-extraction of claims (it would weaken our "rule-based, reproducible, measured"
position).

---

## 5. Top threats (summary)

1. **Pharmakon is the same project with better packaging and a validated identification
   model.** It has the same text, chapter, images and track, and overlapping leads. It also has
   a 9-minute film, an MCP server, a 4-era alluvial chart and 0.62 top-1 against experts.
   Counter with P1, P2, P3, P6 and P8, and lead with our two-language transmission.
2. **EthnoHarvest's sheer depth and "honesty as a feature".** It has a pre-registered
   15-hypothesis ledger, a 3D population studio and an agent trace. It may win overall on
   impact and engineering. Counter with P7 and P13, and keep our story tighter and more
   readable.
3. **Credibility attacks on our numbers.** Our identifications are AI-curated with no expert
   benchmark, and our extraction F1 is measured against an AI reference. A sharp judge who has
   just seen Pharmakon's Lardos result will ask. Counter with P1, P12 and P5.
