# Product

<!-- impeccable:product-schema 1 -->

> Written without an interview (the design work ran as a delegated agent with no question channel).
> Facts come from the repository README, docs/METHODS.md, docs/WEB_DATA.md and the brief that commissioned
> the explorer. Lines marked *(inferred)* are assumptions to confirm with the team.

## Platform

web

## Users

- **Historians of medicine and Byzantine pharmacology** reading Dioscorides in Greek beside Culpeper, checking how a
  plant name was identified and where an indication sits in the chapter.
- **Pharmacognosists and drug-discovery researchers** looking for persistent but under-studied plant–indication pairs,
  with constituents, literature counts, safety and conservation flags, and exportable data.
- **Data-mining and knowledge-graph researchers** who want the graph, the claims and the code to reproduce the numbers.
- **Clinicians and the public**, who need the responsible-use framing first: these are hypotheses, not advice.
- First audience in time: the EthnoHack 2026 judging panel (pharmacognosy professors, a historian of Byzantine
  pharmacology, a data-mining professor, a knowledge-graph researcher), reading on laptops and a projector.

## Product Purpose

Palimpsest reads Dioscorides' *De materia medica* in the original Greek (c. 60 CE, 822 chapters) and Culpeper's
*Complete Herbal* (1653, 328 monographs), maps plant names across eras to 692 accepted GBIF taxa, extracts 10,399
indication claims into 85 MeSH-linked concepts with exact character provenance, tests whether Culpeper repeats
Dioscorides more than chance, screens modern evidence (Europe PMC, ClinicalTrials.gov, LOTUS, IUCN) and ranks 60
under-studied leads. The explorer makes every number traceable to the words in the source. Success: a specialist can
go from a headline finding to the Greek clause behind it in two clicks, and leave with a citation or a CSV.

## Positioning

The only open, reproducible pipeline that mines the *original Greek* of Dioscorides (not a translation), keeps the
exact span of every claim, and tests transmission and modern attention against matched within-plant controls.

## Operating Context

Static site on GitHub Pages (hash routing, relative paths, `web/public/data/*.json` produced by the Python pipeline).
Data are read-only from the explorer's point of view; derived JSON may be built from them under `data/derived/`.

## Capabilities and Constraints

- Plants, claims, texts, leads, stats and a knowledge-graph excerpt are shipped as JSON; texts.json is 2.7 MB.
- Greek text is CC BY-SA 4.0 (derived from First1KGreek); Culpeper is public domain; code MIT.
- Co-mention counts measure research attention, not efficacy. Several remedies are toxic.
- Images must be public domain / CC0 with recorded provenance.

## Brand Commitments

- Name: **Palimpsest**. Metaphor: older text showing through newer writing.
- Voice: precise, scholarly, plain; numbers always with their uncertainty and denominator.
- Visual world pinned by the brief: manuscript and palimpsest, rubrication, gilt, ink; real codex imagery;
  restraint of a top studio; no generic card grids, side-tab accent borders or gradient blobs.

## Evidence on Hand

- Results in `web/public/data/summary.json` and `stats.json` (transmission 2.65× (always two decimals), size-matched 2.11×, within-family
  1.56×, matched controls 45% vs 32%, OR 2.77 [2.04–3.77], once-studied RR 1.04 [0.61–1.76]).
- 60 ranked leads with quotes from both herbals (`leads.json`).
- 94 public-domain images (Vienna Dioscurides, Fuchs 1542, Gerard 1597, Culpeper 1814) in `public/img/codex/`,
  with provenance in `public/img/credits.json`.
- No testimonials, users, partners or endorsements exist; none may be invented. Team names live in one constant, `src/content/team.ts` (`TEAM`); the About page shows "Team Palimpsest · EthnoHack 2026" until it is filled.
- Identifications checked against Lardos et al. 2024 (`public/data/extra/expert_benchmark.json`): 70% species top-1 over 54 chapters (81% for species-rank IDs), 91% genus, staples 30/30.

## Product Principles

1. Every claim points to its words: span, chapter, edition, licence.
2. Uncertainty is shown, never hidden: intervals, confidence levels, denominators.
3. Responsible use before discovery: safety and conservation flags travel with every lead.
4. Open by default: every view can be cited and downloaded.
5. Fast and legible on a projector and on a phone.

## Accessibility & Inclusion

WCAG 2.2 AA; keyboard-complete; reduced-motion respected; polytonic Greek must render correctly (`lang="grc"`).
