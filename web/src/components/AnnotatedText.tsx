import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { conceptLabel, type Concept, type Span } from "../lib/data";

interface Props {
  text: string;
  spans: Span[];
  lang: "grc" | "en";
  source: "dsc" | "cul";
  concepts: Map<string, Concept>;
  persistent: Set<string>;
  lit: string | null;
  selected: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  clampAt?: number;
}

interface Tip { i: number; x: number; y: number; below: boolean }

const POLARITY: Record<string, string> = { therapeutic: "Treats or relieves", adverse: "Causes or harms", action: "Pharmacological action" };

/** Plain runs: Greek edition section numbers (" 2 ") become small marginal numerals. */
function plain(s: string, lang: "grc" | "en", key: string): ReactNode[] {
  if (lang !== "grc") {
    // Gutenberg marks italics as _word_; set them as italics.
    const bits = s.split(/_([^_\n]{1,80})_/g);
    return bits.map((b, i) => (i % 2 ? <i key={`${key}-i${i}`}>{b}</i> : b));
  }
  const out: ReactNode[] = [];
  const re = /(^|\s)(\d{1,2})(?=\s)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(s))) {
    const at = m.index + m[1].length;
    out.push(s.slice(last, at));
    out.push(<sup key={`${key}-${k++}`} className="sec" aria-label={`section ${m[2]}`}>{m[2]}</sup>);
    last = at + m[2].length;
  }
  out.push(s.slice(last));
  return out;
}

export function AnnotatedText({ text, spans, lang, source, concepts, persistent, lit, selected, onSelect, onHover, clampAt = 1800 }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [tip, setTip] = useState<Tip | null>(null);
  const tipId = useId();
  const long = text.length > clampAt;
  const [open, setOpen] = useState(false);

  const clean = useMemo(() => {
    const sorted = spans
      .filter((s) => s && Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start && s.start >= 0 && s.start < text.length)
      .map((s) => ({ ...s, end: Math.min(s.end, text.length) }))
      .sort((a, b) => a.start - b.start || b.end - a.end);
    const out: Span[] = [];
    let edge = -1;
    for (const s of sorted) if (s.start >= edge) { out.push(s); edge = s.end; }
    return out;
  }, [spans, text]);

  // A selection from the table that sits below the fold opens the chapter.
  useEffect(() => {
    if (!long || open || !selected) return;
    const s = clean.find((x) => x.concept_id === selected);
    if (s && s.start > clampAt * 0.8) setOpen(true);
  }, [selected, clean, long, open, clampAt]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const place = (el: HTMLElement, i: number) => {
    const host = box.current;
    if (!host) return;
    const r = el.getClientRects()[0] ?? el.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    const half = Math.min(150, h.width / 2);
    const x = Math.max(half, Math.min(h.width - half, r.left - h.left + r.width / 2));
    const below = r.top - h.top < 88;
    setTip({ i, x, y: below ? r.bottom - h.top + 8 : r.top - h.top - 8, below });
  };

  // Clamped: render only the opening, cut at a word, so hidden marks never take focus.
  let limit = text.length;
  if (long && !open) {
    limit = text.lastIndexOf(" ", clampAt);
    if (limit < clampAt * 0.6) limit = clampAt;
    const straddle = clean.find((x) => x.start < limit && x.end > limit);
    if (straddle) limit = straddle.end;
  }

  const parts: ReactNode[] = [];
  let at = 0;
  clean.forEach((s, i) => {
    if (s.start >= limit) return;
    if (s.start > at) parts.push(...plain(text.slice(at, s.start), lang, `p${i}`));
    const id = s.concept_id;
    const cls = [
      "span", `span--${source}`,
      persistent.has(id) ? "is-persistent" : "",
      lit === id ? "is-lit" : "",
      selected === id ? "is-selected" : "",
      s.polarity === "adverse" ? "is-adverse" : "",
    ].filter(Boolean).join(" ");
    parts.push(
      <mark
        key={`s${i}`}
        className={cls}
        tabIndex={0}
        data-concept={id}
        aria-describedby={tip?.i === i ? tipId : undefined}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          onHover(id);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => place(el, i), 450);
        }}
        onMouseLeave={() => { window.clearTimeout(timer.current); onHover(null); setTip((t) => (t?.i === i ? null : t)); }}
        onFocus={(e) => { window.clearTimeout(timer.current); onHover(id); place(e.currentTarget, i); }}
        onBlur={() => { onHover(null); setTip((t) => (t?.i === i ? null : t)); }}
        onClick={() => onSelect(id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(id); }
          if (e.key === "Escape") setTip(null);
        }}
      >
        {text.slice(s.start, s.end)}
      </mark>,
    );
    at = s.end;
  });
  if (at < limit) parts.push(...plain(text.slice(at, limit), lang, "tail"));
  if (limit < text.length) parts.push(<span key="more" className="reading-ellipsis" aria-hidden="true"> …</span>);

  const active = tip ? clean[tip.i] : null;
  const c = active ? concepts.get(active.concept_id) : null;

  return (
    <div className="annotated" ref={box}>
      <div
        className={`reading reading--${lang} ${long && !open ? "is-clamped" : ""}`}
        lang={lang}
        id={`${tipId}-text`}
      >
        {parts}
      </div>
      {long && (
        <button type="button" className="btn btn--quiet btn--small reading-more" aria-expanded={open} aria-controls={`${tipId}-text`} onClick={() => setOpen((o) => !o)}>
          {open ? "Show less" : `Show the whole ${lang === "grc" ? "chapter" : "section"}`}
        </button>
      )}
      {active && tip && (
        <div
          id={tipId}
          role="tooltip"
          className={`gloss-tip ${tip.below ? "is-below" : ""}`}
          style={{ left: tip.x, top: tip.y }}
        >
          <span className="gloss-tip-label">{conceptLabel(concepts, active.concept_id)}</span>
          <span className="gloss-tip-meta">
            {c?.mesh_id ? <>MeSH <span className="num">{c.mesh_id}</span></> : "No MeSH id yet"}
            {c?.category ? <>, {c.category}</> : null}
          </span>
          <span className="gloss-tip-meta">{POLARITY[active.polarity ?? "therapeutic"] ?? active.polarity}{persistent.has(active.concept_id) ? ", in both herbals" : ""}</span>
        </div>
      )}
    </div>
  );
}
