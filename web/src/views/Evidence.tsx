import { useResource, type StatsRaw } from "../lib/data";
import {
  categoriesAreShares, modelNote, readCategories, readLift, readPersistence, readRegression, readSensitivity, readTransmitted, type Interval,
} from "../lib/stats";
import { fmt } from "../lib/format";
import { href } from "../lib/router";
import { CategoryBars, IntervalChart, NullHistogram } from "../charts/Charts";
import { Empty, ErrorState, Skeleton } from "../components/ui";

const TONE: Record<string, "ref" | "dsc" | "cul" | "mod"> = { unclaimed: "ref", dsc_only: "dsc", cul_only: "cul", persistent: "mod", both: "mod" };
const crosses = (r: Interval) => r.lo !== null && r.hi !== null && r.lo <= 1 && r.hi >= 1;
const ci = (r: Interval | undefined) => (r && r.lo !== null && r.hi !== null ? `95% CI ${fmt.two(r.lo)} to ${fmt.two(r.hi)}` : "");

export function Evidence() {
  const stats = useResource<StatsRaw>("stats.json");
  const s = stats.data;
  const persistence = readPersistence(s);
  const sens = readSensitivity(s);
  const share = readLift(s, "share");
  const median = readLift(s, "median");
  const logit = readRegression(s, "logit");
  const poisson = readRegression(s, "poisson");
  const cats = readCategories(s);
  const shares = categoriesAreShares(cats);
  const top = readTransmitted(s);
  const both = logit.find((r) => r.key === "both" || r.key === "persistent");
  const bothRR = poisson.find((r) => r.key === "both" || r.key === "persistent");
  const shareBoth = share.find((r) => r.key === "both" || r.key === "persistent");
  const shareNone = share.find((r) => r.key === "unclaimed");
  const logitModel = modelNote(s, "logit");

  return (
    <div className="container page">
      <header className="page-head">
        <h1 id="page-title" tabIndex={-1}>Persistence and evidence</h1>
        <p className="page-lede">Does Culpeper repeat Dioscorides more than chance allows, and has modern research looked at what they agree on?</p>
      </header>
      {stats.status === "loading" && <Skeleton rows={10} label="Reading stats.json" />}
      {stats.status === "error" && <ErrorState what="The statistics file" error={stats.error} retry={stats.retry} />}
      {stats.status === "ready" && (
        <>
          {(both || bothRR) && (
            <section className="verdict" aria-labelledby="verdict-title">
              <h2 id="verdict-title" className="visually-hidden">The reading in two figures</h2>
              {both && (
                <div className="verdict-item">
                  <p className="verdict-figure">{fmt.two(both.value)}×</p>
                  <p className="verdict-label">Odds that modern research has looked at all at an indication both herbals claim, against unclaimed indications of the same plants.</p>
                  <p className="verdict-detail">Logit odds ratio, {ci(both)}{both.p !== null ? `, ${fmt.p(both.p)}` : ""}{shareBoth && shareNone ? `. ${fmt.pct(shareBoth.value)} of such pairs have a paper, against ${fmt.pct(shareNone.value)}.` : "."}</p>
                </div>
              )}
              {bothRR && (
                <div className="verdict-item">
                  <p className="verdict-figure">{fmt.two(bothRR.value)}×</p>
                  <p className="verdict-label">Papers per pair once a pair is studied at all{crosses(bothRR) ? ": no more for persistent claims than for unclaimed ones." : "."}</p>
                  <p className="verdict-detail">Poisson rate ratio, {ci(bothRR)}{bothRR.p !== null ? `, ${fmt.p(bothRR.p)}` : ""}. Noticed but not followed up: the gap the <a href={href("/leads")}>leads</a> target.</p>
                </div>
              )}
            </section>
          )}

          <div className="figures">
            <figure className="fig fig--wide" aria-labelledby="f1-title">
              <div className="fig-head">
                <h2 id="f1-title">Agreement beyond chance</h2>
                <p className="fig-take">
                  {persistence?.observed != null && persistence.nullMean != null
                    ? <>The herbals share {fmt.int(persistence.observed)} plant-indication claims{persistence.nTaxa ? <> across {fmt.int(persistence.nTaxa)} species</> : null}; label permutations give about {fmt.int(persistence.nullMean)}{persistence.ratio ? <>, a fold enrichment of {fmt.one(persistence.ratio)}</> : null}.</>
                    : "Observed agreement against a permutation null."}
                </p>
              </div>
              {persistence && persistence.bins.length ? <NullHistogram data={persistence} /> : <Empty title="No permutation null in stats.json." />}
              <figcaption className="fig-cap">
                {persistence?.nPerm ? `${fmt.int(persistence.nPerm)} permutations` : "Permutation null"}{persistence?.p != null ? `, ${fmt.p(persistence.p)}` : ""}. The accent rule is the observed count.
              </figcaption>
              {sens.length > 0 && (
                <table className="ledger ledger--compact sens">
                  <caption className="sens-cap">The result under stricter and looser matching</caption>
                  <thead><tr><th scope="col">Analysis</th><th scope="col" className="num">Shared</th><th scope="col" className="num">Expected</th><th scope="col" className="num">Fold</th><th scope="col" className="num">Species</th><th scope="col" className="num">p</th></tr></thead>
                  <tbody>
                    {persistence && <tr><th scope="row">Species level (main)</th><td className="num">{fmt.int(persistence.observed)}</td><td className="num">{fmt.int(persistence.nullMean)}</td><td className="num">{fmt.two(persistence.ratio)}</td><td className="num">{fmt.int(persistence.nTaxa)}</td><td className="num">{fmt.p(persistence.p).replace("p ", "")}</td></tr>}
                    {sens.map((r) => <tr key={r.key}><th scope="row">{r.label}</th><td className="num">{fmt.int(r.observed)}</td><td className="num">{fmt.int(r.nullMean)}</td><td className="num">{fmt.two(r.fold)}</td><td className="num">{fmt.int(r.nTaxa)}</td><td className="num">{fmt.p(r.p).replace("p ", "")}</td></tr>)}
                  </tbody>
                </table>
              )}
            </figure>

            <figure className="fig" aria-labelledby="f2-title">
              <div className="fig-head">
                <h2 id="f2-title">Has anyone looked at all?</h2>
                <p className="fig-take">Odds that a plant-indication pair has at least one co-mentioning paper, against indications neither herbal claims for that plant.</p>
              </div>
              {logit.length ? (
                <IntervalChart rows={logit} log reference={1} tone={(r) => TONE[r.key] ?? "ref"} hollow={crosses} valueLabel="Odds ratio" format={(v) => fmt.two(v)}
                  ariaLabel={`Forest plot of ${logit.length} logit odds ratios on a log scale, with 95% intervals and a reference line at 1.`} />
              ) : <Empty title="No logit model in stats.json." />}
              <figcaption className="fig-cap">Primary model{logitModel ? `: ${logitModel}` : ""}. Log scale; the rule marks an odds ratio of 1; hollow points have intervals that cross it.</figcaption>
            </figure>

            <figure className="fig" aria-labelledby="f3-title">
              <div className="fig-head">
                <h2 id="f3-title">Once studied, how much?</h2>
                <p className="fig-take">Rate ratios for the number of co-mentioning papers, the secondary model.</p>
              </div>
              {poisson.length ? (
                <IntervalChart rows={poisson} log reference={1} tone={(r) => TONE[r.key] ?? "ref"} hollow={crosses} valueLabel="Rate ratio" format={(v) => fmt.two(v)}
                  ariaLabel={`Forest plot of ${poisson.length} Poisson rate ratios on a log scale, with 95% intervals and a reference line at 1.`} />
              ) : <Empty title="No Poisson model in stats.json." />}
              <figcaption className="fig-cap">Poisson with plant fixed effects. Log scale; hollow points have intervals that cross 1.</figcaption>
            </figure>

            <figure className="fig" aria-labelledby="f4-title">
              <div className="fig-head">
                <h2 id="f4-title">Pairs with any modern paper</h2>
                <p className="fig-take">Share of plant-indication pairs with at least one co-mentioning paper, by who claimed them.</p>
              </div>
              {share.length ? (
                <IntervalChart rows={share} reference={0} tone={(r) => TONE[r.key] ?? "ref"} valueLabel="Share" format={(v) => fmt.pct(v)} tickFormat={(v) => fmt.pct(v)}
                  ariaLabel={`Share of pairs with any paper for ${share.length} groups, with 95% intervals.`} />
              ) : <Empty title="No lift_by_group block in stats.json." />}
              <figcaption className="fig-cap">
                Lines are 95% intervals. Median lift per group: {median.map((r) => `${r.label.toLowerCase()} ${fmt.two(r.value)}`).join(", ") || "n/a"}.
              </figcaption>
            </figure>

            <figure className="fig" aria-labelledby="f5-title">
              <div className="fig-head">
                <h2 id="f5-title">The indications that travelled</h2>
                <p className="fig-take">Indications most often claimed for the same plant by both authors, against the number expected by chance.</p>
              </div>
              {top.length ? (
                <table className="ledger ledger--compact">
                  <thead><tr><th scope="col">Indication</th><th scope="col" className="num">Both</th><th scope="col" className="num">Expected</th><th scope="col" className="num">Fold</th></tr></thead>
                  <tbody>
                    {top.slice(0, 12).map((r) => (
                      <tr key={r.concept_id}>
                        <th scope="row">{r.label}<span className="cell-sub">{r.category}</span></th>
                        <td className="num">{fmt.int(r.both)}</td><td className="num">{fmt.one(r.expected)}</td><td className="num">{fmt.two(r.fold)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <Empty title="No top_transmitted block in stats.json." />}
            </figure>

            <figure className="fig fig--wide" aria-labelledby="f6-title">
              <div className="fig-head">
                <h2 id="f6-title">What each herbal treats</h2>
                <p className="fig-take">Share of each herbal’s extracted claims per therapeutic category.</p>
              </div>
              {cats.length ? <CategoryBars rows={cats} sharesOnly={shares} /> : <Empty title="No categories block in stats.json." />}
            </figure>
          </div>
        </>
      )}
    </div>
  );
}
