# P1 · Expert benchmark of our Dioscorides identifications

*Generated 2026-11-08 · reproduce: `PYTHONPATH=src python scripts/expert_benchmark.py`*

**Gold standard.** Lardos A, Patmore K, Allkin R, Lazarou R, Nesbitt M, Scott AC, Zipser B (2024). J Ethnopharmacol 322:117622. doi:10.1016/j.jep.2023.117622 Data: doi:10.17637/rh.23736189 (CC BY 4.0). Tables 1-2: 61 information-rich DMM plants (50 John-the-Physician lemmas), each with literature candidate species classified Strong/Moderate/Weak/not-in-flora by botanical congruence, plus a 0-3 medicinal score.

**Access.** figshare (api.figshare.com, figshare.com, royalholloway.figshare.com) returns HTTP 403 to every request from our network, so the raw data files could not be downloaded; the expert results were parsed from the article's open-access JATS XML (Europe PMC PMC7615571, CC BY), which publishes the same Tables 1-2.

**Matched.** 54 Dioscorides chapters (from 61 Lardos rows / 50 lemmas; kinds within a chapter pooled). 1 chapter(s) where Lardos' Greek name differs from our headword (2.167: Lardos attach 'δρακοντία μικρά' to the chapter we head ἄρον) — kept, since the chapter reference is theirs. One Lardos lemma (JCLP_016 ἄμπελος ἀγρία) cites two chapters (4.181, 5.2), hence 62 scored rows.

## Agreement (chapter level, Wilson 95% CI)

| | Overall | High conf. | Medium | Low | Species-rank IDs only |
|---|---|---|---|---|---|
| Species = expert top-1 | 70% (38/54) [0.57–0.81] | 77% (23/30) [0.59–0.88] | 70% (14/20) [0.48–0.85] | 25% (1/4) [0.05–0.70] | 81% (38/47) [0.68–0.90] |
| Species in expert top tier | 76% (41/54) [0.63–0.85] | 77% (23/30) [0.59–0.88] | 85% (17/20) [0.64–0.95] | 25% (1/4) [0.05–0.70] | 87% (41/47) [0.75–0.94] |
| Species among expert candidates | 80% (43/54) [0.67–0.88] | 77% (23/30) [0.59–0.88] | 90% (18/20) [0.70–0.97] | 50% (2/4) [0.15–0.85] | 91% (43/47) [0.80–0.97] |
| Genus = expert top-1 | 91% (49/54) [0.80–0.96] | 93% (28/30) [0.79–0.98] | 95% (19/20) [0.76–0.99] | 50% (2/4) [0.15–0.85] | 89% (42/47) [0.77–0.95] |
| Genus among expert candidates | 96% (52/54) [0.88–0.99] | 97% (29/30) [0.83–0.99] | 100% (20/20) [0.84–1.00] | 75% (3/4) [0.30–0.95] | 96% (45/47) [0.86–0.99] |
| Expert top-1 in our ID or our listed alternatives | 81% (44/54) [0.69–0.90] | 87% (26/30) [0.70–0.95] | 80% (16/20) [0.58–0.92] | 50% (2/4) [0.15–0.85] | 87% (41/47) [0.75–0.94] |

Row level (each of the 62 Lardos rows scored separately; our one chapter ID is repeated for every kind, so multi-kind chapters can only match one row): species top-1 63% (39/62) [0.51–0.74], genus top-1 90% (56/62) [0.81–0.95].

7 of our 54 identifications are deliberately at genus rank (chapters that describe several species, e.g. Hyoscyamus, Verbascum, Equisetum); they count as species misses above.

## Disagreements (species top-1)

| Ch. | Headword | Ours (conf.) | Expert top-1 | Genus agrees | Note |
|---|---|---|---|---|---|
| 1.90 | ῥάμνος | *Lycium europaeum* (low) | *Rhamnus oleoides* | no | Lardos evaluate only ῥάμνος 'μέλας' (Rhamnus); we follow the reading of the chapter's first kind as Lycium (low confidence). |
| 2.139 | καυκαλίς | *Tordylium apulum* (low) | *Pimpinella saxifraga*, *Tordylium aegyptiacum* | yes | Lardos' best candidates Pimpinella saxifraga / Tordylium aegyptiacum; we have Tordylium apulum (same genus, low confidence). |
| 2.164 | κυκλάμινος | *Cyclamen* (high) | *Cyclamen persicum* | yes | Genus-rank ID (Cyclamen): chapter covers several cyclamens; Lardos top-1 C. persicum. |
| 2.167 | ἄρον | *Arum italicum* (medium) | *Arum dioscoridis* | yes | Lardos attach 'δρακοντία μικρά' to 2.167 (our headword ἄρον); we have Arum italicum, Lardos top-1 Arum dioscoridis (same genus; ours in their Moderate tier). |
| 2.169 | ἀσφόδελος | *Asphodelus ramosus* (medium) | *Asphodelus aestivus* | yes | Asphodelus: all three Lardos candidates Moderate; medicinal tie-break picks A. aestivus, ours A. ramosus (in their top tier). |
| 3.4 | ἀριστολοχεία | *Aristolochia* (high) | *Aristolochia parvifolia*, *Aristolochia rotunda* | yes | Genus-rank ID (Aristolochia): chapter describes several aristolochias; genus agrees. |
| 3.12 | ἄκανθα λευκή | *Lophiolepis ferox* (low) | *Onopordum bracteatum*, *Picnomon acarna* | no | Thistle 'white acanthus': ours Lophiolepis ferox (= Cirsium ferox, in Lardos' list as 'not in flora'); Lardos top-1 Onopordum/Picnomon. Low confidence on our side. |
| 3.20 | τραγάκανθα | *Astragalus* (medium) | *Astragalus creticus* | yes | Genus-rank ID (Astragalus); genus agrees. |
| 4.1 | κέστρον τὸ καλούμενον | *Betonica officinalis* (high) | *Sideritis cretica* | no | κέστρον / βεττονική: ours Betonica officinalis (Berendes); Lardos evaluate Sideritis cretica (Weak) and Betonica alopecuros. Genuine disagreement. |
| 4.15 | τρίβολος | *Tribulus terrestris* (high) | *Trapa natans* | no | Lardos evaluate only the aquatic τρίβολος ('ἔνυδρος' = Trapa natans); our chapter-level ID is the land caltrop Tribulus terrestris, which the chapter also describes. |
| 4.33 | σιδηρῖτις | *Sideritis* (medium) | *Sideritis montana*, *Sideritis perfoliata* | yes | Genus-rank ID (Sideritis); genus agrees. |
| 4.46 | ἵππουρις | *Equisetum* (high) | *Equisetum ramosissimum*, *Equisetum telmateia* | yes | Genus-rank ID (Equisetum); genus agrees. |
| 4.57 | ἑλίχρυσον ἢ χρυσάνθεμον | *Helichrysum stoechas* (medium) | *Helichrysum italicum* | yes | Helichrysum: ours H. stoechas (in Lardos' Strong tier), their medicinal tie-break picks H. italicum. |
| 4.68 | ὑοσκύαμος | *Hyoscyamus* (high) | *Hyoscyamus albus*, *Hyoscyamus aureus*, *Hyoscyamus niger* | yes | Genus-rank ID (Hyoscyamus; three kinds by flower colour); genus agrees. |
| 4.103 | φλόμος | *Verbascum* (high) | *Verbascum phlomoides* | yes | Genus-rank ID (Verbascum); genus agrees. |
| 4.147 | χαμαιδάφνη | *Danae racemosa* (medium) | *Ruscus hypophyllum* | no | χαμαιδάφνη: ours Danae racemosa (in Lardos' list, Weak); Lardos top-1 Ruscus hypophyllum. |

## Staples check: 30/30 correct

The 30 commonest food and garden plants of Dioscorides, whose identity any reader can verify.

| Plant | Chapter | Greek | Expected | Ours | Correct |
|---|---|---|---|---|---|
| barley | dsc:2.86 | κριθή | Hordeum vulgare | *Hordeum vulgare* | yes |
| wheat | dsc:2.85 | πυροί | Triticum (genus) | *Triticum* | yes |
| lentil | dsc:2.107 | φακός | Lens culinaris / Vicia lens | *Lens culinaris* | yes |
| chickpea | dsc:2.104 | ἐρέβινθος ὁ ἥμερος | Cicer arietinum | *Cicer arietinum* | yes |
| broad bean | dsc:2.105 | κύαμος Ἑλλην ικὸς | Vicia faba | *Vicia faba* | yes |
| white lupin | dsc:2.109 | θέρμος | Lupinus albus | *Lupinus albus* | yes |
| oat | dsc:2.94 | βρόμος κάλαμός ἐστι | Avena (genus) | *Avena sativa* | yes |
| rice | dsc:2.95 | ὄρυζα τῶν σιτηρῶν | Oryza sativa | *Oryza sativa* | yes |
| flax / linseed | dsc:2.103 | καὶ τὸ λινόσπεπμον | Linum usitatissimum | *Linum usitatissimum* | yes |
| sesame | dsc:2.99 | σήσαμον κακοστόμαχον καὶ | Sesamum indicum | *Sesamum indicum* | yes |
| olive | dsc:1.105 | ἀγριελαία | Olea europaea | *Olea europaea* | yes |
| fig | dsc:1.128 | σῦκα | Ficus carica | *Ficus carica* | yes |
| grapevine | dsc:5.1 | ἀμπέλου οἰνοφόρου τὰ | Vitis vinifera | *Vitis vinifera* | yes |
| date palm | dsc:1.109 | φοῖνιξ | Phoenix dactylifera | *Phoenix dactylifera* | yes |
| pomegranate | dsc:1.110 | ῥόα | Punica granatum | *Punica granatum* | yes |
| almond | dsc:1.123 | ἀμυγδάλη | Prunus dulcis / Prunus amygdalus | *Prunus amygdalus* | yes |
| walnut | dsc:1.125 | κάρυα βασιλικά | Juglans regia | *Juglans regia* | yes |
| black mulberry | dsc:1.126 | μορέα | Morus nigra | *Morus nigra* | yes |
| onion | dsc:2.151 | κρόμυον | Allium cepa | *Allium cepa* | yes |
| garlic | dsc:2.152 | σκόροδον | Allium sativum | *Allium sativum* | yes |
| lettuce | dsc:2.136 | θρίδαξ ἥμερος | Lactuca sativa | *Lactuca sativa* | yes |
| cabbage | dsc:2.120 | κράμβη ἥμερος | Brassica oleracea | *Brassica oleracea* | yes |
| beet / chard | dsc:2.123 | σεῦτλον | Beta vulgaris | *Beta vulgaris* | yes |
| radish | dsc:2.112 | ῥαφανίς | Raphanus sativus | *Raphanus sativus* | yes |
| turnip | dsc:2.110 | γογγύλη | Brassica rapa | *Brassica rapa* | yes |
| coriander | dsc:3.63 | κόριον | Coriandrum sativum | *Coriandrum sativum* | yes |
| dill | dsc:3.58 | ἀνήθου ξηροῦ τῆς | Anethum graveolens | *Anethum graveolens* | yes |
| cumin | dsc:3.59 | κύμινον τὸ ἥμερον | Cuminum cyminum | *Cuminum cyminum* | yes |
| fennel | dsc:3.70 | μάραθον | Foeniculum vulgare | *Foeniculum vulgare* | yes |
| celery | dsc:3.64 | σέλινον κηπαῖον | Apium graveolens | *Apium graveolens* | yes |

## Caveat

Our identifications were curated with AI assistance (Claude), which may have seen Lardos et al. (2024) or the same scholarly sources (Berendes, Beck, Gunther) during training; agreement therefore measures consistency with expert scholarship, not an independent blind re-identification. Lardos' candidate lists also come from the literature, so both sides share sources.
