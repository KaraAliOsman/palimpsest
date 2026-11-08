import { useEffect, useState } from "react";
import { href } from "../lib/router";
import { fmt } from "../lib/format";
import { SITE } from "../lib/export";
import { Ext, Kbd, isMac } from "./ui";
import type { Summary } from "../lib/data";

export const NAV = [
  { to: "/plants", label: "Plants", match: ["plants", "plant"] },
  { to: "/findings", label: "Findings", match: ["findings", "evidence"] },
  { to: "/leads", label: "Leads", match: ["leads"] },
  { to: "/data", label: "Data", match: ["data"] },
  { to: "/methods", label: "Methods", match: ["methods"] },
];

type Theme = "light" | "dark";
function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "dark" || set === "light") return set;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const on = () => { if (!document.documentElement.dataset.theme) setTheme(currentTheme()); };
    mq?.addEventListener?.("change", on);
    return () => mq?.removeEventListener?.("change", on);
  }, []);
  const next: Theme = theme === "dark" ? "light" : "dark";
  const flip = () => {
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("palimpsest-theme", next); } catch { /* private mode: lasts this visit */ }
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", next === "dark" ? "#17120d" : "#e3d5b3");
    setTheme(next);
  };
  return (
    <button type="button" className="icon-btn" onClick={flip} aria-label={next === "dark" ? "Switch to the ink theme (dark)" : "Switch to the vellum theme (light)"} title={next === "dark" ? "Ink theme" : "Vellum theme"}>
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
        <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 3a7 7 0 0 1 0 14z" fill="currentColor" />
      </svg>
    </button>
  );
}

export function Header({ section, onSearch }: { section: string; onSearch: () => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [section]);
  return (
    <header className="mast">
      <div className="wrap mast-row">
        <a className="wordmark" href={href("/")} aria-label="Palimpsest, home">
          <span className="wordmark-initial" aria-hidden="true">P</span><span aria-hidden="true">alimpsest</span>
        </a>
        <nav className={`mainnav ${open ? "is-open" : ""}`} aria-label="Main" id="mainnav">
          <ul>
            {NAV.map((n) => (
              <li key={n.to}><a href={href(n.to)} aria-current={n.match.includes(section) ? "page" : undefined}>{n.label}</a></li>
            ))}
          </ul>
        </nav>
        <div className="mast-tools">
          <button type="button" className="search-trigger" onClick={onSearch} aria-label="Search plants, Greek names and indications" aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}>
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="m12.7 12.7 4.3 4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            <span className="search-trigger-label">Search</span>
            <span className="search-trigger-keys" aria-hidden="true"><Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd><Kbd>K</Kbd></span>
          </button>
          <ThemeToggle />
          <button type="button" className="icon-btn menu-btn" aria-expanded={open} aria-controls="mainnav" onClick={() => setOpen((o) => !o)} aria-label={open ? "Close the menu" : "Open the menu"}>
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              {open ? <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /> : <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

export function Footer({ summary }: { summary?: Summary }) {
  const when = fmt.date(summary?.generated);
  return (
    <footer className="colophon">
      <div className="wrap">
        <p className="colophon-caution">
          <strong>Not medical advice.</strong> Palimpsest reports what two historical herbals claim and how often modern papers mention the same pairing. It does not establish that any plant is safe or effective. Many of these plants are toxic.
        </p>
        <div className="colophon-grid">
          <div className="colophon-id">
            <p className="colophon-word"><span className="wordmark-initial" aria-hidden="true">P</span>alimpsest</p>
            <p className="muted">Reading two thousand years of herbal medicine against modern evidence. EthnoHack 2026, Track 1.{when ? ` Data exported ${when}.` : ""}</p>
          </div>
          <nav aria-label="Explorer">
            <p className="colophon-head">Explorer</p>
            <ul className="plain">
              {NAV.map((n) => <li key={n.to}><a href={href(n.to)}>{n.label}</a></li>)}
              <li><a href={href("/credits")}>Image credits</a></li>
              <li><a href={href("/about")}>About and team</a></li>
            </ul>
          </nav>
          <div>
            <p className="colophon-head">Texts</p>
            <ul className="plain">
              <li><Ext href="https://scaife.perseus.org/library/urn:cts:greekLit:tlg0656.tlg001/">Dioscorides, ed. Wellmann (First1KGreek)</Ext></li>
              <li><Ext href="https://www.gutenberg.org/ebooks/49513">Culpeper, Project Gutenberg 49513</Ext></li>
              <li><Ext href="https://commons.wikimedia.org/wiki/Category:Vienna_Dioscurides">Vienna Dioscurides on Commons</Ext></li>
            </ul>
          </div>
          <div>
            <p className="colophon-head">Open</p>
            <ul className="plain">
              <li><Ext href={SITE.repo}>Code and data on GitHub</Ext></li>
              <li><a href={href("/data")}>Downloads and how to cite</a></li>
              <li><span className="muted">Code MIT · Greek-derived data CC BY-SA 4.0</span></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
