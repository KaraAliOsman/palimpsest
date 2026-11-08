import { useEffect, useRef } from "react";
import { useRoute } from "./lib/router";
import { useResource, type Summary } from "./lib/data";
import { Footer, Header } from "./components/Shell";
import { Overview } from "./views/Overview";
import { Plants } from "./views/Plants";
import { PlantPage } from "./views/PlantPage";
import { Evidence } from "./views/Evidence";
import { Leads } from "./views/Leads";
import { Methods } from "./views/Methods";
import { Empty } from "./components/ui";

const TITLES: Record<string, string> = {
  "": "Palimpsest: Dioscorides, Culpeper and the evidence",
  plants: "Plants: Palimpsest",
  evidence: "Persistence and evidence: Palimpsest",
  leads: "Leads: Palimpsest",
  methods: "Methods and limitations: Palimpsest",
};

export function App() {
  const route = useRoute();
  const summary = useResource<Summary>("summary.json");
  const section = route.path[0] ?? "";
  const pathKey = route.path.join("/");
  const first = useRef(true);

  useEffect(() => {
    document.title = section === "plant" && route.path[1]
      ? `${route.path[1].replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())}: Palimpsest`
      : TITLES[section] ?? "Palimpsest";
    if (first.current) { first.current = false; return; }
    // A new page, not a filter change: back to the top, focus on its title.
    window.scrollTo({ top: 0 });
    const h = document.getElementById("page-title");
    h?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathKey]);

  let view;
  switch (section) {
    case "": view = <Overview />; break;
    case "plants": view = <Plants route={route} />; break;
    case "plant": view = <PlantPage key={route.path[1]} slug={route.path[1] ?? ""} route={route} />; break;
    case "evidence": view = <Evidence />; break;
    case "leads": view = <Leads route={route} />; break;
    case "methods": view = <Methods />; break;
    default:
      view = (
        <div className="container page">
          <h1 id="page-title" tabIndex={-1} className="page-title-s">No page at this address</h1>
          <Empty title="The explorer has five pages." action={<a className="btn btn--quiet" href="#/">Back to the overview</a>} />
        </div>
      );
  }

  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>Skip to content</a>
      <Header section={section} />
      <main id="main" tabIndex={-1}>{view}</main>
      <Footer summary={summary.data} />
    </>
  );
}
