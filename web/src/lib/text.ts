import type { Span, TextEntry } from "./data";

/** The clause around a span: back to the previous stop or comma, forward to the next, capped at word boundaries. */
export function clause(text: string, span: Span, back = 70, fwd = 70): { pre: string; hit: string; post: string; cutStart: boolean; cutEnd: boolean } {
  const stops = /[.;·:,]/;
  // Lexicon hits are stems (ἰκτερ); show the whole word they sit in.
  const L = /[\p{L}\p{M}]/u;
  let s0 = span.start, e0 = span.end;
  while (s0 > 0 && L.test(text[s0 - 1])) s0--;
  while (e0 < text.length && L.test(text[e0])) e0++;
  span = { ...span, start: s0, end: e0 };
  let a = span.start;
  while (a > 0 && span.start - a < back && !stops.test(text[a - 1])) a--;
  let cutStart = a > 0 && !stops.test(text[a - 1]);
  if (cutStart) { const sp = text.indexOf(" ", a); if (sp > 0 && sp < span.start) a = sp + 1; }
  let b = span.end;
  while (b < text.length && b - span.end < fwd && !/[.;·]/.test(text[b])) b++;
  let cutEnd = b < text.length && !/[.;·]/.test(text[b]);
  if (cutEnd) { const sp = text.lastIndexOf(" ", b); if (sp > span.end) b = sp; }
  else if (b < text.length) b++;
  const clean = (s: string) => s.replace(/\s\d{1,2}\s/g, " ").replace(/_/g, "");
  cutStart = cutStart && a > 0;
  cutEnd = cutEnd && b < text.length;
  return { pre: clean(text.slice(a, span.start)).replace(/^\s+/, ""), hit: text.slice(span.start, span.end), post: clean(text.slice(span.end, b)), cutStart, cutEnd };
}

export function firstSpan(t: TextEntry | undefined, concept: string): Span | null {
  const s = (t?.spans ?? []).find((x) => x.concept_id === concept && x.polarity !== "adverse");
  return s ?? null;
}
