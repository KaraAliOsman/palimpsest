// Hash routing: #/plants?q=wormwood. Works from any sub-path and from file://.
import { useEffect, useState } from "react";

export interface Route { path: string[]; params: URLSearchParams; raw: string }

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [p, q = ""] = raw.split("?");
  const path = p.split("/").filter(Boolean).map((s) => { try { return decodeURIComponent(s); } catch { return s; } });
  return { path, params: new URLSearchParams(q), raw };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export function href(path: string, params?: Record<string, string | number | boolean | null | undefined> | URLSearchParams): string {
  let qs = "";
  if (params instanceof URLSearchParams) qs = params.toString();
  else if (params) {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== "" && v !== false) u.set(k, String(v));
    qs = u.toString();
  }
  return `#${path}${qs ? `?${qs}` : ""}`;
}

/** Update the query string in place (filters), without adding a history entry per keystroke. */
export function replaceParams(path: string, params: URLSearchParams): void {
  const next = href(path, params);
  if (next !== window.location.hash) {
    history.replaceState(null, "", next);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
}

export function go(to: string): void {
  window.location.hash = to.replace(/^#/, "");
}
