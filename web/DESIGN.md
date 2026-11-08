---
name: Palimpsest
description: A canon table for one plant's claims across 60 CE, 1653 and 2026, set in the materials of a Byzantine codex.
colors:
  vellum: "#e3d5b3"
  vellum-2: "#dacaa3"
  vellum-3: "#cfbe96"
  vellum-sunk: "#ece2ca"
  ink: "#231a12"
  ink-2: "#3d3126"
  muted: "#584a3a"
  rule: "#c2b08a"
  rule-strong: "#8f8166"
  rubric: "#bd331c"
  rubric-ink: "#9e2614"
  gilt: "#cfae5c"
  gilt-line: "#8a6a1e"
  on-gilt-2: "#3a2a14"
  porphyra: "#7a3f8c"
  verdigris: "#007a58"
  verdigris-ink: "#005e44"
  null-grey: "#807666"
typography:
  display-greek:
    fontFamily: "GFS Didot, Gentium Book Plus, Noto Serif, serif"
    fontSize: "clamp(4.5rem, 14vw, 14.5rem)"
    fontWeight: 400
    lineHeight: 0.86
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Alegreya, Gentium Book Plus, Georgia, serif"
    fontSize: "clamp(2.5rem, 3.6vw + 1.2rem, 4.75rem)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.012em"
  headline-2:
    fontFamily: "Alegreya, Gentium Book Plus, Georgia, serif"
    fontSize: "clamp(1.875rem, 2.2vw + 1rem, 3rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.012em"
  title:
    fontFamily: "Alegreya, Gentium Book Plus, Georgia, serif"
    fontSize: "clamp(1.25rem, 0.6vw + 1.05rem, 1.5rem)"
    fontWeight: 700
    lineHeight: 1.2
  reading:
    fontFamily: "Alegreya, Gentium Book Plus, Georgia, serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.7
  reading-greek:
    fontFamily: "GFS Didot, Gentium Book Plus, Noto Serif, serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.72
    fontFeature: "\"kern\""
  body:
    fontFamily: "Alegreya Sans, Gill Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  small-caps:
    fontFamily: "Alegreya SC, Alegreya, Georgia, serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    letterSpacing: "0.02em"
  label:
    fontFamily: "Alegreya Sans, Gill Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.45
rounded:
  hair: "1px"
  control: "2px"
  key: "3px"
spacing:
  s-1: "4px"
  s-2: "8px"
  s-3: "12px"
  s-4: "16px"
  s-5: "24px"
  s-6: "32px"
  s-7: "48px"
  s-8: "64px"
  gutter: "clamp(16px, 4.2vw, 64px)"
  section: "clamp(72px, 9vw, 144px)"
components:
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.vellum}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-ink-hover:
    backgroundColor: "{colors.ink-2}"
  button-line:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-line-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.vellum}"
  button-small:
    padding: "0 14px"
    height: "36px"
  searchbox:
    backgroundColor: "{colors.vellum-sunk}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px 0 16px"
    height: "52px"
  field-input:
    backgroundColor: "{colors.vellum-sunk}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  segmented-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.vellum}"
    padding: "8px 14px"
    height: "40px"
  gilt-band:
    backgroundColor: "{colors.gilt}"
    textColor: "{colors.ink}"
    padding: "clamp(56px, 7vw, 112px) 0"
  tooltip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.vellum}"
    padding: "10px 12px"
  flag-warn:
    backgroundColor: "{colors.vellum-sunk}"
    textColor: "{colors.ink}"
    padding: "3px 8px"
---

# Design System: Palimpsest

## Overview

**Creative North Star: "The Canon Table"**

Eusebius's arcaded concordance set parallel passages side by side under a shared arcade, with the section numbers rubricated in red. Palimpsest does the same for one plant's claims across three eras: Dioscorides (c. 60 CE), Culpeper (1653) and modern evidence (2026), aligned in columns beneath a gilt arch. Every surface is built from the materials of a Byzantine codex: a ground of real photographed vellum (a blank margin of the Vienna Dioscurides, tiled at 720px), iron-gall ink for text, minium red for rubrication, flat shell-gold for findings, and two pigments that stand for the two herbals.

The system is dense and scholarly rather than airy. Structure comes from rules, not boxes: hairlines, double rules and arcade heads divide the page the way ruling divides a folio. Corners are effectively square. Type carries scale: Greek set at architectural size and cropped by its frame, Alegreya for reading and display, Alegreya Sans for interface and figures. Every image and every headline number carries its provenance in a seamed caption beneath it.

Dark theme is "iron-gall night": the same vellum texture multiplied into near-black (`background-blend-mode: multiply` over `#17120d`), with every role re-tuned for contrast rather than inverted.

**Key Characteristics:**
- Photographed vellum ground; iron-gall night in dark mode, from the same raster.
- Rules, double rules and gilt arches divide; cards and boxes do not.
- Minium is rubrication: numerals, the current location, persistence and the observed value.
- Porphyra is Dioscorides, verdigris is Culpeper, everywhere.
- Flat gold is a field, never a gradient.
- Provenance seamed under every image and headline number.
- One load sequence; nothing moves on keyboard actions.

## Colors

A codex palette: two vellum-and-ink grounds, one rubricating red, one flat gold, and two pigments that identify the sources.

### Primary
- **Minium** (#bd331c): rubrication marks: the active-era underline and diamond, the current-page underline in the masthead, the persisted/claimed-by-both mark in every chart, the observed-value line and dot, persistence underlines on annotated spans, the caret, the selected palette row's left rule. Marks only (it is 3.95:1 on vellum, so it never sets body-size text).
- **Minium Ink** (#9e2614): the text form of minium (5.3:1 on vellum): rubricated numerals (figure numbers, lead ranks, roman TOC counters), the wordmark initial, small-caps heads (palette groups, the "In short" / "In detail" and "Cite" / "Reproduce" sub-heads), the "lead n" persistence tag, caution titles.

### Secondary
- **Porphyra** (#7a3f8c): Dioscorides. Era diamond, chart marks, annotated-span underline and wash (13% / 26% when lit), Greek layer of the hero name stack (mixed 25% into vellum).
- **Verdigris** (#007a58): Culpeper. Same roles as porphyra for the English herbal.
- **Verdigris Ink** (#005e44): verdigris as text (the Culpeper column head on a plant record).

### Tertiary
- **Shell Gold** (#cfae5c): the findings band only; a flat field with ink on it (8.0:1).
- **Gilt Line** (#8a6a1e): the arcade hairline and the concordance rules: arch strokes, the double rule under canon-table heads, and the column dividers of three-era rows.
- **Gilt Shadow Ink** (#3a2a14): secondary text on gold (6.5:1).

### Neutral
- **Vellum** (#e3d5b3): page ground, under the vellum raster; also the fill of open chart dots and the halo stroke behind chart labels.
- **Vellum Deep** (#dacaa3): recessed bands (the codex strip, facing texts, colophon), lit table rows, the selected palette option.
- **Vellum Shade** (#cfbe96): meter troughs and skeleton shimmer.
- **Vellum Sunk** (#ece2ca): the lighter well of inputs, the search box and code blocks.
- **Iron-Gall Ink** (#231a12): text (12.8:1), the ink button, tooltips, the focus ring.
- **Ink Second** (#3d3126): ledes, secondary prose, tier cells.
- **Faded Ink** (#584a3a): captions, labels, meta (5.9:1).
- **Ruling** (#c2b08a) and **Ruling Strong** (#8f8166): hairlines and double rules; Ruling Strong also outlines controls and images.
- **Null Grey** (#807666): the null in charts only (the permutation distribution, unclaimed controls, category baseline); 3.1:1 on vellum, so null marks are always direct-labelled or keyed in a legend.

### Named Rules

**The Rubrication Rule.** In data, minium means one thing: persisted (claimed by both herbals), which is also the observed value set against the null. In chrome it marks where you are (active era, current page, selected row) and rubricates numerals. It never colours a series of its own or decorates.

**The Two Herbals Rule.** Porphyra is Dioscorides and verdigris is Culpeper on every surface: era control, name columns, annotated spans, quotes, chart marks and legends. Never swap them and never reuse either for anything else.

**The Flat Gold Rule.** Gold is a flat field (the findings band) or a 1–1.5px line (the arcade). Never a gradient, never a text colour, never a fill on a control.

## Typography

**Display Font:** GFS Didot (with Gentium Book Plus, Noto Serif) for all Greek
**Body Font:** Alegreya (with Gentium Book Plus, Georgia) for Latin reading and display
**Label/Mono Font:** Alegreya Sans (with Gill Sans, Segoe UI) for interface and figures; Alegreya SC for small capitals; system monospace for code

**Character:** A single humanist family in three cuts (serif, sans, small caps) gives one voice across reading, interface and rubric, while Didot keeps the Greek recognisably Greek. Greek is always tagged `lang="grc"` and gets its own face.

### Hierarchy
- **Display Greek** (400, clamp(4.5rem, 14vw, 14.5rem), 0.86): the name stack only; cropped by its frame, rotated -1.6deg, multiplied over vellum.
- **Headline** (Alegreya 700, clamp(2.5rem → 4.75rem), 1.04, -0.012em): page titles and binomials; max 22ch, balanced.
- **Headline 2** (700, clamp(1.875rem → 3rem), 1.08): section titles; max 28ch.
- **Title** (700, clamp(1.25rem → 1.5rem), 1.2): column heads, finding claims.
- **Reading** (Alegreya 400, 1.1875rem, 1.7, max 64ch, hyphenated) and **Reading Greek** (Didot, 1.25rem, 1.72): the facing herbal texts.
- **Body** (Alegreya Sans 400, 1.0625rem, 1.55, max 66ch): everything else.
- **Small Caps** (Alegreya SC 700, 0.9375rem, +0.02em): canon-table heads, era names, roman counters, and small rubricated sub-heads, which are real headings (`h3`), never decorative labels over a heading.
- **Label** (Alegreya Sans 700, 0.8125rem): field labels, seam captions, cell sub-lines, stacked-table labels. Never uppercased.

### Named Rules

**The Figures Rule.** Every number in a table, chart, ledger or tooltip is tabular lining (`font-variant-numeric: tabular-nums lining-nums`).

**The Greek Face Rule.** Greek is never set in Alegreya; anything tagged `grc` falls to GFS Didot at 1.05–1.1em of its context so it reads at the same optical size.

## Layout

A single wrap (max 1360px, fluid gutter clamp(16px, 4.2vw, 64px)) holds asymmetric 12-part splits: 7/5 for the hero (text, then folio), 4/8 for plant records and figures (plates or caption column, then body), 8/4 for evidence and facts, 3.4/6/2.6 for lead rows. Three-era content always sits in three equal columns. Sections are separated by a fluid rhythm (clamp(72px, 9vw, 144px)) and by full-bleed tonal bands (vellum deep, gold), not by containers. Spacing follows one 4-based scale (4, 8, 12, 16, 24, 32, 48, 64). Reading measure is 66ch; sticky side columns (plates, methods TOC, about figure) sit at top 96px under the 64px masthead.

Breakpoints: 1180px (lead facts move under the quotes; search trigger loses its label), 980px (navigation collapses behind a menu button; all splits stack; the gold findings and canon columns become stacked rows divided by double rules), 720px (canon tables become stacked records with `data-label` captions; name columns stack), 480px (era control becomes a 2×2 grid). Layout is checked from 360px to 1920px.

## Elevation & Depth

Flat and ruled. Depth comes from tonal layers of vellum (sunk wells lighter, recessed bands darker) and from the multiply blend of layered text, not from shadow. The only shadow belongs to things that float above the page: tooltips, the gloss tip and the command palette.

### Shadow Vocabulary
- **Pop** (`box-shadow: 0 18px 48px -12px rgb(35 26 18 / 0.32), 0 2px 6px rgb(35 26 18 / 0.12)`; dark: `0 18px 48px -12px rgb(0 0 0 / 0.7), 0 2px 6px rgb(0 0 0 / 0.4)`): floating layers only.

### Named Rules

**The Ruled Page Rule.** Separate with rules: 1px hairlines between rows, a 3px double rule under the masthead, page heads, figure breaks and colophon, and the gilt double rule under concordance heads. If a region needs a box to read as a region, use a tonal band instead.

## Shapes

Near-square. Controls take a 2px radius, keycaps 3px with a 2px bottom border, annotation highlights 1px; images, bands and tables are square. Images carry a 1px Ruling Strong border plus a 1px Ruling outline offset 4–5px, a printed double frame. Recurring marks are lozenges: 10px squares rotated 45deg for era marks, trail steps and source swatches. The one curve is the arch: a segmental arcade drawn in the gilt line that stretches with its column while its stroke never scales. Chart bars end in a 4px rounded data end on a square baseline; dots are round.

## Components

### Buttons
Sober and inked; weight comes from the ink, not from colour.
- **Shape:** near-square (2px), 44px tall, 20px side padding, Alegreya Sans 700.
- **Ink:** iron-gall fill, vellum text; hover lifts to Ink Second.
- **Line:** 1px ink outline on transparent; hover fills with ink.
- **Small:** 36px tall, 14px padding, 0.9375rem.
- **Press:** every button, icon button and search trigger scales to 0.97 on `:active` (140ms, exponential ease-out). Disabled sits at 45% opacity.
- **Focus:** a 2px ink outline offset 3px, everywhere.

### Inputs / Fields
- **Style:** 44px, Vellum Sunk well, 1px Ruling Strong stroke, 2px corners; labels above in the Label style, Faded Ink.
- **Focus:** 2px ink outline offset 1px.
- **Checkboxes** take minium as accent colour; selects draw their own chevron.

### Segmented Control
A row of plain-text options inside one Ruling Strong outline with hairline dividers; the pressed option inverts to ink on vellum.

### Navigation
Masthead at 64px, sticky, vellum at 94% with a 6px blur, closed by a 3px double rule. Wordmark in Alegreya 700 with a minium-ink initial. Links in Alegreya Sans 500, Ink Second; the current page gets a 2px minium underline that scales in from the left, and hover previews it at 40%. Below 980px the links drop into a full-width ruled list behind a menu button.

### Era Control (signature)
A radio row of eras (all, c. 60 CE, 1653, 2026) between a strong top rule and a hairline bottom rule. Each era is a lozenge in its source's pigment, an Alegreya year and a label-size "who" line. The checked era fills its lozenge with minium and draws a 2px minium underline. Choosing an era scrapes the name stack: the chosen layer writes back in with a clip-path wipe (620ms) while the other layers fade to 8–14%, and the matching spans light up in the concordance.

### Canon Table (signature)
The concordance. Heads in Alegreya SC 700 at 0.9375rem over a 3px gilt double rule, optionally crowned by a 22px arch; rows separated by hairlines; numbers right-aligned and tabular; lit rows on Vellum Deep, selected rows on a 12% minium wash. Three-era rows (name columns, ways in) use gilt column dividers and a closing gilt double rule. Below 720px every row becomes a stacked record with its column labels inline.

### Findings Band
A full-bleed flat gold field, framed top and bottom by an inset double gilt line, holding three findings in ruled columns: a claim in Alegreya 700 with its figure in 800, a one-colour mini chart in ink on gold, a short body in Gilt Shadow Ink and a link.

### Annotated Text
Herbal text with each claim span underlined in its source pigment over a light wash (1.5px underline, 13–14% wash; 26–28% when its concept is lit). Persisted claims swap to a 2px minium underline; adverse uses dash the underline and drop the wash; the selected span takes a 22% minium wash and a 1px minium ring. Hovering or focusing a span opens an ink gloss tip with the Pop shadow.

### Caution
The responsible-use note. Full tone: a band between two minium hairlines on a 12% minium wash with an Alegreya 700 minium-ink title. Line tone: one sentence at 0.9375rem with an inline warning-triangle SVG in minium ink. Travels with every lead and the clinician path.

### Flags
Small facts set on a lead: Label-size 700 text, 3px 8px padding, a 1px Ruling Strong frame, square. Warning flags (a historical warning, an IUCN threatened status) are set in ink on Vellum Sunk with a 1px Ink Second frame and a 12px warning triangle drawn from the shared warning-icon mask, never in minium, so minium in a lead row still means only persisted.

### Seam Caption
The provenance line under every image and headline figure: Label size, Faded Ink, a hairline above, Greek in Ink Second, max 52ch.

### Command Palette
A modal dialog at 10svh from the top, max 700px, on vellum with a Ruling Strong border and the Pop shadow over a 42% ink scrim. A 60px search field closed by a double rule; results grouped under small-caps minium-ink heads; the active option takes Vellum Deep and a 2px minium left rule. It opens and closes without any transition.

### Charts
SVG on the page ground, Alegreya Sans, 12px tabular ticks, labels haloed with a vellum stroke. Porphyra and verdigris for the two herbals, minium for claimed-by-both and the observed value, null grey for the null and the controls, a 1.25px ink reference line at 1×. Open dots are vellum-filled with a coloured stroke. Each chart has a keyboard-reachable tooltip and a "show the numbers" table. Marks draw in once, left to right (900ms clip-path), the first time the figure scrolls into view.

## Do's and Don'ts

### Do:
- **Do** set the page on the vellum raster (`/img/vellum.webp`, 720px tile) and multiply it into iron-gall night in dark mode; never a flat cream.
- **Do** keep porphyra for Dioscorides and verdigris for Culpeper on every surface, including legends and quotes.
- **Do** reserve minium in data for persisted / claimed-by-both and the observed value; use Minium Ink (#9e2614) whenever minium sets text.
- **Do** divide with hairlines, 3px double rules and gilt arches; put recessed regions on Vellum Deep bands.
- **Do** seam a provenance caption under every image and headline number, and keep every shipped raster in `public/img/credits.json`.
- **Do** tag Greek `lang="grc"` so it falls to GFS Didot.
- **Do** set warning flags in ink with the drawn warning-triangle icon; keep minium for what persisted.
- **Do** keep motion to the one load sequence, the era scrape and the one-time chart draw-in, all on exponential ease-out, and turn all of them off under `prefers-reduced-motion`.
- **Do** keep the command palette, and anything opened from the keyboard, free of motion.

### Don't:
- **Don't** use a gradient on gold, or gold as text colour or control fill.
- **Don't** give minium a series of its own in a chart, or use it to decorate.
- **Don't** put content in cards or rounded boxes; corners stay at 2px or less outside chart bars, dots and keycaps.
- **Don't** add shadows to anything that sits on the page; Pop is for floating layers only.
- **Don't** set Greek in Alegreya, or set any text in Minium (#bd331c) or Gilt Line.
- **Don't** uppercase labels; small capitals come from Alegreya SC.
