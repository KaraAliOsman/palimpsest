import { useEffect, useLayoutEffect, useRef, useState, type FocusEvent, type MouseEvent, type ReactNode, type RefObject } from "react";

export function useWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const ro = new ResizeObserver((entries) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setW(entries[0].contentRect.width));
    });
    ro.observe(el);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); };
  }, []);
  return [ref, w];
}

/** Round ticks for a linear axis. */
export function niceTicks(lo: number, hi: number, count = 5): number[] {
  if (!(hi > lo)) return [lo];
  const step0 = (hi - lo) / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

export function logTicks(lo: number, hi: number): number[] {
  const cands = [0.1, 0.2, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 10, 20, 50, 100];
  const t = cands.filter((v) => v >= lo * 0.999 && v <= hi * 1.001);
  if (t.length > 7) return t.filter((v) => [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100].includes(v));
  return t;
}

export interface TipState { x: number; y: number; lines: ReactNode[] }

export function ChartTip({ tip }: { tip: TipState | null }) {
  if (!tip) return null;
  return (
    <div className="chart-tip" role="status" style={{ left: tip.x, top: tip.y }}>
      {tip.lines.map((l, i) => <span key={i} className={i === 0 ? "chart-tip-value" : "chart-tip-line"}>{l}</span>)}
    </div>
  );
}

/** Pointer and keyboard handlers that place one tooltip relative to the chart's frame. */
export function useTip(frame: RefObject<HTMLElement | null>) {
  const [tip, setTip] = useState<TipState | null>(null);
  const show = (el: Element, lines: ReactNode[]) => {
    const host = frame.current;
    if (!host) return;
    const r = el.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    const x = Math.max(70, Math.min(h.width - 70, r.left - h.left + r.width / 2));
    setTip({ x, y: r.top - h.top - 8, lines });
  };
  const hide = () => setTip(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setTip(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const bind = (lines: ReactNode[]) => ({
    tabIndex: 0,
    onMouseEnter: (e: MouseEvent<SVGElement>) => show(e.currentTarget, lines),
    onMouseLeave: hide,
    onFocus: (e: FocusEvent<SVGElement>) => show(e.currentTarget, lines),
    onBlur: hide,
  });
  return { tip, bind, hide };
}

export function TableToggle({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="numbers">
      <summary>{label}</summary>
      <div className="numbers-body">{children}</div>
    </details>
  );
}
