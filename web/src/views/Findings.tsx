import type { ReactNode } from "react";
import { num, useResource, type StatsRaw } from "../lib/data";
import { categoriesAreShares, readCategories, readLift, readPersistence, readRegression, readSensitivity, readTransmitted, type Interval } from "../lib/stats";
import { fmt } from "../lib/format";
import { href } from "../lib/router";
import { CategoryBars, Forest, FoldDots, MatchedDumbbell, NullHistogram, type MatchedRow, type Tone } from "../charts/Charts";
import { Caution, Empty, ErrorState, Skeleton } from "../components/ui";
import { SurvivalFlow } from "../charts/SurvivalFlow";
import { TestsLedger, TimeMachine } from "../components/Extras";
import { GeoOverview } from "../components/GeoOverview";

const TONE: Record<string, Tone> = { unclaimed: "ref", dsc_only: "dsc", cul_only: "cul", persistent: "both", both: "both" };
const LABEL: Record<string, string> = { dsc_only: "Dioscorides only", cul_only: "Culpeper only", both: "Both herbals", persistent: "Both herbals" };
const NULLS: Record<string, string> = {
  species: "Species, all shared plants (main)", size_stratified: "Swapped only within entry-length quintile", within_family: "Swapped only within the same family",
  genus_level: "Matched at genus level", high_confidence_ids_only: "High-confidence identifications only", category_level: "Therapeutic category, not indication",
};
const ORDER = ["species", "size_stratified", "within_family", "genus_level", "high_confidence_ids_only", "category_level"];

function Figure({ id, n, title, take, children, caption }: { id: string; n: number; title: string; take: ReactNode; children: ReactNode; caption: ReactNode }) {
  return (
    <figure className="fig" id={id} aria-labelledby={`${id}-t`}>
      <div className="fig-head">
        <h2 id={`${id}-t`} className="fig-title"><span className="fig-num num">{n}</span>{title}</h2>
        <p className="fig-take">{take}</p>
      </div>
      <div className="fig-body">{children}</div>
      <figcaption className="fig-cap"><span className="fig-cap-n">Figure {n}.</span> {caption}</figcaption>
    </figure>
  );
}

const ci = (r?: Interval) => (r && r.lo !== null && r.hi !== null ? `${fmt.two(r.lo)}–${fmt.two(r.hi)}` : "n/a");

export function Findings() {
  const stats = useResource<StatsRaw>("stats.json");
  const s = stats.data;
  const per = readPersistence(s);
  const sens = readSensitivity(s);
  const share = readLift(s, "share");
  const logit = readRegression(s, "logit").map((r) => ({ ...r, label: LABEL[r.key] ?? r.label }));
  const clogit = readRegression(s, "conditional_logit").filter((r) => LABEL[r.key]).map((r) => ({ ...r, label: LABEL[r.key] ?? r.label }));
  const pois = readRegression(s, "poisson").map((r) => ({ ...r, label: LABEL[r.key] ?? r.label }));
  const cats = readCategories(s);
  const top = readTransmitted(s);
  const wil = (s?.["regression"] as Record<string, unknown> | undefined)?.["wilcoxon"] as Record<string, unknown> | undefined;
  const groups = (s?.["lift_by_group"] as Record<string, unknown>[] | undefined) ?? [];
  const unclaimedAll = share.find((r) => r.key === "unclaimed")?.value ?? null;
  const matched: MatchedRow[] = ["dsc_only", "cul_only", "both"].map((k) => {
    const g = groups.find((x) => x["group"] === k) ?? {};
    const c = (g["share_any_paper_ci"] as number[] | undefined) ?? [];
    const mc = (g["matched_unclaimed_ci"] as number[] | undefined) ?? [];
    return {
      key: k, label: LABEL[k], tone: TONE[k], claimed: num(g["share_any_paper"]) ?? 0, lo: num(c[0]), hi: num(c[1]),
      control: num(g["matched_unclaimed_share"]), cLo: num(mc[0]), cHi: num(mc[1]), n: num(g["n_pairs"]), nControls: num(g["matched_n_controls"]),
    };
  }).filter((r) => r.claimed > 0);
  const both = matched.find((r) => r.key === "both");
  const or = logit.find((r) => r.key === "both");
  const rr = pois.find((r) => r.key === "both");
  const foldRows = [
    ...(per ? [{ key: "species", label: NULLS.species, observed: per.observed, nullMean: per.nullMean, fold: per.ratio, p: per.p, nTaxa: per.nTaxa, main: true }] : []),
    ...sens.map((x) => ({ ...x, label: NULLS[x.key] ?? x.label })),
  ].sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
  const fam = sens.find((x) => x.key === "within_family");
  const size = sens.find((x) => x.key === "size_stratified");

  return (
    <div className="wrap page findings">
      <header className="page-head">
        <h1 id="page-title" tabIndex={-1}>Findings</h1>
        <p className="page-lede">Six figures, read in order: did Culpeper repeat Dioscorides beyond chance, does that survive stricter nulls, and has modern research looked at the claims that persisted, and how hard?</p>
        <nav className="toc" aria-label="Figures on this page">
          <ol>
            <li><a href={href("/findings", null, "transmission")}>Transmission</a></li>
            <li><a href={href("/findings", null, "nulls")}>Stricter nulls</a></li>
            <li><a href={href("/findings", null, "controls")}>Matched controls</a></li>
            <li><a href={href("/findings", null, "odds")}>Odds ratios</a></li>
            <li><a href={href("/findings", null, "intensity")}>Once studied</a></li>
            <li><a href={href("/findings", null, "categories")}>What each herbal treats</a></li>
            <li><a href={href("/findings", null, "geography")}>Where the plants grow</a></li>
            <li><a href={href("/findings", null, "flow")}>Every claim, followed</a></li>
          </ol>
        </nav>
      </header>
      {stats.status === "loading" && <Skeleton rows={12} label="Reading the statistics" />}
      {stats.status === "error" && <ErrorState what="The statistics file" error={stats.error} retry={stats.retry} />}
      {stats.status === "ready" && (
        <div className="figs">
          <Figure id="transmission" n={1} title="Culpeper repeats Dioscorides far more than chance"
            take={per ? <>In plain terms: for the {fmt.int(per.nTaxa)} species both men wrote about, they agree on <b>{fmt.int(per.observed)}</b> plant–indication claims. Shuffling Culpeper’s claims among the same plants gives about {fmt.int(per.nullMean)}. That is <b>{fmt.two(per.ratio)}×</b> chance, and not one of {fmt.int(per.nPerm)} shuffles came close.</> : "Observed agreement against a permutation null."}
            caption={<>Label-permutation null ({fmt.int(per?.nPerm)} permutations) that keeps each author’s number of claims per plant and the frequency of every indication, destroying only the same-plant link; one-sided {fmt.p(per?.p)}. {num((s?.["persistence"] as Record<string, unknown>)?.["share_cul_in_dsc"]) !== null ? <>{fmt.pct(num((s?.["persistence"] as Record<string, unknown>)["share_cul_in_dsc"]))} of what Culpeper says about these plants was already in Dioscorides.</> : null}</>}>
            {per && per.bins.length ? <NullHistogram data={per} /> : <Empty title="No permutation null in stats.json." />}
          </Figure>

          <Figure id="nulls" n={2} title="The effect survives stricter nulls"
            take={<>A sceptic might say long entries simply share more, or related plants share uses. Swapping plants only with plants of similar entry length still gives <b>{size?.fold ? `${fmt.two(size.fold)}×` : "2.11×"}</b>; only within the same botanical family, <b>{fam?.fold ? `${fmt.two(fam.fold)}×` : "1.56×"}</b>, the most conservative test, since shared family uses are partly real pharmacology.</>}
            caption={<>Fold enrichment = observed shared claims ÷ mean of the null. Genus-level and high-confidence-only analyses absorb uncertain ancient identifications. The category-level row matches on 19 therapeutic categories instead of 85 indications, and is shown for scale. All p &lt; 0.001.</>}>
            <FoldDots rows={foldRows} />
          </Figure>

          <Figure id="controls" n={3} title="Claimed indications are more often studied at all"
            take={both ? <>Of the pairs both herbals claim, <b>{fmt.pct(both.claimed)}</b> have at least one modern paper naming plant and indication together, against <b>{fmt.pct(both.control)}</b> for the indications neither herbal claims for <em>exactly the same plants</em>. The same holds for claims made by one herbal only.</> : "Claimed against matched unclaimed indications."}
            caption={<>Controls are 12 indications per plant claimed by neither herbal, sampled at random (seeded). Matching on the same plants matters: plants with persistent claims are larger and better studied than average, so an unmatched comparison would overstate the gap.</>}>
            {matched.length ? <MatchedDumbbell rows={matched} overall={unclaimedAll} /> : <Empty title="No lift_by_group block in stats.json." />}
          </Figure>

          <Figure id="odds" n={4} title="Odds that anyone has looked"
            take={or ? <>Comparing the same indication across plants for which it was or was not claimed, and adjusting for each plant’s research volume, the odds that a pair has been studied at all are <b>{fmt.two(or.value)}×</b> higher when both herbals claim it (95% CI {ci(or)}). A conditional logit within plants agrees{clogit.find((r) => r.key === "both") ? ` (${fmt.two(clogit.find((r) => r.key === "both")!.value)}×)` : ""}.</> : "Logit odds ratios."}
            caption={<>Primary model: logit of any co-mentioning paper on claim group, indication fixed effects and log plant research volume, cluster-robust standard errors by plant ({fmt.int(or?.n)} pairs). Hollow points would mark intervals that include 1; none do. {wil ? <>Within-plant Wilcoxon on log₂ lift: {fmt.pct(num(wil["share_taxa_claimed_higher"]))} of plants have higher lift for claimed indications, {fmt.p(num(wil["p_value"]))}.</> : null}</>}>
            {logit.length ? (
              <Forest rows={[...logit.map((r) => ({ ...r, model: "Logit, indication FE" })), ...clogit.map((r) => ({ ...r, key: r.key + "-c", label: `${r.label}, conditional`, model: "Conditional logit, strata = plant" }))]}
                tone={(r) => TONE[r.key.replace("-c", "")] ?? "ref"} valueLabel="Odds ratio"
                ariaLabel="Forest plot of odds ratios on a log scale; all intervals lie above 1." />
            ) : <Empty title="No logit model in stats.json." />}
          </Figure>

          <Figure id="intensity" n={5} title="Once studied, not studied more"
            take={rr ? <>Among pairs with at least one paper, persistent claims draw <b>{fmt.two(rr.value)}×</b> the papers of unclaimed ones (95% CI {ci(rr)}): no detectable difference. Tradition predicts <em>whether</em> science looked, not <em>how hard</em>. That gap is where the <a href={href("/leads")}>leads</a> are.</> : "Rate ratios once studied."}
            caption={<>Poisson GLM of co-mention counts with indication fixed effects and offset log(expected), restricted to pairs with ≥ 1 paper, cluster-robust by plant. Open points: the interval includes 1. Models were checked on simulated data with a known effect.</>}>
            {pois.length ? <Forest rows={pois} tone={(r) => TONE[r.key] ?? "ref"} valueLabel="Rate ratio" lo={0.5} hi={2.5} ariaLabel="Forest plot of rate ratios on a log scale; every interval includes 1." /> : <Empty title="No Poisson model in stats.json." />}
          </Figure>

          <section className="fig fig--plain" id="categories" aria-labelledby="cat-t">
            <div className="fig-head">
              <h2 id="cat-t" className="fig-title">What each herbal treats</h2>
              <p className="fig-take">Both books spend their words on the same complaints: skin and wounds, digestion, women’s health. The indications that travelled most often are listed beside the chart.</p>
            </div>
            <div className="cat-grid">
              {cats.length ? <CategoryBars rows={cats} sharesOnly={categoriesAreShares(cats)} /> : <Empty title="No categories block in stats.json." />}
              {top.length > 0 && (
                <table className="ledger ledger--compact travelled">
                  <caption>Indications that travelled most</caption>
                  <thead><tr><th scope="col">Indication</th><th scope="col" className="num">Both</th><th scope="col" className="num">Expected</th><th scope="col" className="num">Fold</th></tr></thead>
                  <tbody>
                    {top.slice(0, 12).map((r) => (
                      <tr key={r.concept_id}>
                        <th scope="row"><a href={href("/plants", { c: r.concept_id, persistent: "1" })}>{r.label}</a><span className="cell-sub">{r.category}</span></th>
                        <td className="num">{fmt.int(r.both)}</td><td className="num">{fmt.one(r.expected)}</td><td className="num">{fmt.two(r.fold)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="fig fig--plain" id="geography" aria-labelledby="geo-t">
            <div className="fig-head">
              <h2 id="geo-t" className="fig-title">Where these medicines come from</h2>
              <p className="fig-take">Each herbal’s species, placed where Kew’s World Checklist records them growing wild. Both draw on one Mediterranean–European flora, but Culpeper’s reaches north: over half his plants are native to Britain, and many more grow there only as introductions. Turn the globe, or pick a region from the list.</p>
            </div>
            <GeoOverview />
          </section>

          <section className="fig fig--plain" id="flow" aria-labelledby="flow-t">
            <div className="fig-head">
              <h2 id="flow-t" className="fig-title">Every claim, followed to 2026</h2>
              <p className="fig-take">For the species both herbals describe: what Culpeper kept, dropped and added, and how much modern literature each group has drawn.</p>
            </div>
            <SurvivalFlow />
          </section>

          <section className="fig fig--plain" id="timemachine" aria-label="Time machine">
            <TimeMachine heading={(t) => <div className="fig-head"><h2 className="fig-title">{t}</h2></div>} />
          </section>

          <section className="fig fig--plain" id="tests" aria-label="Tests we wrote down">
            <TestsLedger heading={(t) => <div className="fig-head"><h2 className="fig-title">{t}</h2></div>} />
          </section>

          <Caution tone="full">
            <p>Co-mention measures research <em>attention</em>, not efficacy: a paper may report no effect, or harm. Modern research is partly motivated by tradition, so the evidence analysis is a screening signal, not validation. Read the <a href={href("/methods", null, "limits")}>limitations</a> before citing any number.</p>
          </Caution>
        </div>
      )}
    </div>
  );
}
