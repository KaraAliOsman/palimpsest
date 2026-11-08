import { useRef, useState } from "react";
import { ChartTip, logTicks, niceTicks, TableToggle, useTip, useWidth } from "./kit";
import { fmt } from "../lib/format";
import type { CategoryRow, Interval, Persistence } from "../lib/stats";


/* ------------------------------------------------ observed vs permutation null */

export function NullHistogram({ data }: { data: Persistence }) {
  const [wrap, w] = useWidth<HTMLDivElement>();
  const frame = useRef<HTMLDivElement>(null);
  const { tip, bind } = useTip(frame);
  const H = 280, m = { t: 44, r: 20, b: 40, l: 44 };
  const W = Math.max(280, w);
  const bins = data.bins;
  const obs = data.observed;
  const xs = [...bins.flatMap((b) => [b.x0, b.x1]), ...(obs !== null ? [obs] : [])];
  let lo = Math.min(...xs), hi = Math.max(...xs);
  const pad = (hi - lo) * 0.04 || 1;
  lo = Math.max(0, lo - pad); hi += pad;
  const ymax = Math.max(1, ...bins.map((b) => b.count));
  const x = (v: number) => m.l + ((v - lo) / (hi - lo)) * (W - m.l - m.r);
  const y = (v: number) => H - m.b - (v / ymax) * (H - m.t - m.b);
  const xt = niceTicks(lo, hi, W < 480 ? 4 : 7);
  const yt = niceTicks(0, ymax, 4);
  const total = bins.reduce((a, b) => a + b.count, 0);
  const label = `Histogram of ${fmt.int(total)} permuted counts centred near ${fmt.int(data.nullMean)}, with the observed count of ${fmt.int(obs)} marked.`;
  const obsX = obs !== null ? x(obs) : null;
  const obsAnchor = obsX !== null && obsX > W - 140 ? "end" : "start";
  return (
    <div className="chart" ref={frame}>
      <div ref={wrap} className="chart-canvas">
        {w > 0 && (
          <svg width={W} height={H} role="img" aria-label={label} className="chart-svg">
            {yt.map((t) => (
              <g key={t}>
                <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="grid" />
                <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tick">{fmt.int(t)}</text>
              </g>
            ))}
            {xt.map((t) => (
              <text key={t} x={x(t)} y={H - m.b + 20} textAnchor="middle" className="tick">{fmt.int(t)}</text>
            ))}
            {bins.map((b, i) => {
              const bx = x(b.x0) + 1, bw = Math.max(1, x(b.x1) - x(b.x0) - 2);
              const top = y(b.count);
              return (
                <g key={i} className="mark-hit" {...bind([`${fmt.int(b.count)} permutations`, `${fmt.int(b.x0)} to ${fmt.int(b.x1)} shared pairs`])} aria-label={`${fmt.int(b.x0)} to ${fmt.int(b.x1)}: ${b.count} permutations`}>
                  <rect x={bx} y={m.t} width={bw} height={H - m.b - m.t} className="hit" />
                  {b.count > 0 && <path d={barUp(bx, top, bw, H - m.b - top)} className="mark mark--ref" />}
                </g>
              );
            })}
            {obsX !== null && (
              <g>
                <line x1={obsX} x2={obsX} y1={m.t - 14} y2={H - m.b} className="mark-line mark-line--accent" />
                <circle cx={obsX} cy={m.t - 14} r={5} className="mark-dot mark-dot--accent" />
                <text x={obsX + (obsAnchor === "end" ? -10 : 10)} y={m.t - 10} textAnchor={obsAnchor} className="annot annot--strong">Observed {fmt.int(obs)}</text>
              </g>
            )}
            {data.nullMean !== null && (
              <text x={x(data.nullMean)} y={m.t - 10} textAnchor="middle" className="annot">Chance, about {fmt.int(data.nullMean)}</text>
            )}
            <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} className="axis" />
          </svg>
        )}
      </div>
      <p className="chart-axis-note">Shared plant–indication pairs per permutation; bars count permutations.</p>
      <ChartTip tip={tip} />
      <TableToggle label="Show the numbers">
        <table className="ledger ledger--compact">
          <thead><tr><th scope="col">Shared pairs</th><th scope="col" className="num">Permutations</th></tr></thead>
          <tbody>
            {bins.filter((b) => b.count > 0).map((b, i) => <tr key={i}><td className="num">{fmt.int(b.x0)} to {fmt.int(b.x1)}</td><td className="num">{fmt.int(b.count)}</td></tr>)}
            <tr><td>Observed</td><td className="num">{fmt.int(obs)}</td></tr>
          </tbody>
        </table>
      </TableToggle>
    </div>
  );
}

function barUp(x: number, y: number, w: number, h: number, r = 2): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}
function barRight(x: number, y: number, w: number, h: number, r = 2): string {
  const rr = Math.min(r, h / 2, w);
  return `M${x},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h - rr}Q${x + w},${y + h} ${x + w - rr},${y + h}H${x}Z`;
}

/* ------------------------------------------------ intervals: lift and odds ratios */

interface IntervalProps {
  rows: Interval[];
  log?: boolean;
  reference?: number;
  tone: (r: Interval) => "dsc" | "cul" | "mod" | "ref" | "accent";
  hollow?: (r: Interval) => boolean;
  valueLabel: string;
  format: (v: number | null) => string;
  ariaLabel: string;
  tickFormat?: (v: number) => string;
}

export function IntervalChart({ rows, log = false, reference = 1, tone, hollow, valueLabel, format, ariaLabel, tickFormat }: IntervalProps) {
  const [wrap, w] = useWidth<HTMLDivElement>();
  const frame = useRef<HTMLDivElement>(null);
  const { tip, bind } = useTip(frame);
  const W = Math.max(280, w);
  const narrow = W < 560;
  const labelW = narrow ? 0 : Math.min(230, W * 0.34);
  const rowH = narrow ? 60 : 46;
  const m = { t: 12, r: 60, b: 36, l: labelW + 16 };
  const H = m.t + m.b + rows.length * rowH;
  const vals = rows.flatMap((r) => [r.value, r.lo ?? r.value, r.hi ?? r.value]).concat(reference);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (log) { lo = Math.max(0.05, lo / 1.15); hi = hi * 1.15; }
  else { lo = Math.min(0, lo); hi = hi * 1.08; }
  const tx = (v: number) => (log ? Math.log(v) : v);
  const x = (v: number) => m.l + ((tx(v) - tx(lo)) / (tx(hi) - tx(lo))) * (W - m.l - m.r);
  const ticks = log ? logTicks(lo, hi) : niceTicks(lo, hi, narrow ? 4 : 6);
  return (
    <div className="chart" ref={frame}>
      <div ref={wrap} className="chart-canvas">
        {w > 0 && (
          <svg width={W} height={H} role="img" aria-label={ariaLabel} className="chart-svg">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={x(t)} x2={x(t)} y1={m.t} y2={H - m.b} className="grid" />
                <text x={x(t)} y={H - m.b + 20} textAnchor="middle" className="tick">{tickFormat ? tickFormat(t) : log ? String(Number(t.toFixed(2))) : fmt.one(t)}</text>
              </g>
            ))}
            <line x1={x(reference)} x2={x(reference)} y1={m.t - 4} y2={H - m.b} className="ref-line" />
            {rows.map((r, i) => {
              const cy = m.t + i * rowH + (narrow ? 40 : rowH / 2);
              const t = tone(r);
              const open = hollow?.(r) ?? false;
              const lines = [`${valueLabel} ${format(r.value)}`, `95% CI ${format(r.lo)} to ${format(r.hi)}`, r.label, ...(r.n !== null ? [`n = ${fmt.int(r.n)}`] : []), ...(r.p !== null ? [fmt.p(r.p)] : [])];
              return (
                <g key={r.key} className="mark-hit" {...bind(lines)} aria-label={`${r.label}: ${valueLabel} ${format(r.value)}, 95% CI ${format(r.lo)} to ${format(r.hi)}`}>
                  <rect x={0} y={cy - rowH / 2 - (narrow ? 12 : 0)} width={W} height={rowH} className="hit" />
                  {narrow
                    ? <text x={m.l} y={cy - 18} className="row-label">{r.label}</text>
                    : <text x={labelW} y={cy} dy="0.32em" textAnchor="end" className="row-label">{r.label}</text>}
                  {r.lo !== null && r.hi !== null && (
                    <line x1={x(r.lo)} x2={x(r.hi)} y1={cy} y2={cy} className={`mark-line mark-line--${t}`} />
                  )}
                  <circle cx={x(r.value)} cy={cy} r={6} className={`mark-dot mark-dot--${t} ${open ? "is-hollow" : ""}`} />
                  <text x={x(r.hi ?? r.value) + 10} y={cy} dy="0.32em" className="annot">{format(r.value)}</text>
                </g>
              );
            })}
            <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} className="axis" />
          </svg>
        )}
      </div>
      <ChartTip tip={tip} />
      <TableToggle label="Show the numbers">
        <table className="ledger ledger--compact">
          <thead><tr><th scope="col">Row</th><th scope="col" className="num">{valueLabel}</th><th scope="col" className="num">95% CI</th><th scope="col" className="num">n</th></tr></thead>
          <tbody>
            {rows.map((r) => <tr key={r.key}><td>{r.label}</td><td className="num">{format(r.value)}</td><td className="num">{format(r.lo)} to {format(r.hi)}</td><td className="num">{fmt.int(r.n, "")}</td></tr>)}
          </tbody>
        </table>
      </TableToggle>
    </div>
  );
}

/* ------------------------------------------------ claims per category per source */

export function CategoryBars({ rows, sharesOnly = false }: { rows: CategoryRow[]; sharesOnly?: boolean }) {
  const [wrap, w] = useWidth<HTMLDivElement>();
  const frame = useRef<HTMLDivElement>(null);
  const { tip, bind } = useTip(frame);
  const [share, setShare] = useState(true);
  const W = Math.max(280, w);
  const narrow = W < 560;
  const labelW = narrow ? 0 : Math.min(200, W * 0.3);
  const bar = 10, gap = 2, groupH = narrow ? 50 : 34;
  const m = { t: 8, r: 56, b: 34, l: labelW + 16 };
  const H = m.t + m.b + rows.length * groupH;
  const totD = rows.reduce((a, r) => a + r.dsc, 0) || 1;
  const totC = rows.reduce((a, r) => a + r.cul, 0) || 1;
  const v = (r: CategoryRow, s: "dsc" | "cul") => (share ? r[s] / (s === "dsc" ? totD : totC) : r[s]);
  const vmax = Math.max(...rows.map((r) => Math.max(v(r, "dsc"), v(r, "cul"))), share ? 0.01 : 1);
  const x = (val: number) => (val / vmax) * (W - m.l - m.r);
  const ticks = niceTicks(0, vmax, narrow ? 3 : 5);
  const show = (val: number) => (share ? fmt.pct(val) : fmt.int(val));
  return (
    <div className="chart" ref={frame}>
      <div className="chart-controls">
        <div className="legend" aria-label="Legend">
          <span className="legend-item"><span className="swatch swatch--dsc" aria-hidden="true" />Dioscorides</span>
          <span className="legend-item"><span className="swatch swatch--cul" aria-hidden="true" />Culpeper</span>
        </div>
        {!sharesOnly && <div className="segmented" role="group" aria-label="Scale">
          <button type="button" aria-pressed={share} onClick={() => setShare(true)}>Share of each herbal</button>
          <button type="button" aria-pressed={!share} onClick={() => setShare(false)}>Counts</button>
        </div>}
      </div>
      <div ref={wrap} className="chart-canvas">
        {w > 0 && (
          <svg width={W} height={H} role="img" className="chart-svg" aria-label={`Claims per category for Dioscorides and Culpeper, ${share ? "as a share of each herbal" : "as counts"}.`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={m.l + x(t)} x2={m.l + x(t)} y1={m.t} y2={H - m.b} className="grid" />
                <text x={m.l + x(t)} y={H - m.b + 20} textAnchor="middle" className="tick">{show(t)}</text>
              </g>
            ))}
            {rows.map((r, i) => {
              const gy = m.t + i * groupH + (narrow ? 20 : (groupH - 2 * bar - gap) / 2);
              const lines = [`${show(v(r, "dsc"))} Dioscorides, ${show(v(r, "cul"))} Culpeper`, r.category, ...(sharesOnly ? [] : [`${fmt.int(r.dsc)} and ${fmt.int(r.cul)} claims`])];
              return (
                <g key={r.category} className="mark-hit" {...bind(lines)} aria-label={`${r.category}: Dioscorides ${show(v(r, "dsc"))}, Culpeper ${show(v(r, "cul"))}`}>
                  <rect x={0} y={m.t + i * groupH} width={W} height={groupH} className="hit" />
                  {narrow
                    ? <text x={m.l} y={gy - 6} className="row-label">{r.category}</text>
                    : <text x={labelW} y={gy + bar + gap / 2} dy="0.32em" textAnchor="end" className="row-label">{r.category}</text>}
                  <path d={barRight(m.l, gy, Math.max(0.5, x(v(r, "dsc"))), bar)} className="mark mark--dsc" />
                  <path d={barRight(m.l, gy + bar + gap, Math.max(0.5, x(v(r, "cul"))), bar)} className="mark mark--cul" />
                  {i === 0 && (
                    <>
                      <text x={m.l + x(v(r, "dsc")) + 6} y={gy + bar / 2} dy="0.32em" className="annot">{show(v(r, "dsc"))}</text>
                      <text x={m.l + x(v(r, "cul")) + 6} y={gy + bar + gap + bar / 2} dy="0.32em" className="annot">{show(v(r, "cul"))}</text>
                    </>
                  )}
                </g>
              );
            })}
            <line x1={m.l} x2={m.l} y1={m.t} y2={H - m.b} className="axis" />
          </svg>
        )}
      </div>
      <ChartTip tip={tip} />
      <TableToggle label="Show the numbers">
        <table className="ledger ledger--compact">
          <thead><tr><th scope="col">Category</th><th scope="col" className="num">Dioscorides</th><th scope="col" className="num">Culpeper</th></tr></thead>
          <tbody>
            {rows.map((r) => <tr key={r.category}><td>{r.category}</td><td className="num">{sharesOnly ? fmt.pct(r.dsc / totD) : `${fmt.int(r.dsc)} (${fmt.pct(r.dsc / totD)})`}</td><td className="num">{sharesOnly ? fmt.pct(r.cul / totC) : `${fmt.int(r.cul)} (${fmt.pct(r.cul / totC)})`}</td></tr>)}
          </tbody>
        </table>
      </TableToggle>
    </div>
  );
}

