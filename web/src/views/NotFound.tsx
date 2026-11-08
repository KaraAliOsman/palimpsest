import { href } from "../lib/router";
import { NAV } from "../components/Shell";

export function NotFound({ onSearch }: { onSearch: () => void }) {
  return (
    <div className="wrap page notfound">
      <p className="lacuna" lang="grc" aria-hidden="true">⸤ ˙˙˙ ⸥</p>
      <h1 id="page-title" tabIndex={-1}>A lacuna</h1>
      <p className="page-lede">This leaf is missing from the codex: nothing is written at this address. It may have been renamed, or the link was copied short.</p>
      <div className="btn-row">
        <button type="button" className="btn btn--ink" onClick={onSearch}>Search the explorer</button>
        <a className="btn btn--line" href={href("/")}>Back to the first page</a>
      </div>
      <ul className="plain notfound-links">
        {NAV.map((n) => <li key={n.to}><a href={href(n.to)}>{n.label}</a></li>)}
      </ul>
    </div>
  );
}
