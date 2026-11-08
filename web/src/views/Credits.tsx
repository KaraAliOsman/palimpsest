import { useMemo, useState } from "react";
import { useResource, type CodexImage, type SearchIndex } from "../lib/data";
import { href } from "../lib/router";
import { BASIS_NOTE, smallest, srcSet, useImages } from "../lib/images";
import { Ext, Skeleton } from "../components/ui";

const WORKS = [
  { key: "Vienna", title: "Vienna Dioscurides", note: "Codex Vindobonensis med. gr. 1, made in Constantinople around 512 CE for Anicia Juliana; Österreichische Nationalbibliothek, Vienna." },
  { key: "Leonhart Fuchs", title: "Leonhart Fuchs, De historia stirpium, 1542", note: "Woodcuts drawn by Albrecht Meyer, transferred by Heinrich Füllmaurer and cut by Veit Rudolph Speckle; Basel, Michael Isingrin." },
  { key: "John Gerard", title: "John Gerard, The Herball, 1597", note: "London, John Norton." },
  { key: "Nicholas Culpeper", title: "Culpeper’s Complete Herbal, 1814", note: "London edition; Biodiversity Heritage Library scan." },
];

function Entry({ im, slug }: { im: CodexImage; slug?: string }) {
  return (
    <li className="credit">
      <a href={im.commons_page} target="_blank" rel="noopener noreferrer" className="credit-img">
        <img src={smallest(im, 360)} srcSet={srcSet(im)} sizes="(max-width: 700px) 44vw, 14vw" width={im.srcs[0].w} height={im.srcs[0].h} alt="" loading="lazy" decoding="async" style={{ backgroundColor: im.color }} />
        <span className="visually-hidden">{im.commons_title} on Wikimedia Commons (opens in a new tab)</span>
      </a>
      <div className="credit-text">
        <p className="credit-label">{/[α-ωἀ-ῼ]/i.test(im.label) ? <span lang="grc" className="grc">{im.label}</span> : im.label}</p>
        {im.taxa.length > 0 && (
          <p className="credit-taxa">{im.taxa.map((t, i) => <span key={t}>{i ? ", " : ""}{slug && i === 0 ? <a href={href(`/plant/${slug}`)}><i>{t}</i></a> : <i>{t}</i>}</span>)}</p>
        )}
        <p className="credit-meta">{im.artist} · {im.date} · <Ext href={im.commons_page}>{im.licence}</Ext></p>
        {im.basis && <p className="credit-basis">{BASIS_NOTE[im.basis]}</p>}
      </div>
    </li>
  );
}

export function Credits() {
  const imgs = useImages();
  const index = useResource<SearchIndex>("derived/search.json");
  const slugOf = useMemo(() => new Map((index.data?.plants ?? []).map((p) => [p.t, p.s])), [index.data]);
  const [onlyMapped, setOnlyMapped] = useState(false);
  const groups = WORKS.map((w) => ({ ...w, items: imgs.list.filter((i) => i.work.startsWith(w.key) && (!onlyMapped || i.taxa.length)) }));
  const total = imgs.list.length;
  const mapped = imgs.list.filter((i) => i.taxa.length).length;
  return (
    <div className="wrap page credits">
      <header className="page-head">
        <h1 id="page-title" tabIndex={-1}>Image credits</h1>
        <p className="page-lede">{total ? <>{total} images, all in the public domain, from four works spanning a thousand years. {mapped} are matched to a plant, and each says how.</> : "Every image, its source and licence."}</p>
      </header>
      <div className="credits-note">
        <p>Each file was taken from <Ext href="https://commons.wikimedia.org/wiki/Category:Vienna_Dioscurides">Wikimedia Commons</Ext> after its licence metadata was checked (public domain only), downloaded from <code>upload.wikimedia.org</code>, and re-encoded as WebP at no more than 1,800 pixels. The full record, with source URLs, is in <a href="img/credits.json"><code>img/credits.json</code></a>. A folio is matched to a plant only through our own concordance: its Greek label must be the lemma of a chapter we identify as that plant. Where a Commons description names a different species, our identification wins or the folio stays unmatched; nothing is matched by resemblance.</p>
        <label className="check"><input type="checkbox" checked={onlyMapped} onChange={(e) => setOnlyMapped(e.target.checked)} /><span>Only images matched to a plant</span></label>
      </div>
      {imgs.status === "loading" && <Skeleton rows={8} label="Reading the credits" />}
      {groups.filter((g) => g.items.length).map((g) => (
        <section key={g.key} className="credit-group" aria-labelledby={`cg-${g.key.replace(/\W/g, "")}`}>
          <div className="credit-head">
            <h2 id={`cg-${g.key.replace(/\W/g, "")}`} className="sec-title">{g.title}</h2>
            <p className="muted">{g.note} {g.items.length} {g.items.length === 1 ? "image" : "images"}.</p>
          </div>
          <ul className="credit-list">{g.items.map((im) => <Entry key={im.id} im={im} slug={slugOf.get(im.taxa[0])} />)}</ul>
        </section>
      ))}
      <section className="credit-group" aria-labelledby="cg-data">
        <div className="credit-head"><h2 id="cg-data" className="sec-title">Texts and data</h2></div>
        <ul className="plain sources-list">
          <li>Dioscorides, <i>De materia medica</i>, ed. M. Wellmann (1906–1914), <Ext href="https://scaife.perseus.org/library/urn:cts:greekLit:tlg0656.tlg001/">Open Greek and Latin / First1KGreek</Ext>, CC BY-SA 4.0.</li>
          <li>N. Culpeper, <i>The Complete Herbal</i>, <Ext href="https://www.gutenberg.org/ebooks/49513">Project Gutenberg 49513</Ext>, public domain.</li>
          <li><Ext href="https://europepmc.org/">Europe PMC</Ext>, <Ext href="https://clinicaltrials.gov/">ClinicalTrials.gov</Ext>, <Ext href="https://www.gbif.org/">GBIF</Ext> (CC BY 4.0), <Ext href="https://www.wikidata.org/">Wikidata and LOTUS</Ext> (CC0), <Ext href="https://meshb.nlm.nih.gov/">NLM MeSH</Ext>.</li>
          <li>Typefaces: GFS Didot (Greek Font Society), Alegreya and Alegreya Sans (Juan Pablo del Peral, Huerta Tipográfica), SIL Open Font Licence, via Google Fonts.</li>
        </ul>
      </section>
    </div>
  );
}
