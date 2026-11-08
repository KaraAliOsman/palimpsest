import { useEffect, useRef, useState, type ReactNode } from "react";
import { TIER_LABEL, TIER_NOTE, IUCN, type Tier } from "../lib/data";
import { copyText } from "../lib/export";

export function Skeleton({ rows = 6, label = "Loading" }: { rows?: number; label?: string }) {
  // The label only appears after 300ms, so fast loads never flash it.
  const [late, setLate] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setLate(true), 300); return () => window.clearTimeout(t); }, []);
  return (
    <div className="skeleton" role="status" aria-live="polite">
      {Array.from({ length: rows }, (_, i) => <span key={i} className="skeleton-line" style={{ ["--w" as string]: `${58 + ((i * 37) % 38)}%` }} />)}
      <span className={late ? "skeleton-label" : "visually-hidden"}>{label}…</span>
    </div>
  );
}

export function ErrorState({ error, retry, what }: { error?: Error; retry?: () => void; what: string }) {
  return (
    <div className="state state--error" role="alert">
      <p className="state-title">{what} did not load.</p>
      <p className="state-body">{error?.message ?? "The data file could not be read."} The explorer reads plain JSON files beside this page; check your connection and try again.</p>
      {retry && <button type="button" className="btn btn--line" onClick={retry}>Try again</button>}
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state">
      <p className="state-title">{title}</p>
      {children && <p className="state-body">{children}</p>}
      {action}
    </div>
  );
}

/** Two cells: none filled is unstudied, one is sparse, two is studied. */
export function TierMeter({ tier, withLabel = true }: { tier: Tier | null; withLabel?: boolean }) {
  if (!tier) return <span className="muted">n/a</span>;
  const filled = tier === "unstudied" ? 0 : tier === "sparse" ? 1 : 2;
  return (
    <span className={`tier tier--${tier}`} title={`${TIER_LABEL[tier]}: ${TIER_NOTE[tier]}`}>
      <span className="tier-cells" aria-hidden="true">
        <span className={filled >= 1 ? "on" : ""} />
        <span className={filled >= 2 ? "on" : ""} />
      </span>
      {withLabel ? <span>{TIER_LABEL[tier]}</span> : <span className="visually-hidden">{TIER_LABEL[tier]}</span>}
    </span>
  );
}

export function Iucn({ code }: { code?: string | null }) {
  if (!code) return <span className="muted">Not assessed</span>;
  const c = code.toUpperCase();
  const threatened = c === "CR" || c === "EN" || c === "VU";
  return <span className={`iucn ${threatened ? "is-threatened" : ""}`}><abbr title={IUCN[c] ?? c}>{c}</abbr> <span className="iucn-name">{IUCN[c] ?? ""}</span></span>;
}

export function Ext({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a className={className ? `ext ${className}` : "ext"} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <svg className="ext-icon" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M4.5 2.5h5v5M9.5 2.5 3 9" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

export function Meter({ value, max = 1, label }: { value: number | null | undefined; max?: number; label: string }) {
  const v = typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <span className="meter" role="img" aria-label={label}>
      <span className="meter-fill" style={{ transform: `scaleX(${v})` }} />
    </span>
  );
}

export function TierStack({ counts }: { counts: Record<Tier, number> }) {
  const total = counts.unstudied + counts.sparse + counts.studied;
  if (!total) return <span className="muted">No claims</span>;
  const label = `${counts.unstudied} unstudied, ${counts.sparse} sparse, ${counts.studied} studied`;
  return (
    <span className="tierstack" title={label}>
      <span className="tierstack-bar" aria-hidden="true">
        {(["unstudied", "sparse", "studied"] as Tier[]).map((t) => counts[t] > 0 && (
          <span key={t} className={`tierstack-seg tierstack-seg--${t}`} style={{ flexGrow: counts[t] }} />
        ))}
      </span>
      <span className="visually-hidden">{label}</span>
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** A button that copies text and says so for two seconds; the result is announced politely. */
export function CopyButton({ text, label, done = "Copied", className = "btn btn--line" }: { text: string | (() => string); label: ReactNode; done?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  const t = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(t.current), []);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const ok = await copyText(typeof text === "function" ? text() : text);
        setState(ok ? "ok" : "fail");
        window.clearTimeout(t.current);
        t.current = window.setTimeout(() => setState("idle"), 2200);
      }}
    >
      <span aria-hidden={state !== "idle"}>{state === "idle" ? label : state === "ok" ? done : "Copy failed: select the text instead"}</span>
      <span className="visually-hidden" role="status">{state === "ok" ? done : state === "fail" ? "Copy failed" : ""}</span>
    </button>
  );
}

/** Responsible-use note. `tone="full"` explains; `tone="line"` is the one-sentence reminder. */
export function Caution({ tone = "line", children }: { tone?: "line" | "full"; children?: ReactNode }) {
  if (tone === "line") {
    return (
      <p className="caution-line" role="note">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 1.5 15 14H1z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M8 6v4M8 11.6v.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        <span>{children ?? "Computational hypotheses from historical texts, not medical advice. Several of these plants are poisonous."}</span>
      </p>
    );
  }
  return (
    <aside className="caution" role="note" aria-label="Responsible use">
      <p className="caution-title">Computational hypotheses, not medical advice.</p>
      {children ?? (
        <p>A claim here says what an old book wrote and how often modern papers mention the same plant with the same complaint. It says nothing about safety, dose or efficacy. Rue, hemlock, henbane and oleander are among the plants in these herbals; the ancients knew them as poisons too. Read the primary literature and ask a qualified professional before acting on anything you find.</p>
      )}
    </aside>
  );
}

/** The canon-table arch: one repeatable unit set over a column head, drawn in the gilt line.
 *  A segmental arch (it stretches with its column) with an inner reveal; strokes never scale. */
export function Arch({ className }: { className?: string }) {
  return (
    <svg className={className ? `arch ${className}` : "arch"} viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M1,60 V40 A49,38 0 0 1 99,40 V60" />
      <path d="M8,60 V42 A42,31 0 0 1 92,42 V60" className="arch-inner" />
    </svg>
  );
}
