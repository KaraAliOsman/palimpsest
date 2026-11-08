import { useRef, useState } from "react";
import { barRight, barUp, ChartTip, logTicks, niceTicks, TableToggle, useInView, useTip, useWidth } from "./kit";
import { fmt } from "../lib/format";
import type { CategoryRow, Interval, Persistence, Sensitivity } from "../lib/stats";

export type Tone = "dsc" | "cul" | "both" | "ref";

function Frame({ children, label, className }: { children: (w: number) => React.ReactNode; label?: string; className?: string }) {
  const [wrap, w] = useWidth<HTMLDivElement>();
  const [view, seen] = useInView<HTMLDivElement>();
  return (
    <div ref={view} className={`chart-canvas ${seen ? "is-drawn" : ""} ${className ?? ""}`} aria-label={label}>
      <div ref={wrap}>{w > 0 && children(Math.max(280, w))}</div>
    </div>
  );
}

/* ------------------------------------------------ observed vs permutation null */

export function NullHistogram({ data }: { data: Persistence }) {
  const frame = useRef<HTMLDivElement>(null);
  const { tip, bind } = useTip(frame);
  const bins = data.bins;
  const obs = data.observed;
  const total = bins.reduce((a, b) => a + b.count, 0);
  return (
    <div className="chart" ref={frame}>
      <Frame>
        {(W) => {
          const H = W < 520 ? 240 : 300, m = { t: 56, r: 16, b: 40, l: 48 };
          const xs = [...bins.flatMap((b) => [b.x0, b.x1]), 0, ...(obs !== null ? [obs] : [])];
          const lo = 0, hi = Math.max(...xs) * 1.06;
          const ymax = Math.max(1, ...bins.map((b) => b.count));
          const x = (v: number) => m.l + ((v - lo) / (hi - lo)) * (W - m.l - m.r);
          const y = (v: number) => H - m.b - (v / ymax) * (H - m.t - m.b);
          const xt = niceTicks(lo, hi, W < 520 ? 4 : 7);
          const yt = niceTicks(0, ymax, 3);
          const obsX = obs !== null ? x(obs) : null;
          return (
            <svg width={W} height={H} role="img" className="chart-svg" aria-label={`Histogram of ${fmt.int(total)} permuted counts of shared claims, centred near ${fmt.int(data.nullMean)}; the observed count of ${fmt.int(obs)} lies far to the right.`}>
              {yt.map((t) => (
                <g key={t}>
                  <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="grid" />
                  <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tick">{fmt.int(t)}</text>
                </g>
              ))}
              {xt.map((t) => <text key={t} x={x(t)} y={H - m.b + 22} textAnchor="middle" className="tick">{fmt.int(t)}</text>)}
              <g className="plot">
                {bins.map((b, i) => {
                  const bx = x(b.x0) + 1, bw = Math.max(1, x(b.x1) - x(b.x0) - 2);
                  const top = y(b.count);
                  return (
                    <g key={i} className="mark-hit" {...bind([`${fmt.int(b.count)} permutations`, `${fmt.int(b.x0)} to ${fmt.int(b.x1)} shared claims`])} aria-label={`${fmt.int(b.x0)} to ${fmt.int(b.x1)} shared claims: ${b.count} permutations`}>
                      <rect x={bx} y={m.t} width={bw} height={H - m.b - m.t} className="hit" />
                      {b.count > 0 && <path d={barUp(bx, top, bw, H - m.b - top)} className="mark mark--ref" />}
                    </g>
                  );
                })}
              </g>
              {data.nullMean !== null && (
                <g>
                  <line x1={x(data.nullMean)} x2={x(data.nullMean)} y1={m.t - 18} y2={m.t - 4} className="leader" />
                  <text x={x(data.nullMean)} y={m.t - 24} textAnchor="middle" className="annot">chance ≈ {fmt.int(data.nullMean)}</text>
                </g>
              )}
              {obsX !== null && (
                <g className="obs">
                  <line x1={obsX} x2={obsX} y1={m.t - 18} y2={H - m.b} className="mark-line mark-line--both" />
                  <circle cx={obsX} cy={H - m.b} r={6} className="dot dot--both" />
                  <text x={obsX - 8} y={m.t - 24} textAnchor="end" className="annot annot--strong">observed {fmt.int(obs)}</text>
                </g>
              )}
              <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} className="axis" />
            </svg>
          );
        }}
      </Frame>
      <p className="chart-axis-note">Shared plant–indication claims per permutation of Culpeper’s claim sets among the {fmt.int(data.nTaxa)} shared species; bars count permutations.</p>
      <ChartTip tip={tip} />
      <TableToggle label="Show the numbers">
        <table className="ledger ledger--compact">
          <thead><tr><th scope="col">Shared claims</th><th scope="col" className="num">Permutations</th></tr></thead>
          <tbody>
            {bins.filter((b) => b.count > 0).map((b, i) => <tr key={i}><td className="num">{fmt.int(b.x0)} to {fmt.int(b.x1)}</td><td className="num">{fmt.int(b.count)}</td></tr>)}
            <tr><td>Observed</td><td className="num">{fmt.int(obs)}</td></tr>
          </tbody>
        </table>
      </TableToggle>
    </div>
  );
}

/* ------------------------------------------------ stricter nulls: fold enrichment per design */

export function FoldDots({ rows }: { rows: (Sensitivity & { main?: boolean; note?: string })[] }) {
  const frame = useRef<HTMLDivElement>(null);
  const { tip, bind } = useTip(frame);
  return (
    <div className="chart" ref={frame}>
      <Frame>
        {(W) => {
          const narrow = W < 600;
          const labelW = narrow ? 0 : Math.min(260, W * 0.36);
          const rowH = narrow ? 58 : 44;
          const m = { t: 8, r: 64, b: 36, l: labelW + 16 };
          const H = m.t + m.b + rows.length * rowH;
          const hi = Math.max(3, ...rows.map((r) => r.fold ?? 0)) * 1.05;
          const x = (v: number) => m.l + (v / hi) * (W - m.l - m.r);
          const ticks = niceTicks(0, hi, narrow ? 3 : 6);
          return (
            <svg width={W} height={H} role="img" className="chart-svg" aria-label={`Fold enrichment of shared claims over chance under ${rows.length} null designs; every value is above 1.`}>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={x(t)} x2={x(t)} y1={m.t} y2={H - m.b} className="grid" />
                  <text x={x(t)} y={H - m.b + 22} textAnchor="middle" className="tick">{fmt.one(t)}×</text>
                </g>
              ))}
              <line x1={x(1)} x2={x(1)} y1={m.t - 4} y2={H - m.b} className="ref-line" />
              <text x={x(1) + 6} y={H - m.b - 6} className="tick">chance</text>
              <g className="plot">
                {rows.map((r, i) => {
                  const cy = m.t + i * rowH + (narrow ? 40 : rowH / 2);
                  const v = r.fold ?? 0;
                  return (
                    <g key={r.key} className="mark-hit" {...bind([`${fmt.two(v)}× chance`, r.label, `${fmt.int(r.observed)} observed vs ${fmt.int(r.nullMean)} expected`, `${fmt.int(r.nTaxa)} species, ${fmt.p(r.p)}`])} aria-label={`${r.label}: ${fmt.two(v)} times chance`}>
                      <rect x={0} y={cy - rowH / 2 - (narrow ? 10 : 0)} width={W} height={rowH} className="hit" />
                      {narrow
                        ? <text x={m.l} y={cy - 18} className={`row-label ${r.main ? "row-label--strong" : ""}`}>{r.label}</text>
                        : <text x={labelW} y={cy} dy="0.32em" textAnchor="end" className={`row-label ${r.main ? "row-label--strong" : ""}`}>{r.label}</text>}
                      <line x1={x(1)} x2={x(v)} y1={cy} y2={cy} className="stem" />
                      <circle cx={x(v)} cy={cy} r={r.main ? 7 : 5.5} className={`dot ${r.key === "category_level" ? "dot--ref" : "dot--both"}`} />
                      <text x={x(v) + 12} y={cy} dy="0.32em" className={`annot ${r.main ? "annot--strong" : ""}`}>{fmt.two(v)}×</text>
                    </g>
                  );
                })}
              </g>
              <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} className="axis" />
            </svg>
          );
        }}
      </Frame>
      <ChartTip tip={tip} />
      <TableToggle label="Show the numbers">
        <table className="ledger ledger--compact">
          <thead><tr><th scope="col">Null design</th><th scope="col" className="num">Observed</th><th scope="col" className="num">Expected</th><th scope="col" className="num">Fold</th><th scope="col" className="num">Species</th><th scope="col" className="num">p</th></tr></thead>
          <tbody>
            {rows.map((r) => <tr key={r.key}><th scope="row">{r.label}</th><td className="num">{fmt.int(r.observed)}</td><td className="num">{fmt.int(r.nullMean)}</td><td className="num">{fmt.two(r.fold)}</td><td className="num">{fmt.int(r.nTaxa)}</td><td className="num">{fmt.p(r.p).replace("p ", "")}</td></tr>)}
          </tbody>
        </table>
      </TableToggle>
    </div>
  );
}

/* ------------------------------------------------ matched controls: claimed vs same-plant unclaimed */

export interface MatchedRow { key: string; label: string; tone: Tone; claimed: number; lo: number | null; hi: number | null; control: number | null; cLo: number | null; cHi: number | null; n: number | null; nControls: number | null }

export function MatchedDumbbell({ rows, overall }: { rows: MatchedRow[]; overall: number | null }) {
  const frame = useRef<HTMLDivElement>(null);
  const { tip, bind } = useTip(frame);
  return (
    <div className="chart" ref={frame}>
      <div className="legend" aria-label="Legend">
        <span className="legend-item"><span className="key-dot key-dot--ref" aria-hidden="true" />Unclaimed indications of the same plants</span>
        <span className="legend-item"><span className="key-dot key-dot--both" aria-hidden="true" />Claimed indications</span>
      </div>
      <Frame>
        {(W) => {
          const narrow = W < 600;
          const labelW = narrow ? 0 : Math.min(200, W * 0.3);
          const rowH = narrow ? 64 : 52;
          const m = { t: 10, r: 28, b: 38, l: labelW + 16 };
          const H = m.t + m.b + rows.length * rowH;
          const hi = 0.6;
          const x = (v: number) => m.l + (v / hi) * (W - m.l - m.r);
          const ticks = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].filter((_t, i) => !narrow || i % 2 === 0);
          return (
            <svg width={W} height={H} role="img" className="chart-svg" aria-label={`For each claim group, the share of pairs with any paper is higher than for unclaimed indications of the same plants.`}>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={x(t)} x2={x(t)} y1={m.t} y2={H - m.b} className="grid" />
                  <text x={x(t)} y={H - m.b + 22} textAnchor="middle" className="tick">{fmt.pct(t)}</text>
                </g>
              ))}
              {overall !== null && (
                <g>
                  <line x1={x(overall)} x2={x(overall)} y1={m.t} y2={H - m.b} className="ref-line" />
                </g>
              )}
              <g className="plot">
                {rows.map((r, i) => {
                  const cy = m.t + i * rowH + (narrow ? 44 : rowH / 2);
                  const lines = [`${fmt.pct(r.claimed)} claimed vs ${fmt.pct(r.control)} unclaimed`, r.label, `claimed 95% CI ${fmt.pct(r.lo)} to ${fmt.pct(r.hi)}`, `${fmt.int(r.n)} claimed pairs, ${fmt.int(r.nControls)} matched controls`];
                  return (
                    <g key={r.key} className="mark-hit" {...bind(lines)} aria-label={`${r.label}: ${fmt.pct(r.claimed)} against ${fmt.pct(r.control)}`}>
                      <rect x={0} y={cy - rowH / 2 - (narrow ? 12 : 0)} width={W} height={rowH} className="hit" />
                      {narrow
                        ? <text x={m.l} y={cy - 20} className="row-label">{r.label}</text>
                        : <text x={labelW} y={cy} dy="0.32em" textAnchor="end" className="row-label">{r.label}</text>}
                      {r.control !== null && <line x1={x(r.control)} x2={x(r.claimed)} y1={cy} y2={cy} className="stem stem--strong" />}
                      {r.lo !== null && r.hi !== null && <line x1={x(r.lo)} x2={x(r.hi)} y1={cy + 10} y2={cy + 10} className={`ci ci--${r.tone}`} />}
                      {r.control !== null && <circle cx={x(r.control)} cy={cy} r={6} className="dot dot--ref" />}
                      <circle cx={x(r.claimed)} cy={cy} r={7} className={`dot dot--${r.tone}`} />
                      <text x={x(r.claimed) + 12} y={cy} dy="0.32em" className="annot annot--strong">{fmt.pct(r.claimed)}</text>
                      {r.control !== null && <text x={x(r.control) - 12} y={cy} dy="0.32em" textAnchor="end" className="annot">{fmt.pct(r.control)}</text>}
                    </g>
                  );
                })}
              </g>
              <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} className="axis" />
            </svg>
          );
        }}
      </Frame>
      <p className="chart-axis-note">Share of plant–indication pairs with at least one co-mentioning Europe PMC paper. The vertical rule is the share for all unclaimed indications{overall !== null ? ` (${fmt.pct(overall)})` : ""}; whiskers are 95% cluster-bootstrap intervals for the claimed share.</p>
      <ChartTip tip={tip} />
      <TableToggle label="Show the numbers">
        <table className="ledger ledger--compact">
          <thead><tr><th scope="col">Group</th><th scope="col" className="num">Claimed</th><th scope="col" className="num">95% CI</th><th scope="col" className="num">Matched unclaimed</th><th scope="col" className="num">Pairs</th></tr></thead>
          <tbody>
            {rows.map((r) => <tr key={r.key}><th scope="row">{r.label}</th><td className="num">{fmt.pct(r.claimed)}</td><td className="num">{fmt.pct(r.lo)} to {fmt.pct(r.hi)}</td><td className="num">{fmt.pct(r.control)}</td><td className="num">{fmt.int(r.n)}</td></tr>)}
          </tbody>
        </table>
      </TableToggle>
    </div>
  );
}

/* ------------------------------------------------ forest plot on a log scale */

export function Forest({ rows, tone, valueLabel, ariaLabel, lo: loIn = 0.4, hi: hiIn = 4.5 }: {
  rows: (Interval & { model?: string })[]; tone: (r: Interval) => Tone; valueLabel: string; ariaLabel: string; lo?: number; hi?: number;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const { tip, bind } = useTip(frame);
  const crosses = (r: Interval) => r.lo !== null && r.hi !== null && r.lo <= 1 && r.hi >= 1;
  return (
    <div className="chart" ref={frame}>
      <Frame>
        {(W) => {
          const narrow = W < 600;
          const labelW = narrow ? 0 : Math.min(230, W * 0.34);
          const rowH = narrow ? 58 : 46;
          const m = { t: 18, r: 70, b: 40, l: labelW + 16 };
          const H = m.t + m.b + rows.length * rowH;
          const lo = Math.min(loIn, ...rows.map((r) => (r.lo ?? r.value) / 1.1));
          const hi = Math.max(hiIn, ...rows.map((r) => (r.hi ?? r.value) * 1.1));
          const L = Math.log;
          const x = (v: number) => m.l + ((L(v) - L(lo)) / (L(hi) - L(lo))) * (W - m.l - m.r);
          const ticks = logTicks(lo, hi).filter((t, _i, a) => !narrow || [0.5, 1, 2, 4].includes(t) || a.length < 5);
          return (
            <svg width={W} height={H} role="img" className="chart-svg" aria-label={ariaLabel}>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={x(t)} x2={x(t)} y1={m.t} y2={H - m.b} className="grid" />
                  <text x={x(t)} y={H - m.b + 22} textAnchor="middle" className="tick">{String(Number(t.toFixed(2)))}</text>
                </g>
              ))}
              <line x1={x(1)} x2={x(1)} y1={m.t - 8} y2={H - m.b} className="ref-line" />
              <text x={x(1)} y={m.t - 8} dy="-0.2em" textAnchor="middle" className="tick">no difference</text>
              <g className="plot">
                {rows.map((r, i) => {
                  const cy = m.t + i * rowH + (narrow ? 40 : rowH / 2);
                  const t = tone(r);
                  const open = crosses(r);
                  const lines = [`${valueLabel} ${fmt.two(r.value)}`, `95% CI ${fmt.two(r.lo)} to ${fmt.two(r.hi)}`, r.label, ...(r.model ? [r.model] : []), ...(r.n !== null ? [`n = ${fmt.int(r.n)}`] : []), ...(r.p !== null ? [fmt.p(r.p)] : [])];
                  return (
                    <g key={r.key + (r.model ?? "")} className="mark-hit" {...bind(lines)} aria-label={`${r.label}: ${valueLabel} ${fmt.two(r.value)}, 95% CI ${fmt.two(r.lo)} to ${fmt.two(r.hi)}${open ? ", interval includes 1" : ""}`}>
                      <rect x={0} y={cy - rowH / 2 - (narrow ? 12 : 0)} width={W} height={rowH} className="hit" />
                      {narrow
                        ? <text x={m.l} y={cy - 18} className="row-label">{r.label}</text>
                        : <text x={labelW} y={cy} dy="0.32em" textAnchor="end" className="row-label">{r.label}</text>}
                      {r.lo !== null && r.hi !== null && <line x1={x(r.lo)} x2={x(r.hi)} y1={cy} y2={cy} className={`ci ci--${t}`} />}
                      <circle cx={x(r.value)} cy={cy} r={6.5} className={`dot dot--${t} ${open ? "is-open" : ""}`} />
                      <text x={x(r.hi ?? r.value) + 10} y={cy} dy="0.32em" className="annot">{fmt.two(r.value)}</text>
                    </g>
                  );
                })}
              </g>
              <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} className="axis" />
            </svg>
          );
        }}
      </Frame>
      <ChartTip tip={tip} />
      <TableToggle label="Show the numbers">
        <table className="ledger ledger--compact">
          <thead><tr><th scope="col">Term</th><th scope="col" className="num">{valueLabel}</th><th scope="col" className="num">95% CI</th><th scope="col" className="num">p</th><th scope="col" className="num">n</th></tr></thead>
          <tbody>
            {rows.map((r) => <tr key={r.key + (r.model ?? "")}><th scope="row">{r.label}{r.model ? <span className="cell-sub">{r.model}</span> : null}</th><td className="num">{fmt.two(r.value)}</td><td className="num">{fmt.two(r.lo)} to {fmt.two(r.hi)}</td><td className="num">{fmt.p(r.p).replace("p ", "")}</td><td className="num">{fmt.int(r.n, "")}</td></tr>)}
          </tbody>
        </table>
      </TableToggle>
    </div>
  );
}

/* ------------------------------------------------ claims per category per source */

export function CategoryBars({ rows, sharesOnly = false }: { rows: CategoryRow[]; sharesOnly?: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const { tip, bind } = useTip(frame);
  const [share, setShare] = useState(true);
  const totD = rows.reduce((a, r) => a + r.dsc, 0) || 1;
  const totC = rows.reduce((a, r) => a + r.cul, 0) || 1;
  const v = (r: CategoryRow, s: "dsc" | "cul") => (share ? r[s] / (s === "dsc" ? totD : totC) : r[s]);
  const show = (val: number) => (share ? fmt.pct(val) : fmt.int(val));
  return (
    <div className="chart" ref={frame}>
      <div className="chart-controls">
        <div className="legend" aria-label="Legend">
          <span className="legend-item"><span className="key-bar key-bar--dsc" aria-hidden="true" />Dioscorides</span>
          <span className="legend-item"><span className="key-bar key-bar--cul" aria-hidden="true" />Culpeper</span>
        </div>
        {!sharesOnly && (
          <div className="segmented" role="group" aria-label="Scale">
            <button type="button" aria-pressed={share} onClick={() => setShare(true)}>Share of each herbal</button>
            <button type="button" aria-pressed={!share} onClick={() => setShare(false)}>Counts</button>
          </div>
        )}
      </div>
      <Frame>
        {(W) => {
          const narrow = W < 600;
          const labelW = narrow ? 0 : Math.min(210, W * 0.3);
          const bar = 9, gap = 2, groupH = narrow ? 48 : 32;
          const m = { t: 6, r: 56, b: 34, l: labelW + 16 };
          const H = m.t + m.b + rows.length * groupH;
          const vmax = Math.max(...rows.map((r) => Math.max(v(r, "dsc"), v(r, "cul"))), share ? 0.01 : 1);
          const x = (val: number) => (val / vmax) * (W - m.l - m.r);
          const ticks = niceTicks(0, vmax, narrow ? 3 : 5);
          return (
            <svg width={W} height={H} role="img" className="chart-svg" aria-label={`Claims per therapeutic category for Dioscorides and Culpeper, ${share ? "as a share of each herbal" : "as counts"}.`}>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={m.l + x(t)} x2={m.l + x(t)} y1={m.t} y2={H - m.b} className="grid" />
                  <text x={m.l + x(t)} y={H - m.b + 22} textAnchor="middle" className="tick">{show(t)}</text>
                </g>
              ))}
              <g className="plot">
                {rows.map((r, i) => {
                  const gy = m.t + i * groupH + (narrow ? 20 : (groupH - 2 * bar - gap) / 2);
                  const lines = [`${show(v(r, "dsc"))} Dioscorides · ${show(v(r, "cul"))} Culpeper`, r.category];
                  return (
                    <g key={r.category} className="mark-hit" {...bind(lines)} aria-label={`${r.category}: Dioscorides ${show(v(r, "dsc"))}, Culpeper ${show(v(r, "cul"))}`}>
                      <rect x={0} y={m.t + i * groupH} width={W} height={groupH} className="hit" />
                      {narrow
                        ? <text x={m.l} y={gy - 6} className="row-label">{r.category}</text>
                        : <text x={labelW} y={gy + bar + gap / 2} dy="0.32em" textAnchor="end" className="row-label">{r.category}</text>}
                      <path d={barRight(m.l, gy, Math.max(0.5, x(v(r, "dsc"))), bar, 3)} className="mark mark--dsc" />
                      <path d={barRight(m.l, gy + bar + gap, Math.max(0.5, x(v(r, "cul"))), bar, 3)} className="mark mark--cul" />
                      {i === 0 && (
                        <>
                          <text x={m.l + x(v(r, "dsc")) + 6} y={gy + bar / 2} dy="0.32em" className="annot">{show(v(r, "dsc"))}</text>
                          <text x={m.l + x(v(r, "cul")) + 6} y={gy + bar + gap + bar / 2} dy="0.32em" className="annot">{show(v(r, "cul"))}</text>
                        </>
                      )}
                    </g>
                  );
                })}
              </g>
              <line x1={m.l} x2={m.l} y1={m.t} y2={H - m.b} className="axis" />
            </svg>
          );
        }}
      </Frame>
      <ChartTip tip={tip} />
      <TableToggle label="Show the numbers">
        <table className="ledger ledger--compact">
          <thead><tr><th scope="col">Category</th><th scope="col" className="num">Dioscorides</th><th scope="col" className="num">Culpeper</th></tr></thead>
          <tbody>
            {rows.map((r) => <tr key={r.category}><th scope="row">{r.category}</th><td className="num">{fmt.pct(r.dsc / totD)}</td><td className="num">{fmt.pct(r.cul / totC)}</td></tr>)}
          </tbody>
        </table>
      </TableToggle>
    </div>
  );
}
