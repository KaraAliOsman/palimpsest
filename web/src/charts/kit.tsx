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

/** True once the element has scrolled into view (charts draw their marks once, then stay). */
export function useInView<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { rootMargin: "0px 0px -12% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

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
  const cands = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 10];
  return cands.filter((v) => v >= lo * 0.999 && v <= hi * 1.001);
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

export function useTip(frame: RefObject<HTMLElement | null>) {
  const [tip, setTip] = useState<TipState | null>(null);
  const show = (el: Element, lines: ReactNode[]) => {
    const host = frame.current;
    if (!host) return;
    const r = el.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    const x = Math.max(80, Math.min(h.width - 80, r.left - h.left + r.width / 2));
    setTip({ x, y: r.top - h.top - 10, lines });
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

/** Bar with a 4px rounded data end and a square baseline end. */
export function barRight(x: number, y: number, w: number, h: number, r = 4): string {
  const rr = Math.max(0, Math.min(r, h / 2, w));
  return `M${x},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h - rr}Q${x + w},${y + h} ${x + w - rr},${y + h}H${x}Z`;
}
export function barUp(x: number, y: number, w: number, h: number, r = 2): string {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}
