import { assetUrl } from "../lib/data";
import { href } from "../lib/router";
import { SITE } from "../lib/export";
import { Ext } from "../components/ui";

// Placeholder roles until the team confirms names and affiliations.
const TEAM = [
  { name: "Team member A", role: "Pipeline, statistics and knowledge graph" },
  { name: "Team member B", role: "Greek text, lexicon and plant identifications" },
  { name: "Team member C", role: "Evidence screening and leads" },
  { name: "Team member D", role: "Explorer design and engineering" },
];

export function About() {
  return (
    <div className="wrap page about">
      <header className="page-head">
        <h1 id="page-title" tabIndex={-1}>About Palimpsest</h1>
        <p className="page-lede">A palimpsest is a manuscript whose text was scraped off and written over, yet the older layer still shows through. European herbal medicine is exactly that: Culpeper wrote over Galen, who wrote over Dioscorides.</p>
      </header>
      <div className="about-grid">
        <figure className="about-fig">
          <img src={assetUrl("img/codex/viennadioscoridesauthorportrait-1400.webp")} srcSet={`${assetUrl("img/codex/viennadioscoridesauthorportrait-720.webp")} 720w, ${assetUrl("img/codex/viennadioscoridesauthorportrait-1400.webp")} 1400w`} sizes="(max-width: 860px) 92vw, 34vw" width={1400} height={1603} alt="Dioscorides seated, receiving a mandrake root from Heuresis, the personification of Discovery; the dog that pulled it lies dead at their feet." loading="lazy" decoding="async" />
          <figcaption className="seam">Dioscorides receives the mandrake from Heuresis, Discovery. Vienna Dioscurides, fol. 4v, c. 512 CE. Public domain.</figcaption>
        </figure>
        <div className="about-text">
          <section aria-labelledby="why-t">
            <h2 id="why-t" className="sec-title">Why</h2>
            <p>Historical herbals are routinely mined for drug leads, yet two questions are rarely answered reproducibly: how much of what a seventeenth-century English herbal says was already said sixteen centuries earlier, and whether modern science has looked at the claims that survived. Palimpsest answers both from the original Greek, with every number traceable to its words.</p>
          </section>
          <section aria-labelledby="team-t">
            <h2 id="team-t" className="sec-title">Team</h2>
            <p className="muted">Names and affiliations will be added by the team.</p>
            <ul className="team">
              {TEAM.map((t) => <li key={t.name}><span className="team-name">{t.name}</span><span className="team-role">{t.role}</span></li>)}
            </ul>
          </section>
          <section aria-labelledby="ctx-t">
            <h2 id="ctx-t" className="sec-title">Context</h2>
            <p>Built for EthnoHack 2026, Track 1 (traditional knowledge), with bridges to drug discovery and conservation. Code is MIT-licensed; Greek-derived data are shared under CC BY-SA 4.0 as the source edition requires.</p>
            <ul className="plain link-list">
              <li><Ext href={SITE.repo}>Repository on GitHub</Ext></li>
              <li><Ext href={`${SITE.repo}/issues`}>Report an identification or extraction error</Ext></li>
              <li><a href={href("/methods")}>Methods and responsible use</a></li>
              <li><a href={href("/credits")}>Image and data credits</a></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
