// "Where these medicines come from": the globe, its readout and the computed insights.
// Full on Findings (#geography), compact on the landing page.
import { useEffect, useMemo, useState } from "react";
import { useResource } from "../lib/data";
import { href } from "../lib/router";
import { fmt } from "../lib/format";
import { HERBAL_LABEL, HERBAL_OWNER, HERBALS, herbalIndex, loadRegions, type Herbal, type Insight, type Overview, type Regions } from "../lib/geo";
import { GeoKey, HerbalGlobe, RegionPanel } from "../charts/HerbalGlobe";
import { TableToggle } from "../charts/kit";
import { ErrorState, Ext, Skeleton } from "./ui";

function Insights({ data, compact }: { data: Overview; compact?: boolean }) {
  const get = (id: string) => data.insights.find((x) => x.id === id);
  const med = get("dsc_east_med"), gb = get("cul_britain"), intro = get("cul_introduced_britain");
  const plant = (s: string) => data.plants[s];
  const ex = (i?: Insight) => (i?.examples ?? []).slice(0, compact ? 3 : 5);
  return (
    <ol className={`geo-insights ${compact ? "geo-insights--compact" : ""}`}>
      {med && (
        <li>
          <p className="geo-fig num">{med.pct}%</p>
          <p className="geo-claim">of Dioscorides’ plants are native to the eastern Mediterranean: <span className="num">{fmt.int(med.k)}</span> of <span className="num">{fmt.int(med.n)}</span> species.</p>
          {med.compare && <p className="geo-vs">Culpeper’s plants: <span className="num">{med.compare.pct}%</span> ({fmt.int(med.compare.k)} of {fmt.int(med.compare.n)}).</p>}
          {!compact && <p className="geo-def">Greece, Crete, the East Aegean islands, Turkey, Cyprus, Lebanon–Syria, Palestine and Egypt (WGSRPD level 3).</p>}
        </li>
      )}
      {gb && (
        <li>
          <p className="geo-fig num">{gb.pct}%</p>
          <p className="geo-claim">of Culpeper’s plants are native to Britain: <span className="num">{fmt.int(gb.k)}</span> of <span className="num">{fmt.int(gb.n)}</span> species.</p>
          {gb.compare && <p className="geo-vs">Dioscorides’ plants: <span className="num">{gb.compare.pct}%</span> ({fmt.int(gb.compare.k)} of {fmt.int(gb.compare.n)}).</p>}
        </li>
      )}
      {intro && (
        <li>
          <p className="geo-fig num">{fmt.int(intro.k)}</p>
          <p className="geo-claim">of Culpeper’s {fmt.int(intro.n)} plants grow in Britain only as introductions{intro.absent ? <>; <span className="num">{fmt.int(intro.absent)}</span> more are not recorded in Britain at all</> : null}.</p>
          {ex(intro).length > 0 && (
            <p className="geo-vs">Among them {ex(intro).map((s, i, a) => (
              <span key={s}>{i ? (i === a.length - 1 ? " and " : ", ") : ""}<a href={href(`/plant/${s}`)}>{plant(s)?.[1]?.split(",")[0] || <i>{plant(s)?.[0]}</i>}</a></span>
            ))}.</p>
          )}
        </li>
      )}
    </ol>
  );
}

export function GeoOverview({ compact = false }: { compact?: boolean }) {
  const ov = useResource<Overview>("derived/geo/overview.json");
  const [regions, setRegions] = useState<Regions | null>(null);
  useEffect(() => { let on = true; loadRegions("globe").then((r) => { if (on) setRegions(r); }, () => {}); return () => { on = false; }; }, []);
  const [mode, setMode] = useState<Herbal>("dsc");
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [miss, setMiss] = useState(false);
  const [turn, setTurn] = useState<{ id: string; seq: number } | null>(null);
  const data = ov.data;

  const ranked = useMemo(() => {
    if (!data) return [];
    const i = herbalIndex(mode);
    return Object.entries(data.regions).map(([id, r]) => ({ id, n: r.c[i], c: r.c })).filter((r) => r.n > 0).sort((a, b) => b.n - a.n);
  }, [data, mode]);

  if (ov.status === "loading" || (ov.status === "ready" && !regions)) return <Skeleton rows={compact ? 5 : 9} label="Drawing the globe" />;
  if (ov.status === "error") return <ErrorState what="The geography file" error={ov.error} retry={ov.retry} />;
  const d = data!;
  const active = hover ?? pinned ?? (miss ? null : d.peak[mode].code);
  const select = (id: string | null, how: "hover" | "pin" | "key") => {
    if (how === "hover") { setHover(id); return; }
    setHover(null); setPinned(id); setMiss(how === "key" && !id);
  };
  const goTo = (id: string) => { setHover(null); setPinned(id); setMiss(false); setTurn((t) => ({ id, seq: (t?.seq ?? 0) + 1 })); };
  const nameOf = (id: string) => regions?.info.get(id)?.name ?? id;

  const controls = (
    <div className="segmented geo-modes" role="group" aria-label="Whose plants">
      {HERBALS.map((h) => (
        <button key={h} type="button" aria-pressed={mode === h} onClick={() => setMode(h)}>
          <span className={`mark-swatch mark-swatch--${h}`} aria-hidden="true" />{HERBAL_LABEL[h]} <span className="geo-mode-n num">{fmt.int(d.totals[h])}</span>
        </button>
      ))}
    </div>
  );

  if (compact) {
    return (
      <div className="geo-teaser">
        <div className="geo-teaser-text">
          <h2 id="geo-title">Where these medicines come from</h2>
          <p className="sec-lede">Each herbal’s species, placed where Kew’s World Checklist records them growing wild. Dioscorides wrote in the eastern Mediterranean, Culpeper in London; their plants show it.</p>
          <Insights data={d} compact />
          <a className="btn btn--line" href={href("/findings", null, "geography")}>Explore the globe</a>
        </div>
        <div className="geo-teaser-globe">
          {controls}
          <HerbalGlobe data={d} mode={mode} compact selected={pinned ?? hover} onSelect={select} turn={turn} />
          <div className="geo-teaser-panel" aria-live="polite"><RegionPanel data={d} regions={regions} id={active} mode={mode} compact /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="geo-full">
      <div className="geo-stage">
        <div className="geo-globe-col">
          {controls}
          <HerbalGlobe data={d} mode={mode} selected={pinned ?? hover} onSelect={select} turn={turn} />
          <GeoKey mode={mode} />
        </div>
        <div className="geo-side">
          <div aria-live="polite"><RegionPanel data={d} regions={regions} id={active} mode={mode} /></div>
          <div className="geo-rank">
            <h3 className="geo-rank-h">Where most of {HERBAL_OWNER[mode]} are native</h3>
            <ol className="geo-rank-list">
              {ranked.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <button type="button" className={active === r.id ? "is-active" : ""} onClick={() => goTo(r.id)} aria-pressed={pinned === r.id}>
                    <span className="geo-rank-name">{nameOf(r.id)}</span>
                    <span className="num">{fmt.int(r.n)}</span>
                    <span className="geo-rank-pct num">{fmt.pct(r.n / d.totals[mode])}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
      <Insights data={d} />
      <TableToggle label="Show the numbers">
        <table className="ledger ledger--compact geo-table">
          <caption className="visually-hidden">Species of each herbal native to each botanical country (WCVP)</caption>
          <thead><tr><th scope="col">Botanical country</th><th scope="col" className="num">Dioscorides</th><th scope="col" className="num">Culpeper</th><th scope="col" className="num">Both</th></tr></thead>
          <tbody>
            {ranked.map((r) => (
              <tr key={r.id}><th scope="row">{nameOf(r.id)} <span className="cell-sub">{r.id}</span></th>{r.c.map((v, i) => <td key={i} className="num">{fmt.int(v)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </TableToggle>
      <p className="seam geo-seam">
        Native ranges: <Ext href="https://doi.org/10.34885/egs6-cp24">World Checklist of Vascular Plants</Ext> (Royal Botanic Gardens, Kew, version 16, CC BY 3.0), species-rank identifications only ({fmt.int(d.totals.dsc)} for Dioscorides, {fmt.int(d.totals.cul)} for Culpeper); a species counts once in every botanical country where it is native. Boundaries: <Ext href="https://www.naturalearthdata.com/">Natural Earth</Ext> (public domain); botanical-country units after TDWG WGSRPD (Brummitt 2001), drawn approximately. <a href={href("/data", null, "geo")}>Files and method</a>.
      </p>
    </div>
  );
}
