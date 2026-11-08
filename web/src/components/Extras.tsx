// Results written by the evaluation step into data/extra/. Each block renders only when its file exists and
// parses; a missing file hides the block entirely (no "coming soon"). Readers are forgiving about shape.
import { useState, type ReactNode } from "react";
import { asArray, num, useResource } from "../lib/data";
import { fmt } from "../lib/format";
import { TableToggle } from "../charts/kit";

type O = Record<string, unknown>;
const isObj = (v: unknown): v is O => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : typeof v === "number" ? String(v) : null);
const pick = (o: O, ...k: string[]) => { for (const x of k) if (o[x] !== undefined && o[x] !== null && o[x] !== "") return o[x]; return undefined; };

/* ------------------------------------------------------------------ expert benchmark */

interface Share { k?: number; n?: number; share?: number; ci95?: number[] }
interface Bench {
  question?: string; caveat?: string; reproduce?: string;
  headline?: Record<string, Share | number>;
  by_confidence?: Record<string, { species_top1?: Share; genus_top1?: Share }>;
  gold?: { citation?: string; data_doi?: string; licence?: string; n_chapters_matched?: number };
  disagreements?: { chapter: string; headword: string; ours: string; confidence?: string; expert_top1?: string[]; genus_agrees?: boolean; note?: string }[];
  staples_check?: { n?: number; n_correct?: number; items?: { plant: string; chapter?: string; headword?: string; ours?: string; ours_accepted?: string; correct?: boolean }[] };
}

const ci = (s?: Share) => (s?.ci95 ? `95% CI ${fmt.pct(s.ci95[0])}–${fmt.pct(s.ci95[1])}` : "");

export function ExpertBenchmark({ heading }: { heading?: (title: string) => ReactNode }) {
  const r = useResource<Bench>("extra/expert_benchmark.json");
  if (r.status !== "ready") return null;
  const b = r.data as Bench;
  if (!b || typeof b !== "object" || !b.headline || typeof b.headline !== "object") return null;
  const h = b.headline as Record<string, Share>;
  const sp = h["species_top1"], spr = h["species_top1_species_rank_ids"], ge = h["genus_top1"], any = h["species_any_candidate"];
  if (!sp?.share) return null;
  const st = b.staples_check;
  return (
    <div className="bench-wrap">
      {heading?.("Checked against experts")}
      <div className="bench">
        <div>
          <p className="part-plain-p">Lardos and colleagues (2024) re-identified Dioscorides’ plants with expert botanists. For the <b>{fmt.int(b.gold?.n_chapters_matched ?? sp.n)}</b> chapters we share, our identification is their top choice in <b>{fmt.pct(sp.share)}</b> of them.</p>
          <p className="bench-caveat">{b.caveat}</p>
        </div>
        <div>
          <dl className="bench-figs">
            <div><dt>Same species</dt><dd><span className="bench-n num">{fmt.pct(sp.share)}</span><span className="bench-ci">{sp.k} of {sp.n} · {ci(sp)}</span></dd></div>
            {spr?.share != null && <div><dt>Where we name a species</dt><dd><span className="bench-n num">{fmt.pct(spr.share)}</span><span className="bench-ci">{spr.k} of {spr.n} · {ci(spr)}</span></dd></div>}
            {ge?.share != null && <div><dt>Same genus</dt><dd><span className="bench-n num">{fmt.pct(ge.share)}</span><span className="bench-ci">{ge.k} of {ge.n} · {ci(ge)}</span></dd></div>}
          </dl>
          <p className="fine">
            {any?.share != null ? <>Our name is among the experts’ candidates in {fmt.pct(any.share)}. </> : null}
            {b.by_confidence ? <>By our own confidence level: {(["high", "medium", "low"] as const).filter((k) => b.by_confidence?.[k]?.species_top1).map((k) => `${k} ${fmt.pct(b.by_confidence![k].species_top1!.share)} (n ${b.by_confidence![k].species_top1!.n})`).join(", ")}, so the confidence labels mean something.</> : null}
          </p>
          {st?.n ? (
            <>
              <p className="fine"><b>Staples check: {st.n_correct} of {st.n}.</b> Everyday plants any reader can verify, each checked against its chapter’s lemma:</p>
              <ul className="staples">{asArray<NonNullable<typeof st.items>[number]>(st.items).map((it) => <li key={it.plant + (it.chapter ?? "")} className={it.correct ? "is-ok" : ""} title={`${it.chapter ?? ""} ${it.headword ?? ""} → ${it.ours_accepted ?? it.ours ?? ""}`}>{it.plant}</li>)}</ul>
            </>
          ) : null}
          {asArray(b.disagreements).length > 0 && (
            <TableToggle label={`Where we disagree (${asArray(b.disagreements).length})`}>
              <table className="ledger ledger--compact disagree">
                <thead><tr><th scope="col">Chapter</th><th scope="col">Ours</th><th scope="col">Experts’ top choice</th><th scope="col">Genus</th></tr></thead>
                <tbody>
                  {asArray<NonNullable<Bench["disagreements"]>[number]>(b.disagreements).map((d) => (
                    <tr key={d.chapter}>
                      <th scope="row"><span className="num">{d.chapter}</span> <span lang="grc" className="grc">{d.headword}</span></th>
                      <td><i>{d.ours}</i>{d.confidence ? <span className="cell-sub">{d.confidence} confidence</span> : null}</td>
                      <td><i>{asArray<string>(d.expert_top1).join(", ")}</i>{d.note ? <span className="cell-sub">{d.note}</span> : null}</td>
                      <td>{d.genus_agrees ? "agrees" : "differs"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableToggle>
          )}
          <p className="fine">Gold: {b.gold?.citation}{b.gold?.data_doi ? <>; data doi:{b.gold.data_doi}</> : null}{b.gold?.licence ? ` (${b.gold.licence.split(" (")[0]})` : ""}. Reproduce: <code>{b.reproduce}</code></p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ tests we wrote down */

interface Test { id: string; area: string | null; q: string | null; expect: string | null; how: string | null; found: string | null; status: string; cmd: string | null; date: string | null; timing: string | null }

function readTests(raw: unknown): { intro: string | null; tests: Test[]; defs: Record<string, string>; timing: string | null } {
  const o = isObj(raw) ? raw : {};
  const rows = Array.isArray(raw) ? raw : asArray<unknown>(pick(o, "tests", "ledger", "hypotheses", "items"));
  const tests = rows.filter(isObj).map((t, i) => ({
    id: str(pick(t, "id", "code", "key")) ?? `T${i + 1}`,
    area: str(pick(t, "area", "group", "section")),
    timing: str(pick(t, "prediction_timing", "timing")),
    q: str(pick(t, "question", "asked", "what_we_asked", "hypothesis", "title")),
    expect: str(pick(t, "prediction", "expected", "what_we_expected", "expectation")),
    how: str(pick(t, "method", "how", "test", "design")),
    found: str(pick(t, "result", "found", "what_we_found", "finding", "outcome_detail")),
    status: (str(pick(t, "status", "outcome", "verdict")) ?? "recorded").toLowerCase(),
    cmd: str(pick(t, "reproduce", "command", "cmd")),
    date: str(pick(t, "date", "written", "registered", "written_down", "recorded")),
  })).filter((t) => t.q);
  const defs = isObj(o["status_definitions"]) ? Object.fromEntries(Object.entries(o["status_definitions"] as O).map(([k, v]) => [k, String(v)])) : {};
  return { intro: str(pick(o, "intro", "note", "summary")), tests, defs, timing: str(pick(o, "timing_note")) };
}

function statusClass(s: string): string {
  if (/did not|not hold|fail|reject|refut/.test(s)) return "failed";
  if (/null|n\.?s\.?|no difference|inconclusive/.test(s)) return "null";
  if (/partial|mixed|weak|indicative|descriptive/.test(s)) return "mixed";
  if (/held|hold|support|confirm|pass|replicat|yes/.test(s)) return "held";
  return "recorded";
}

export function TestsLedger({ heading }: { heading?: (title: string) => ReactNode }) {
  const r = useResource<unknown>("extra/tests_ledger.json");
  const [all, setAll] = useState(false);
  if (r.status !== "ready") return null;
  const { intro, tests, defs, timing } = readTests(r.data);
  if (!tests.length) return null;
  const tally = new Map<string, number>();
  for (const t of tests) tally.set(statusClass(t.status), (tally.get(statusClass(t.status)) ?? 0) + 1);
  const LABEL: Record<string, string> = { held: "held", failed: "did not hold", null: "null", mixed: "indicative", recorded: "recorded" };
  const defOf = (k: string) => defs[LABEL[k]] ?? defs[k] ?? null;
  const list = all ? tests : tests.slice(0, 8);
  return (
    <div className="tests-wrap">
      {heading?.("Tests we wrote down")}
      {intro && <p className="sec-lede">{intro}</p>}
      <p className="sec-lede">Every test behind the explorer, with the prediction it had to meet. Negative and null results stay on the list: they are findings too.</p>
      <p className="ledger-summary">{tests.length} tests: {[...tally.entries()].map(([k, n]) => <span key={k} title={defOf(k) ?? undefined}><span className={`status status--${k}`}>{n} {LABEL[k]}</span></span>)}</p>
      <ol className="ledger-tests">
        {list.map((t) => (
          <li key={t.id} className="test">
            <div>
              <p className="test-id">{t.id}{t.area ? ` · ${t.area}` : ""}</p>
              <p className="test-q">{t.q}</p>
            </div>
            <dl className="test-dl">
              {t.expect && <div><dt>Expected</dt><dd>{t.expect}</dd></div>}
              {t.how && <div><dt>How</dt><dd>{t.how}</dd></div>}
              {t.found && <div><dt>Found</dt><dd>{t.found}</dd></div>}
            </dl>
            <div className="test-status">
              <span className={`status status--${statusClass(t.status)}`}>{t.status.charAt(0).toUpperCase() + t.status.slice(1)}</span>
              {t.timing && <span className="test-cmd">Prediction {t.timing}{t.date ? `; result ${t.date}` : ""}</span>}
              {t.cmd && <code className="test-cmd">{t.cmd}</code>}
            </div>
          </li>
        ))}
      </ol>
      {timing && <p className="fine">{timing}</p>}
      {tests.length > 8 && <p className="more-row"><button type="button" className="btn btn--line btn--small" onClick={() => setAll((v) => !v)}>{all ? "Show fewer" : `Show all ${tests.length} tests`}</button></p>}
    </div>
  );
}

/* ------------------------------------------------------------------ time machine */

interface TMRow { label: string; v: number; lo: number | null; hi: number | null; n: number | null; extra: string | null }

function readTimeMachine(raw: unknown): { question: string | null; answer: string | null; measure: string; rows: TMRow[]; caveat: string | null; cmd: string | null } | null {
  if (!isObj(raw)) return null;
  const arr = asArray<unknown>(pick(raw, "cutoffs", "results", "rows", "by_cutoff", "years")).filter(isObj);
  const rows: TMRow[] = [];
  let measure = "Effect";
  for (const r of arr) {
    const label = str(pick(r, "cutoff", "year", "label", "cutoff_year")) ?? "";
    const effKey = ["odds_ratio", "or", "rate_ratio", "rr", "risk_ratio", "effect", "ratio", "lift"].find((k) => num(r[k]) !== null);
    if (!effKey || !label) continue;
    measure = { odds_ratio: "Odds ratio", or: "Odds ratio", rate_ratio: "Rate ratio", rr: "Rate ratio", risk_ratio: "Risk ratio" }[effKey] ?? "Effect";
    const c = asArray<number>(pick(r, "ci", "ci95", `${effKey}_ci`));
    rows.push({ label, v: num(r[effKey])!, lo: num(c[0]), hi: num(c[1]), n: num(pick(r, "n", "n_pairs", "n_obs")), extra: str(pick(r, "note", "summary")) });
  }
  // shape written by scripts/time_machine.py: headline.OR_both_by_cutoff = {year: [or, lo, hi]}
  const hl = isObj(raw["headline"]) ? (raw["headline"] as O) : null;
  if (!rows.length && hl && isObj(hl["OR_both_by_cutoff"])) {
    measure = "Odds ratio";
    for (const [y, v] of Object.entries(hl["OR_both_by_cutoff"] as O)) {
      const a = asArray<number>(v);
      if (num(a[0]) !== null) rows.push({ label: `Unstudied in ${y}`, v: a[0], lo: num(a[1]), hi: num(a[2]), n: null, extra: null });
    }
  }
  if (!rows.length) return null;
  const join = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").join(Array.isArray(v) && /python|PYTHON/.test(String(v[0])) ? " && " : " ") : str(v));
  const verdict = str(pick(raw, "answer", "verdict", "finding", "summary"));
  return {
    question: str(pick(raw, "question")), answer: verdict ? ((x) => x.charAt(0).toUpperCase() + x.slice(1))(verdict.replace(/^(HELD|NULL|DID NOT HOLD):\s*/i, "")) : null,
    measure, rows, caveat: join(pick(raw, "caveat", "caveats", "limitations")), cmd: join(pick(raw, "reproduce", "command")),
  };
}

export function TimeMachine({ heading }: { heading?: (title: string) => ReactNode }) {
  const r = useResource<unknown>("extra/time_machine.json");
  if (r.status !== "ready") return null;
  const tm = readTimeMachine(r.data);
  if (!tm) return null;
  const vals = tm.rows.flatMap((x) => [x.v, x.lo ?? x.v, x.hi ?? x.v]);
  const lo = Math.min(0.5, ...vals) * 0.9, hi = Math.max(2, ...vals) * 1.1;
  const W = 620, rowH = 34, m = { l: 140, r: 40, t: 24 };
  const H = m.t + tm.rows.length * rowH + 30;
  const x = (v: number) => m.l + ((Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * (W - m.l - m.r);
  const ticks = [0.5, 1, 1.5, 2, 3, 4, 5].filter((t) => t >= lo && t <= hi);
  return (
    <div className="tm-wrap">
      {heading?.("The time machine")}
      {tm.question && <p className="fig-take">{tm.question}</p>}
      {tm.answer && <p className="flow-take">{tm.answer}</p>}
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg tm-svg" role="img" aria-label={`${tm.measure} by cutoff year: ${tm.rows.map((r) => `${r.label} ${fmt.two(r.v)}`).join(", ")}`} style={{ width: "100%", maxWidth: W, height: "auto" }}>
        {ticks.map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={m.t - 8} y2={H - 26} className={t === 1 ? "ref-line" : "grid"} /><text x={x(t)} y={H - 8} textAnchor="middle" className="tick">{t}</text></g>)}
        {tm.rows.map((r, i) => {
          const y = m.t + i * rowH + rowH / 2;
          const open = r.lo !== null && r.hi !== null && r.lo <= 1 && r.hi >= 1;
          return (
            <g key={r.label}>
              <text x={m.l - 12} y={y} dy="0.32em" textAnchor="end" className="row-label">{r.label}</text>
              {r.lo !== null && r.hi !== null && <line x1={x(r.lo)} x2={x(r.hi)} y1={y} y2={y} className="ci ci--both" />}
              <circle cx={x(r.v)} cy={y} r={6} className={`dot dot--both ${open ? "is-open" : ""}`} />
              <text x={x(r.hi ?? r.v) + 8} y={y} dy="0.32em" className="annot">{fmt.two(r.v)}</text>
            </g>
          );
        })}
      </svg>
      <p className="chart-axis-note">{tm.measure} that a pair with no paper by the cutoff year gained one afterwards, claimed by both herbals against unclaimed indications of the same plants; log scale; the line at 1 is no difference.{tm.caveat ? ` ${tm.caveat}` : ""}{tm.cmd ? <> Reproduce: <code>{tm.cmd}</code></> : null}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ mechanism and modern hazard (dossier) */

interface MechPath { compound?: string; chembl?: string; target?: string; ensembl?: string; pchembl?: number; ot_score?: number }
interface MechHazard { compound?: string; pubchem_cid?: number; ghs?: string[]; flags?: string[]; ubiquitous?: boolean }
interface MechLead {
  rank?: number; disease_id?: string | null; paths?: MechPath[];
  stats?: { n_active_compounds?: number; n_targets?: number; n_targets_associated?: number; share_targets_associated?: number };
  background?: { share_lead_disease?: number; median_share_other_diseases?: number; percentile_among_diseases?: number };
  modern_hazard?: MechHazard[];
}
interface Mech { caveat?: string; reproduce?: string; leads?: MechLead[] }

const FLAG: Record<string, string> = { acute_toxicity: "acute toxicity", carcinogenic_mutagenic_reprotoxic: "carcinogenic, mutagenic or reprotoxic", organ_toxicity: "organ toxicity" };

export function Mechanism({ rank, label }: { rank: number; label: string }) {
  const r = useResource<Mech>("extra/mechanism.json");
  if (r.status !== "ready") return null;
  const m = asArray<MechLead>(r.data?.leads).find((x) => x.rank === rank);
  if (!m) return null;
  const paths = asArray<MechPath>(m.paths);
  const hz = asArray<MechHazard>(m.modern_hazard).filter((h) => asArray(h.ghs).length);
  return (
    <>
      <section className="dossier-sec" aria-labelledby="dmech">
        <h2 id="dmech">A possible molecular route</h2>
        {paths.length ? (
          <>
            <ol className="mech-paths">
              {paths.slice(0, 4).map((p, i) => (
                <li key={i} className="mech-path">
                  <span className="mech-node">{p.compound}</span><span className="mech-edge" aria-hidden="true" /><span className="mech-node mech-node--t">{p.target}</span><span className="mech-edge" aria-hidden="true" /><span className="mech-node mech-node--d">{label}</span>
                  <span className="mech-nums">pChEMBL <span className="num">{fmt.two(p.pchembl)}</span> · Open Targets <span className="num">{fmt.two(p.ot_score)}</span></span>
                </li>
              ))}
            </ol>
            {m.stats?.n_targets ? <p className="fine">{fmt.int(m.stats.n_active_compounds)} active constituents reach {fmt.int(m.stats.n_targets)} human targets; {fmt.int(m.stats.n_targets_associated)} ({fmt.pct(m.stats.share_targets_associated)}) are associated with this indication{m.background?.median_share_other_diseases != null ? <>, against {fmt.pct(m.background.median_share_other_diseases)} for the median other disease</> : null}.</p> : null}
          </>
        ) : <p className="fine">No constituent with a potent human-target activity reaches a target associated with this indication.</p>}
        <p className="fine">{r.data?.caveat}</p>
      </section>
      {hz.length > 0 && (
        <section className="dossier-sec" aria-labelledby="dhaz">
          <h2 id="dhaz">Modern hazard classes</h2>
          <ul className="hazards">
            {hz.slice(0, 6).map((h) => (
              <li key={h.compound}>
                <b>{h.compound}</b> <span className="num">{asArray<string>(h.ghs).join(", ")}</span>
                {asArray<string>(h.flags).length > 0 && <span className="cell-sub">{asArray<string>(h.flags).map((f) => FLAG[f] ?? f.replace(/_/g, " ")).join("; ")}{h.ubiquitous ? " · common to many plants" : ""}</span>}
              </li>
            ))}
          </ul>
          <p className="fine">PubChem GHS statements for the pure constituent, not for the plant.</p>
        </section>
      )}
    </>
  );
}
