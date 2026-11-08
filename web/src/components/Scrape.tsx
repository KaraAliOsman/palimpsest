// The signature interaction: a leaf written three times. Drag across it to scrape the 1653 ink off, find
// Dioscorides' Greek beneath, then scrape that too and reach the bare vellum of 2026 (what science has written).
// Each scrapeable layer carries a low-resolution alpha mask on a canvas; the upscaled mask gives the scraped
// edge its softness. The era row below is the keyboard and screen-reader path to the same three layers.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type Depth = 0 | 1 | 2;
export interface ScrapeLayer { id: string; era: string; who: string; label: string; body: ReactNode }

const SCALE = 5; // css px per mask px
const BRUSH = 30; // brush radius, css px
const DONE = 0.4; // share of the layer scraped before the rest lifts on its own

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function firstVisit(): boolean {
  try { if (sessionStorage.getItem("ps-scrape")) return false; sessionStorage.setItem("ps-scrape", "1"); } catch { /* storage blocked */ }
  return true;
}

interface Mask { c: HTMLCanvasElement; x: CanvasRenderingContext2D; dirty: boolean }

export function Scrape({ layers, onDepth, caption }: { layers: [ScrapeLayer, ScrapeLayer, ScrapeLayer]; onDepth?: (d: Depth) => void; caption?: ReactNode }) {
  const page = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const masks = useRef<(Mask | null)[]>([null, null]);
  const radios = useRef<(HTMLButtonElement | null)[]>([]);
  const [depth, setDepthState] = useState<Depth>(0);
  const depthRef = useRef<Depth>(0);
  const [touched, setTouched] = useState(false);
  const [lifting, setLifting] = useState(false);
  const raf = useRef(0);
  const auto = useRef(0);
  const last = useRef<{ x: number; y: number } | null>(null);
  const busy = useRef(false);

  const setDepth = useCallback((d: Depth) => { depthRef.current = d; setDepthState(d); onDepth?.(d); }, [onDepth]);

  // ---------------------------------------------------------------- masks
  const paintMask = useCallback((i: number) => {
    const m = masks.current[i], el = els.current[i];
    if (!m || !el || !m.dirty) return;
    m.dirty = false;
    const url = `url(${m.c.toDataURL()})`;
    el.style.maskImage = url;
    el.style.webkitMaskImage = url;
  }, []);

  const flush = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => { paintMask(0); paintMask(1); });
  }, [paintMask]);

  const resetMask = useCallback((i: number) => {
    const m = masks.current[i], el = els.current[i];
    if (m) { m.x.globalCompositeOperation = "source-over"; m.x.fillStyle = "#000"; m.x.fillRect(0, 0, m.c.width, m.c.height); m.dirty = false; }
    if (el) { el.style.maskImage = ""; el.style.webkitMaskImage = ""; }
  }, []);

  useLayoutEffect(() => {
    const host = page.current;
    if (!host) return;
    const build = () => {
      const r = host.getBoundingClientRect();
      const w = Math.max(8, Math.ceil(r.width / SCALE)), h = Math.max(8, Math.ceil(r.height / SCALE));
      for (let i = 0; i < 2; i++) {
        const prev = masks.current[i];
        if (prev && prev.c.width === w && prev.c.height === h) continue;
        const c = prev?.c ?? document.createElement("canvas");
        c.width = w; c.height = h;
        const x = c.getContext("2d", { willReadFrequently: true });
        if (!x) return;
        masks.current[i] = { c, x, dirty: false };
        resetMask(i);
      }
    };
    build();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => build());
    ro.observe(host);
    return () => ro.disconnect();
  }, [resetMask]);

  /** Erase a rough-edged stroke from (a) to (b), in css px relative to the page. */
  const stroke = useCallback((i: number, a: { x: number; y: number }, b: { x: number; y: number }, r = BRUSH) => {
    const m = masks.current[i];
    if (!m) return;
    const { x } = m;
    x.globalCompositeOperation = "destination-out";
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(dist / (r / 3)));
    for (let s = 0; s <= steps; s++) {
      const px = (a.x + ((b.x - a.x) * s) / steps) / SCALE, py = (a.y + ((b.y - a.y) * s) / steps) / SCALE;
      const rr = r / SCALE;
      const g = x.createRadialGradient(px, py, rr * 0.25, px, py, rr);
      g.addColorStop(0, "rgba(0,0,0,0.9)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g;
      x.beginPath(); x.arc(px, py, rr, 0, Math.PI * 2); x.fill();
      // grit: a few hard flecks at the edge, so the scrape reads as a blade on vellum, not an airbrush
      x.fillStyle = "rgba(0,0,0,0.85)";
      for (let k = 0; k < 3; k++) {
        const t = Math.random() * Math.PI * 2, d = rr * (0.55 + Math.random() * 0.5);
        x.fillRect(px + Math.cos(t) * d, py + Math.sin(t) * d, 1, 1);
      }
    }
    m.dirty = true;
  }, []);

  const coverage = (i: number): number => {
    const m = masks.current[i];
    if (!m) return 0;
    const d = m.x.getImageData(0, 0, m.c.width, m.c.height).data;
    let clear = 0;
    for (let k = 3; k < d.length; k += 4) if (d[k] < 110) clear++;
    return clear / (d.length / 4);
  };

  // ---------------------------------------------------------------- lift a layer away / ink it back
  const lift = useCallback((i: number, then?: () => void) => {
    const el = els.current[i];
    if (!el) return;
    busy.current = true;
    setLifting(true);
    const finish = () => {
      el.style.transition = "";
      el.dataset.gone = "1";
      resetMask(i);
      el.style.opacity = "";
      busy.current = false;
      setLifting(false);
      setDepth((i + 1) as Depth);
      then?.();
    };
    if (reduced()) { finish(); return; }
    el.style.transition = "opacity 380ms cubic-bezier(0.23, 1, 0.32, 1)";
    el.style.opacity = "0";
    window.setTimeout(finish, 390);
  }, [resetMask, setDepth]);

  const inkBack = useCallback((i: number) => {
    const el = els.current[i];
    if (!el) return;
    resetMask(i);
    delete el.dataset.gone;
    if (reduced()) { el.style.opacity = ""; return; }
    el.style.transition = "none";
    el.style.opacity = "0";
    void el.offsetWidth;
    el.style.transition = "opacity 240ms cubic-bezier(0.23, 1, 0.32, 1)";
    el.style.opacity = "1";
    window.setTimeout(() => { el.style.transition = ""; el.style.opacity = ""; }, 260);
  }, [resetMask]);

  /** A blade sweeps the layer in rows (keyboard, era clicks, the first-visit hint). */
  const sweep = useCallback((i: number, ms: number, until = 1, done?: () => void) => {
    const host = page.current;
    if (!host) return;
    cancelAnimationFrame(auto.current);
    const { width: W, height: H } = host.getBoundingClientRect();
    const rows = Math.max(3, Math.ceil(H / (BRUSH * 1.3)));
    const pts: { x: number; y: number }[] = [];
    for (let r = 0; r < rows; r++) {
      const y = ((r + 0.5) / rows) * H + (Math.random() - 0.5) * 8;
      pts.push(r % 2 ? { x: W + 10, y } : { x: -10, y }, r % 2 ? { x: -10, y: y + H / rows / 2 } : { x: W + 10, y: y + H / rows / 2 });
    }
    const total = pts.length - 1;
    const t0 = performance.now();
    let drawn = 0;
    const step = (now: number) => {
      const p = Math.min(until, (now - t0) / ms);
      const upto = p * total;
      while (drawn < Math.floor(upto)) { stroke(i, pts[drawn], pts[drawn + 1]); drawn++; }
      const f = upto - Math.floor(upto), a = pts[drawn], b = pts[Math.min(total, drawn + 1)];
      if (a && b && f > 0) stroke(i, a, { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
      paintMask(i);
      if (p < until) auto.current = requestAnimationFrame(step);
      else done?.();
    };
    auto.current = requestAnimationFrame(step);
  }, [paintMask, stroke]);

  /** Go to a depth from wherever we are: scrape down layer by layer, or ink back up. */
  const goTo = useCallback((target: Depth) => {
    if (busy.current) return;
    setTouched(true);
    cancelAnimationFrame(auto.current);
    const now = depthRef.current;
    if (target < now) {
      resetMask(now < 2 ? now : 1);
      for (let i = now - 1; i >= target; i--) inkBack(i);
      setDepth(target);
      return;
    }
    if (target === now) { if (now < 2) { resetMask(now); } return; }
    const down = (i: number) => {
      if (i >= target) return;
      if (reduced()) { lift(i, () => down(i + 1)); return; }
      busy.current = true;
      sweep(i, 520, 1, () => { busy.current = false; lift(i, () => down(i + 1)); });
    };
    down(now);
  }, [inkBack, lift, resetMask, setDepth, sweep]);

  // ---------------------------------------------------------------- pointer scraping
  const pos = (e: React.PointerEvent) => {
    const r = page.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e: React.PointerEvent) => {
    if (depthRef.current >= 2 || busy.current || e.button > 0) return;
    if ((e.target as HTMLElement).closest("a, button")) return;
    cancelAnimationFrame(auto.current);
    setTouched(true);
    last.current = pos(e);
    page.current?.setPointerCapture?.(e.pointerId);
    stroke(depthRef.current, last.current, last.current);
    flush();
  };
  const onMove = (e: React.PointerEvent) => {
    if (!last.current || busy.current) return;
    const p = pos(e);
    stroke(depthRef.current, last.current, p);
    last.current = p;
    flush();
  };
  const onUp = () => {
    if (!last.current) return;
    last.current = null;
    const i = depthRef.current;
    if (i < 2 && coverage(i) >= DONE) lift(i);
  };

  // First visit: one short demonstration stroke, so the leaf explains itself. Cancelled by any interaction.
  useEffect(() => {
    if (reduced() || !firstVisit()) return;
    const t = window.setTimeout(() => { if (!touched && depthRef.current === 0) sweep(0, 1500, 0.16); }, 1300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => { cancelAnimationFrame(raf.current); cancelAnimationFrame(auto.current); }, []);

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    const j = e.key === "Home" ? 0 : e.key === "End" ? 2 : n ? Math.max(0, Math.min(2, i + n)) : -1;
    if (j < 0) return;
    e.preventDefault();
    goTo(j as Depth);
    radios.current[j]?.focus();
  };

  return (
    <figure className={`leaf is-depth-${depth} ${touched ? "is-touched" : ""} ${lifting ? "is-lifting" : ""}`}>
      <div className="leaf-frame">
        <div
          ref={page}
          className="leaf-page"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onLostPointerCapture={onUp}
        >
          {/* bottom first, so the DOM order reads 1653, 60 CE, 2026 through z-index rather than source order */}
          {[2, 1, 0].map((i) => {
            const L = layers[i];
            const covered = i > depth;
            const gone = i < depth;
            return (
              <section
                key={L.id}
                ref={(el) => { els.current[i] = el as HTMLDivElement | null; }}
                className={`leaf-layer leaf-layer--${L.id}`}
                style={{ zIndex: 3 - i }}
                aria-label={`${L.era}: ${L.label}`}
                aria-hidden={covered || gone}
                inert={covered || gone}
                data-gone={gone ? "1" : undefined}
              >
                {L.body}
              </section>
            );
          })}
          <p className="leaf-hint" aria-hidden="true">
            <svg viewBox="0 0 28 20" width="28" height="20"><path d="M3 15c5-9 15-12 22-11-4 2-7 6-8 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M17 16 13 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            {depth === 0 ? "Drag across the page to scrape off the 1653 ink" : "Keep scraping: what has 2026 written here?"}
          </p>
        </div>
      </div>
      <div className="eras eras--leaf" role="radiogroup" aria-label="Which layer of the page to read">
        {layers.map((L, i) => {
          const on = depth === i;
          return (
            <button
              key={L.id}
              ref={(el) => { radios.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              className={`era era--${L.id} ${i < depth ? "is-past" : ""}`}
              onClick={() => goTo(i as Depth)}
              onKeyDown={(ev) => onKey(ev, i)}
            >
              <span className="era-mark" aria-hidden="true" />
              <span className="era-year num">{L.era}</span>
              <span className="era-who">{L.who}</span>
            </button>
          );
        })}
      </div>
      <p className="visually-hidden" aria-live="polite">{`Showing ${layers[depth].era}: ${layers[depth].label}.`}</p>
      {caption && <figcaption className="seam leaf-cap">{caption}</figcaption>}
    </figure>
  );
}
