import { useEffect, useState, type ReactNode } from "react";
import { TIER_LABEL, TIER_NOTE, IUCN, type Tier } from "../lib/data";

export function Skeleton({ rows = 6, label = "Loading" }: { rows?: number; label?: string }) {
  // The label only appears after 300ms, so fast loads never flash it.
  const [late, setLate] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setLate(true), 300); return () => window.clearTimeout(t); }, []);
  return (
    <div className="skeleton" role="status" aria-live="polite">
      {Array.from({ length: rows }, (_, i) => <span key={i} className="skeleton-line" style={{ ["--w" as string]: `${62 + ((i * 37) % 34)}%` }} />)}
      <span className={late ? "skeleton-label" : "visually-hidden"}>{label}…</span>
    </div>
  );
}

export function ErrorState({ error, retry, what }: { error?: Error; retry?: () => void; what: string }) {
  return (
    <div className="state state--error" role="alert">
      <p className="state-title">{what} did not load.</p>
      <p className="state-body">{error?.message ?? "The data file could not be read."} Check that the export wrote it to <code>data/</code> beside this page, then try again.</p>
      {retry && <button type="button" className="btn btn--quiet" onClick={retry}>Try again</button>}
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
  return <span className="iucn"><abbr title={IUCN[c] ?? c}>{c}</abbr> <span className="iucn-name">{IUCN[c] ?? ""}</span></span>;
}

export function Ext({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a className={className ? `ext ${className}` : "ext"} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <svg className="ext-icon" viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M4.5 2.5h5v5M9.5 2.5 3 9" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
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

/** Thin segmented bar: a plant's claims split by evidence tier, widths proportional. */
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
      <span className="tierstack-nums num" aria-label={label}>{counts.unstudied}<span className="muted">/</span>{counts.sparse}<span className="muted">/</span>{counts.studied}</span>
    </span>
  );
}
