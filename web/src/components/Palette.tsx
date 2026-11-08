import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { fold, useResource, type SearchIndex, type SearchPlant, type SearchConcept } from "../lib/data";
import { go, href } from "../lib/router";
import { Kbd } from "./ui";

type Hit =
  | { kind: "plant"; key: string; to: string; score: number; p: SearchPlant; via: string | null }
  | { kind: "concept"; key: string; to: string; score: number; c: SearchConcept }
  | { kind: "page"; key: string; to: string; score: number; label: string; note: string };

const PAGES = [
  { to: "/findings", label: "Findings", note: "Transmission, matched controls, odds ratios", words: "findings evidence results figures transmission odds ratio null" },
  { to: "/leads", label: "Leads", note: "60 under-studied pairs, export CSV", words: "leads hypotheses drug discovery ranked rue" },
  { to: "/plants", label: "All plants", note: "692 accepted taxa", words: "plants index taxa browse list" },
  { to: "/data", label: "Data and API", note: "Knowledge graph, claims, licences, citation", words: "data api download graphml csv json cite citation licence knowledge graph" },
  { to: "/methods", label: "Methods and responsible use", note: "How a Greek clause becomes a hypothesis", words: "methods limitations responsible use disclaimer safety" },
  { to: "/credits", label: "Image credits", note: "Vienna Dioscurides, Fuchs, Gerard, Culpeper", words: "credits images codex vienna dioscurides fuchs gerard licence" },
  { to: "/about", label: "About and team", note: "EthnoHack 2026", words: "about team contact hackathon" },
];

function score(field: string, q: string): number {
  if (!field) return 0;
  if (field === q) return 100;
  if (field.startsWith(q)) return 80;
  const i = field.indexOf(" " + q);
  if (i >= 0) return 60;
  if (field.includes(q)) return 35;
  return 0;
}

function searchAll(index: SearchIndex | undefined, raw: string): Hit[] {
  const q = fold(raw.trim());
  if (!q) {
    // Opening state: a few doors worth knowing about.
    const picks = (index?.plants ?? []).filter((p) => p.lr && p.lr <= 4).sort((a, b) => (a.lr ?? 99) - (b.lr ?? 99));
    const ww = index?.plants.find((p) => p.s === "artemisia-absinthium");
    return [
      ...(ww ? [{ kind: "plant" as const, key: ww.s, to: `/plant/${ww.s}`, score: 1, p: ww, via: null }] : []),
      ...picks.map((p) => ({ kind: "plant" as const, key: p.s, to: `/plant/${p.s}`, score: 1, p, via: null })),
      ...PAGES.slice(0, 4).map((pg) => ({ kind: "page" as const, key: pg.to, to: pg.to, score: 0, label: pg.label, note: pg.note })),
    ];
  }
  const hits: Hit[] = [];
  for (const p of index?.plants ?? []) {
    let best = 0, via: string | null = null;
    const fields: [string, string | null][] = [[p.t, null], [p.c ?? "", null], [p.e ?? "", p.e ?? null], [p.f ?? "", null], ...p.g.map((g) => [g, g] as [string, string])];
    for (const [f, v] of fields) {
      const s = score(fold(f), q);
      if (s > best) { best = s; via = v; }
    }
    if (best) hits.push({ kind: "plant", key: p.s, to: `/plant/${p.s}`, score: best + Math.min(10, p.n / 6) + (p.lr ? 6 : 0), p, via });
  }
  for (const c of index?.concepts ?? []) {
    const s = Math.max(score(fold(c.l), q), score(fold(c.id.replace(/_/g, " ")), q), score(fold(c.cat ?? ""), q) * 0.6, c.m && fold(c.m) === q ? 90 : 0);
    if (s) hits.push({ kind: "concept", key: c.id, to: `/plants?c=${encodeURIComponent(c.id)}`, score: s + 5, c });
  }
  for (const pg of PAGES) {
    const s = Math.max(score(fold(pg.label), q), fold(pg.words).split(" ").some((w) => w.startsWith(q)) ? 50 : 0);
    if (s) hits.push({ kind: "page", key: pg.to, to: pg.to, score: s, label: pg.label, note: pg.note });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 40);
}

export function Palette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const index = useResource<SearchIndex>(open ? "derived/search.json" : null);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); setActive(0); window.setTimeout(() => input.current?.select(), 0); }
    if (!open && d.open) d.close();
  }, [open]);

  const hits = useMemo(() => searchAll(index.data, q), [index.data, q]);
  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (h: Hit | undefined) => {
    if (!h) return;
    onClose();
    go(h.to);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(hits.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Home" && e.ctrlKey) { e.preventDefault(); setActive(0); }
    else if (e.key === "End" && e.ctrlKey) { e.preventDefault(); setActive(hits.length - 1); }
    else if (e.key === "Enter") { e.preventDefault(); choose(hits[active]); }
  };

  const groups: { title: string; kind: Hit["kind"] }[] = [
    { title: "Plants", kind: "plant" }, { title: "Indications", kind: "concept" }, { title: "Pages", kind: "page" },
  ];
  let i = -1;

  return (
    <dialog ref={dialog} className="palette" aria-labelledby={`${id}-t`} onClose={onClose} onClick={(e) => { if (e.target === dialog.current) onClose(); }}>
      <div className="palette-box">
        <h2 id={`${id}-t`} className="visually-hidden">Search the explorer</h2>
        <div className="palette-field">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="m12.7 12.7 4.3 4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          <input
            ref={input}
            type="search"
            role="combobox"
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-activedescendant={hits[active] ? `${id}-o-${active}` : undefined}
            aria-autocomplete="list"
            aria-label="Search plants, Greek names, English names and indications"
            placeholder="ἀψινθιον, wormwood, Artemisia, jaundice…"
            autoComplete="off"
            spellCheck={false}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
          />
          <button type="button" className="palette-esc" onClick={onClose}><Kbd>Esc</Kbd><span className="visually-hidden">Close search</span></button>
        </div>
        <div className="palette-body">
          {index.status === "loading" && <p className="palette-note">Opening the index…</p>}
          {index.status === "error" && <p className="palette-note">The search index did not load. <button type="button" className="linkish" onClick={index.retry}>Try again</button></p>}
          {index.status === "ready" && hits.length === 0 && (
            <p className="palette-note">Nothing matches “{q}”. Greek works with or without accents; try a Latin binomial, Culpeper’s English name, or an indication such as <i>jaundice</i>.</p>
          )}
          <ul ref={list} id={`${id}-list`} role="listbox" aria-label="Results" className="palette-list">
            {groups.map((g) => {
              const items = hits.filter((h) => h.kind === g.kind);
              if (!items.length) return null;
              return (
                <li key={g.kind} role="presentation" className="palette-group">
                  <p className="palette-group-title" aria-hidden="true">{q.trim() ? g.title : g.kind === "plant" ? "Start with" : "Pages"}</p>
                  <ul role="group" aria-label={g.title}>
                    {items.map((h) => {
                      i++;
                      const n = i;
                      return (
                        <li
                          key={h.kind + h.key}
                          id={`${id}-o-${n}`}
                          role="option"
                          aria-selected={n === active}
                          data-i={n}
                          className="palette-opt"
                          onMouseMove={() => setActive(n)}
                          onClick={() => choose(h)}
                        >
                          {h.kind === "plant" && (
                            <>
                              <span className="opt-main"><i>{h.p.t}</i>{h.p.lr ? <span className="opt-tag">Lead {h.p.lr}</span> : null}</span>
                              <span className="opt-sub">
                                {h.via && h.p.g.includes(h.via) ? <span lang="grc" className="grc">{h.via}</span> : h.p.g[0] ? <span lang="grc" className="grc">{h.p.g[0]}</span> : null}
                                {(h.p.e || h.p.c) && <span>{h.p.e ?? h.p.c}</span>}
                                <span className="muted">{h.p.n} claims</span>
                              </span>
                            </>
                          )}
                          {h.kind === "concept" && (
                            <>
                              <span className="opt-main">{h.c.l}</span>
                              <span className="opt-sub"><span>{h.c.cat}</span>{h.c.m && <span className="num">MeSH {h.c.m}</span>}<span className="muted">{h.c.np} plants</span></span>
                            </>
                          )}
                          {h.kind === "page" && (
                            <>
                              <span className="opt-main">{h.label}</span>
                              <span className="opt-sub"><span className="muted">{h.note}</span></span>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="palette-foot" aria-hidden="true"><span><Kbd>↑</Kbd><Kbd>↓</Kbd> move</span><span><Kbd>Enter</Kbd> open</span><span><Kbd>Esc</Kbd> close</span><a href={href("/plants")} onClick={onClose}>Browse every plant</a></p>
      </div>
    </dialog>
  );
}
