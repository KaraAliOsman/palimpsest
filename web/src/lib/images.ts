import { useMemo } from "react";
import { assetUrl, useResource, type CodexImage, type Credits } from "./data";

export interface ImageIndex { byId: Map<string, CodexImage>; byTaxon: Map<string, CodexImage[]>; list: CodexImage[] }

const EMPTY: ImageIndex = { byId: new Map(), byTaxon: new Map(), list: [] };

export function useImages(): ImageIndex & { status: string } {
  const r = useResource<Credits>("@/img/credits.json");
  const index = useMemo(() => {
    if (r.status !== "ready") return EMPTY;
    const byId = new Map<string, CodexImage>();
    const byTaxon = new Map<string, CodexImage[]>();
    for (const im of r.data.images ?? []) {
      byId.set(im.id, im);
      for (const t of im.taxa ?? []) {
        if (!byTaxon.has(t)) byTaxon.set(t, []);
        byTaxon.get(t)!.push(im);
      }
    }
    return { byId, byTaxon, list: r.data.images ?? [] };
  }, [r.status, r.data]);
  return { ...index, status: r.status };
}

export function srcSet(im: CodexImage): string {
  return im.srcs.map((s) => `${assetUrl(s.src)} ${s.w}w`).join(", ");
}

export function smallest(im: CodexImage, min = 0): string {
  const sorted = im.srcs.slice().sort((a, b) => a.w - b.w);
  return assetUrl((sorted.find((s) => s.w >= min) ?? sorted[sorted.length - 1]).src);
}

export const BASIS_NOTE: Record<string, string> = {
  "commons-binomial": "The Commons record names this species.",
  "folio-lemma": "The folio is labelled with the Greek name Palimpsest identifies as this plant; the identification carries its confidence level.",
  "page-heading": "Fuchs’s printed Latin heading names the plant.",
};

/** Short credit line: work, place and date, licence. */
export function creditLine(im: CodexImage): string {
  return `${im.work}, ${im.made}. ${im.licence}.`;
}
