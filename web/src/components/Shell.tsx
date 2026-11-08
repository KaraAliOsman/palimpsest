import { useEffect, useState } from "react";
import { href } from "../lib/router";
import { fmt } from "../lib/format";
import { Ext } from "./ui";
import type { Summary } from "../lib/data";

const NAV = [
  { to: "/plants", label: "Plants", match: ["plants", "plant"] },
  { to: "/evidence", label: "Evidence", match: ["evidence"] },
  { to: "/leads", label: "Leads", match: ["leads"] },
  { to: "/methods", label: "Methods", match: ["methods"] },
];

type Mode = "light" | "dark";

function currentMode(): Mode {
  const set = document.documentElement.dataset.mode;
  if (set === "dark" || set === "light") return set;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function ThemeToggle() {
  const [mode, setMode] = useState<Mode>(currentMode);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const on = () => { if (!document.documentElement.dataset.mode) setMode(currentMode()); };
    mq?.addEventListener?.("change", on);
    return () => mq?.removeEventListener?.("change", on);
  }, []);
  const next: Mode = mode === "dark" ? "light" : "dark";
  const flip = () => {
    document.documentElement.dataset.mode = next;
    try { localStorage.setItem("palimpsest-mode", next); } catch { /* private mode: the choice lasts this visit */ }
    setMode(next);
  };
  return (
    <button type="button" className="mode-toggle" onClick={flip} aria-label={next === "dark" ? "Switch to the ink (dark) theme" : "Switch to the parchment (light) theme"}>
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
        <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 2.75a7.25 7.25 0 0 1 0 14.5z" fill="currentColor" />
      </svg>
      <span className="mode-toggle-label">{next === "dark" ? "Ink" : "Parchment"}</span>
    </button>
  );
}

export function Header({ section }: { section: string }) {
  return (
    <header className="masthead">
      <div className="container masthead-row">
        <a className="wordmark" href={href("/")} aria-label="Palimpsest, overview">Palimpsest</a>
        <nav className="mainnav" aria-label="Main">
          <ul>
            {NAV.map((n) => (
              <li key={n.to}>
                <a href={href(n.to)} aria-current={n.match.includes(section) ? "page" : undefined}>{n.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}

export function Footer({ summary }: { summary?: Summary }) {
  const when = fmt.date(summary?.generated);
  return (
    <footer className="colophon">
      <div className="container">
        <p className="colophon-statement">Computational hypotheses from two old books, not medical advice.</p>
        <div className="colophon-grid">
          <div>
            <p className="colophon-head">Palimpsest</p>
            <p className="muted">EthnoHack 2026, Track 1: traditional knowledge. {when ? `Data exported ${when}.` : ""}</p>
            <p><a href={href("/methods")}>Methods, licences and limitations</a></p>
          </div>
          <div>
            <p className="colophon-head">Texts</p>
            <ul className="plain">
              <li><Ext href="https://scaife.perseus.org/library/urn:cts:greekLit:tlg0656.tlg001/">Dioscorides, First1KGreek</Ext></li>
              <li><Ext href="https://www.gutenberg.org/ebooks/49513">Culpeper, Gutenberg 49513</Ext></li>
            </ul>
          </div>
          <div>
            <p className="colophon-head">Evidence</p>
            <ul className="plain">
              <li><Ext href="https://europepmc.org/">Europe PMC</Ext></li>
              <li><Ext href="https://clinicaltrials.gov/">ClinicalTrials.gov</Ext></li>
              <li><Ext href="https://www.wikidata.org/">Wikidata and LOTUS</Ext></li>
              <li><Ext href="https://www.gbif.org/">GBIF</Ext></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
