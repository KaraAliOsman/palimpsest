// The survival flow: every plant–indication claim for the species both herbals cover, followed from
// Dioscorides (c. 60 CE) through Culpeper (1653) to the 2026 evidence tier. Hand-built alluvial in SVG.
// Data: derived/flow.json (scripts/derive.mjs). Ribbons take the colour of what Culpeper did with the claim:
// minium = kept (persisted), porphyra = dropped, verdigris = added. Tiers are ink, as everywhere else.
import { useMemo, useRef, useState } from "react";
import { useResource } from "../lib/data";
import { href } from "../lib/router";
import { fmt } from "../lib/format";
import { ErrorState, Skeleton } from "../components/ui";
import { TableToggle, useInView, useWidth } from "./kit";

interface Flow {
  groups: string[]; tiers: string[];
  concepts: [string, string, string][];
  plants: [string, string, string | null][];
  rows: [number, number, number, number][];
}

const GROUP = [
  { key: "kept", label: "Kept by Culpeper", short: "Kept", tone: "both" },
  { key: "dropped", label: "Dropped by Culpeper", short: "Dropped", tone: "dsc" },
  { key: "added", label: "New in Culpeper", short: "Added", tone: "cul" },
] as const;
const TIER = [
  { key: "unstudied", label: "Unstudied", note: "0 papers" },
  { key: "sparse", label: "Sparse", note: "1 to 4 papers" },
  { key: "studied", label: "Studied", note: "5 or more" },
] as const;
const SOURCE = [
  { key: "said", label: "Said by Dioscorides" },
  { key: "unsaid", label: "Not in Dioscorides" },
] as const;

type Link = { id: string; stage: 1 | 2; from: number; to: number; n: number; rows: number[] };

export function SurvivalFlow({ compact = false }: { compact?: boolean }) {
  const res = useResource<Flow>("derived/flow.json");
  if (res.status === "loading") return <Skeleton rows={8} label="Reading the flow" />;
  if (res.status === "error") return <ErrorState what="The survival flow" error={res.error} retry={res.retry} />;
  return <FlowChart f={res.data} compact={compact} />;
}

function FlowChart({ f, compact }: { f: Flow; compact: boolean }) {
  const [cat, setCat] = useState<string>("");
  const [hover, setHover] = useState<string | null>(null);
  const [picked, setPicked] = useState<string>("2:0-0");
  const [wrap, W0] = useWidth<HTMLDivElement>();
  const [view, seen] = useInView<HTMLDivElement>();
  const panel = useRef<HTMLDivElement>(null);

  const cats = useMemo(() => {
    const n = new Map<string, number>();
    for (const r of f.rows) { const c = f.concepts[r[1]][2]; n.set(c, (n.get(c) ?? 0) + 1); }
    return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [f]);

  const model = useMemo(() => {
    const rows: number[] = [];
    f.rows.forEach((r, i) => { if (!cat || f.concepts[r[1]][2] === cat) rows.push(i); });
    const links = new Map<string, Link>();
    const add = (stage: 1 | 2, from: number, to: number, i: number) => {
      const id = `${stage}:${from}-${to}`;
      let l = links.get(id);
      if (!l) { l = { id, stage, from, to, n: 0, rows: [] }; links.set(id, l); }
      l.n++; l.rows.push(i);
    };
    for (const i of rows) {
      const [, , g, t] = f.rows[i];
      add(1, g === 2 ? 1 : 0, g, i);
      add(2, g, t, i);
    }
    const tot = (stage: 1 | 2, side: "from" | "to", k: number) => [...links.values()].filter((l) => l.stage === stage && l[side] === k).reduce((a, l) => a + l.n, 0);
    const A = [0, 1].map((k) => tot(1, "from", k));
    const B = [0, 1, 2].map((k) => tot(1, "to", k));
    const C = [0, 1, 2].map((k) => tot(2, "to", k));
    return { rows, links: [...links.values()], A, B, C, N: rows.length };
  }, [f, cat]);

  if (!model) return null;

  const W = Math.max(300, W0 || 0);
  const narrow = W < 640;
  const H = compact ? 300 : narrow ? 340 : 400;
  const top = 34, bot = 8, gap = narrow ? 10 : 14, bar = narrow ? 10 : 14;
  const labelL = narrow ? 92 : 150, labelR = narrow ? 92 : 150;
  const xA = labelL, xC = W - labelR - bar, xB = (xA + xC) / 2;
  const avail = H - top - bot - gap * 2;
  const k = model.N ? avail / model.N : 0;
  const stack = (vals: number[]) => {
    const used = vals.reduce((a, v) => a + v * k, 0) + gap * (vals.length - 1);
    let y = top + (H - top - bot - used) / 2;
    return vals.map((v) => { const y0 = y; y += v * k + gap; return { y0, y1: y0 + v * k }; });
  };
  const nA = stack(model.A), nB = stack(model.B), nC = stack(model.C);
  // ribbon offsets within each node, in node order
  const outOff = new Map<string, number>(), inOff = new Map<string, number>();
  const placed = model.links.slice().sort((a, b) => a.stage - b.stage || a.from - b.from || a.to - b.to);
  const cur: Record<string, number> = {};
  for (const l of placed) {
    const so = `${l.stage}o${l.from}`, si = `${l.stage}i${l.to}`;
    const srcNode = l.stage === 1 ? nA[l.from] : nB[l.from];
    const dstNode = l.stage === 1 ? nB[l.to] : nC[l.to];
    cur[so] ??= srcNode.y0; cur[si] ??= dstNode.y0;
    outOff.set(l.id, cur[so]); inOff.set(l.id, cur[si]);
    cur[so] += l.n * k; cur[si] += l.n * k;
  }
  // stage-2 ribbons into a tier are stacked in group order; stage-1 into B in source order: already sorted
  const ribbon = (l: Link) => {
    const x1 = (l.stage === 1 ? xA : xB) + bar, x2 = l.stage === 1 ? xB : xC;
    const y0 = outOff.get(l.id)!, y1 = inOff.get(l.id)!, h = l.n * k, m = (x1 + x2) / 2;
    return `M${x1},${y0}C${m},${y0} ${m},${y1} ${x2},${y1}V${y1 + h}C${m},${y1 + h} ${m},${y0 + h} ${x1},${y0 + h}Z`;
  };
  const tone = (l: Link) => GROUP[l.stage === 1 ? l.to : l.from].tone;
  const name = (l: Link) => l.stage === 1
    ? `${SOURCE[l.from].label} → ${GROUP[l.to].label}`
    : `${GROUP[l.from].label} → ${TIER[l.to].label} in 2026`;
  const active = hover;
  const focusLink = model.links.find((l) => l.id === (hover ?? picked)) ?? null;

  // plants on the focused ribbon
  const plantsOn = (l: Link | null) => {
    if (!l) return [];
    const by = new Map<number, Set<number>>();
    for (const i of l.rows) { const [p, c] = f.rows[i]; if (!by.has(p)) by.set(p, new Set()); by.get(p)!.add(c); }
    return [...by.entries()].map(([p, cs]) => ({ p, cs: [...cs] })).sort((a, b) => b.cs.length - a.cs.length || f.plants[a.p][1].localeCompare(f.plants[b.p][1]));
  };
  const list = plantsOn(focusLink);

  const said = model.B[0] + model.B[1];
  const kept = model.B[0];
  const keptUn = model.links.find((l) => l.id === "2:0-0")?.n ?? 0;
  const pct = (a: number, b: number) => (b ? fmt.pct(a / b) : "n/a");
  const catLabel = cat ? cat.toLowerCase() : "all body systems";

  const onKey = (e: React.KeyboardEvent, l: Link) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPicked(l.id); panel.current?.focus({ preventScroll: true }); }
  };

  const nodeLabel = (x: number, y0: number, y1: number, title: string, n: number, anchor: "start" | "end", strong = false, share = true) => {
    const cy = (y0 + y1) / 2;
    const tall = y1 - y0 > 26;
    return (
      <g className="flow-label" aria-hidden="true">
        <text x={x} y={tall ? cy - 3 : cy} dy={tall ? 0 : "0.32em"} textAnchor={anchor} className={`row-label ${strong ? "row-label--strong" : ""}`}>{title}{tall ? "" : ` ${fmt.int(n)}`}</text>
        {tall && <text x={x} y={cy + 13} textAnchor={anchor} className="annot">{fmt.int(n)}{share ? ` · ${pct(n, model.N)}` : ""}</text>}
      </g>
    );
  };

  return (
    <div className="flow">
      <div className="chart-controls flow-controls">
        <div className="segmented flow-cats" role="group" aria-label="Body system">
          <button type="button" aria-pressed={!cat} onClick={() => setCat("")}>All</button>
          {cats.slice(0, narrow ? 2 : 5).map((c) => <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
        </div>
        <div className="field field--inline">
          <label htmlFor="flow-cat" className="visually-hidden">Any body system</label>
          <select id="flow-cat" value={cats.slice(0, narrow ? 2 : 5).includes(cat) ? "" : cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">{cat && !cats.slice(0, narrow ? 2 : 5).includes(cat) ? "All body systems" : "More body systems…"}</option>
            {cats.slice(narrow ? 2 : 5).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <p className="flow-take" aria-live="polite">
        For {catLabel}: of <b className="num">{fmt.int(said)}</b> claims Dioscorides made for these plants, Culpeper repeats <b className="num">{fmt.int(kept)}</b> ({pct(kept, said)}).
        {" "}Of the survivors, <b className="num">{fmt.int(keptUn)}</b> ({pct(keptUn, kept)}) have no modern paper at all: that unstudied pool is where the <a href={href("/leads")}>leads</a> come from.
      </p>

      <div className="flow-grid">
        <div ref={view} className={`chart-canvas ${seen ? "is-drawn" : ""}`}>
          <div ref={wrap}>
            {W0 > 0 && (
              <svg width={W} height={H} className="chart-svg flow-svg" role="group" aria-label={`Alluvial chart of ${fmt.int(model.N)} claims, ${catLabel}. Each ribbon is a button that lists its plants.`}>
                <text x={xA + bar / 2} y={14} textAnchor="middle" className="flow-col">c. 60 CE</text>
                <text x={xB + bar / 2} y={14} textAnchor="middle" className="flow-col">1653</text>
                <text x={xC + bar / 2} y={14} textAnchor="middle" className="flow-col">2026</text>
                <g className="plot">
                  {model.links.filter((l) => l.n > 0).map((l) => {
                    const on = active === l.id;
                    return (
                      <path
                        key={l.id}
                        d={ribbon(l)}
                        className={`ribbon ribbon--${tone(l)} ${on ? "is-on" : ""} ${active && !on ? "is-off" : ""} ${picked === l.id ? "is-picked" : ""}`}
                        tabIndex={0}
                        role="button"
                        aria-pressed={picked === l.id}
                        aria-label={`${name(l)}: ${fmt.int(l.n)} claims`}
                        onMouseEnter={() => setHover(l.id)}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover(l.id)}
                        onBlur={() => setHover(null)}
                        onClick={() => setPicked(l.id)}
                        onKeyDown={(e) => onKey(e, l)}
                      />
                    );
                  })}
                </g>
                {nA.map((n, i) => model.A[i] > 0 && <rect key={`a${i}`} x={xA} y={n.y0} width={bar} height={n.y1 - n.y0} className={`flow-node flow-node--${i === 0 ? "dsc" : "ref"}`} />)}
                {nB.map((n, i) => model.B[i] > 0 && <rect key={`b${i}`} x={xB} y={n.y0} width={bar} height={n.y1 - n.y0} className={`flow-node flow-node--${GROUP[i].tone}`} />)}
                {nC.map((n, i) => model.C[i] > 0 && <rect key={`c${i}`} x={xC} y={n.y0} width={bar} height={n.y1 - n.y0} className={`flow-node flow-node--tier${i}`} />)}
                {nA.map((n, i) => model.A[i] > 0 && <g key={`la${i}`}>{nodeLabel(xA - 8, n.y0, n.y1, narrow ? (i ? "Not in D." : "Said") : SOURCE[i].label, model.A[i], "end")}</g>)}
                {nB.map((n, i) => model.B[i] > 0 && <g key={`lb${i}`}>{nodeLabel(xB + bar + 6, n.y0, n.y1, GROUP[i].short, model.B[i], "start", i === 0, false)}</g>)}
                {nC.map((n, i) => model.C[i] > 0 && <g key={`lc${i}`}>{nodeLabel(xC + bar + 8, n.y0, n.y1, TIER[i].label, model.C[i], "start", i === 0)}</g>)}
              </svg>
            )}
          </div>
        </div>

        <div className="flow-panel" ref={panel} tabIndex={-1} aria-live="polite">
          {focusLink ? (
            <>
              <p className="flow-panel-what"><span className={`key-bar key-bar--${tone(focusLink)}`} aria-hidden="true" />{name(focusLink)}</p>
              <p className="flow-panel-n"><b className="num">{fmt.int(focusLink.n)}</b> claims on <b className="num">{fmt.int(list.length)}</b> {list.length === 1 ? "plant" : "plants"}</p>
              <ul className="flow-plants">
                {list.slice(0, compact ? 10 : 18).map(({ p, cs }) => {
                  const [slug, taxon, common] = f.plants[p];
                  const labels = cs.map((c) => f.concepts[c][1]);
                  return (
                    <li key={slug}>
                      <a href={href(`/plant/${slug}`, cs.length === 1 ? { c: f.concepts[cs[0]][0] } : null)} title={labels.join("; ")}>
                        <span className="flow-plant-name">{common ? common.charAt(0).toUpperCase() + common.slice(1) : <i>{taxon}</i>}</span>
                        <span className="flow-plant-sub">{common ? <i>{taxon}</i> : null} {labels.slice(0, 2).join(", ")}{labels.length > 2 ? ` +${labels.length - 2}` : ""}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
              {list.length > (compact ? 10 : 18) && <p className="flow-more muted">and {fmt.int(list.length - (compact ? 10 : 18))} more plants</p>}
            </>
          ) : <p className="muted">Point at a ribbon to list its plants.</p>}
        </div>
      </div>

      <div className="legend flow-legend" aria-hidden="true">
        <span className="legend-item"><span className="key-bar key-bar--both" />Kept: claimed in both herbals</span>
        <span className="legend-item"><span className="key-bar key-bar--dsc" />Dropped: Dioscorides only</span>
        <span className="legend-item"><span className="key-bar key-bar--cul" />Added: Culpeper only</span>
      </div>
      <p className="chart-axis-note">Ribbon height is the number of plant–indication claims. Universe: the {fmt.int(f.plants.length)} species with a chapter in Dioscorides and a monograph in Culpeper. Tiers count Europe PMC papers naming plant and indication together; a paper is attention, not proof.</p>
      <TableToggle label="Show the numbers">
        <table className="ledger ledger--compact">
          <caption className="visually-hidden">Claims by what Culpeper did and the 2026 evidence tier, {catLabel}</caption>
          <thead><tr><th scope="col">Culpeper</th>{TIER.map((t) => <th key={t.key} scope="col" className="num">{t.label}</th>)}<th scope="col" className="num">Total</th></tr></thead>
          <tbody>
            {GROUP.map((g, gi) => (
              <tr key={g.key}>
                <th scope="row">{g.label}</th>
                {TIER.map((t, ti) => <td key={t.key} className="num">{fmt.int(model.links.find((l) => l.id === `2:${gi}-${ti}`)?.n ?? 0)}</td>)}
                <td className="num">{fmt.int(model.B[gi])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableToggle>
    </div>
  );
}
