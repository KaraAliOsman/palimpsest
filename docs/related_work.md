# Related work

*Palimpsest is an EthnoHack 2026 project (ETHCSTWIN, Track 1). We checked every reference
below against Crossref, Europe PMC, or the publisher's or project's page on 7 November 2026.
We dropped anything we could not verify.*

## 1. Historical herbals as data

Buenz et al. (2004) proposed mining historical herbals with bioinformatics to find drug leads.
They then flagged nine plants in Rumphius' *Ambonese Herbal* whose recorded uses had never been
studied (Buenz et al. 2005). Adams et al. (2009, 2011, 2012) surveyed Renaissance herbals for
rheumatism, malaria and epilepsy. For rheumatism, more than half of the 63 plants had shown
anti-inflammatory activity. De Vos (2010) found a Dioscoridean core of simples that changed
little until the 19th century but differs from today's NIH herbal list.

On Dioscorides, Riddle (1985) is the classic study. Staub, Casu & Leonti (2016) hand-coded
5,314 uses of 536 taxa, but from Matthioli's 1568 Italian edition. Yarnell & Touwaide (2019)
went back to the Greek for one action, diuresis. Of the 105 plants Dioscorides calls diuretic,
56 genera have confirming evidence and 38 were never tested. Leonti's group modelled the
transmission itself. Matthioli and Dioscorides–Galen causally shape modern Italian plant use
(Leonti et al. 2009, 2010, 2015; Leonti 2011), and taste helps predict how the drugs were used
(Leonti et al. 2024, 2026). Leonti & Verpoorte (2017) called for a database linking past and
present traditions for data mining. Palimpsest is a small, open instance of that idea.

Lardos & Heinrich (2013; also Lardos et al. 2011) traced continuity from Cypriot
*iatrosophia* to today's monasteries. The AncientBiotics group went from text to bench:

- Bald's eyesalve killed MRSA in a mouse wound model (Harrison et al. 2015), but only as a
  combination of ingredients (Furner-Pardoe et al. 2020).
- Network analysis of a 15th-century text followed (Connelly et al. 2020, 2022; see also
  Watkins et al. 2011).

Saslis-Lagoudakis et al. (2012) is the methodological counterpoint. Agreement across
traditions tells us something only because those traditions are *independent*.

## 2. NLP and knowledge graphs

Ancient Greek already has NLP tools: CLTK (Johnson et al. 2021), named-entity recognition
(Palladino & Yousef 2024) and language models (Riemenschneider & Frank 2023). We found no
published pipeline that extracts indications at scale from the Greek of *De materia medica*.
Knowledge graphs that link traditional remedies to modern entities are most developed for
Chinese medicine: SymMap (Wu et al. 2019) and HERB (Fang et al. 2021). LOTUS hosts more than
750,000 referenced structure–organism pairs on Wikidata (Rutz et al. 2022).

## 3. ETHCSTWIN and its community

ETHCSTWIN is a Horizon Europe Twinning action (grant 101159928, June 2024 – May 2027, about
€1.5 M). It is led by NKUA's Institute for Ethnopharmacological Studies and Phytotherapy (IESP),
with partners Fraunhofer SCAI, the University of Gastronomic Sciences, Pangea Botanica and the
University of Prishtina. It applies AI and data mining to manuscripts, folklore and
ethnobotanical studies, and is building an open database (CORDIS; ethcstwin.com). Relevant
work from this community:

- **Plant names:** Bouras-Vallianatos (2018) edits a medieval Greek lexicon of plant-name
  synonyms that absorbed Latin and Arabic terms. This is direct precedent for our name
  concordance.
- **Drug transfer and lab tests:** his work on drug transfer across the medieval Mediterranean
  (2021; with Stathakopoulos 2023), and on historical clays tested for antibacterial activity
  (Venieri et al. 2020).
- **Field and lab pharmacognosy:** NKUA studies (Tsioutsiou, Cheilari & Aligiannis 2023;
  Zouraris et al. 2025; Antonopoulos et al. 2026), plus ML-assisted literature search (Axiotis
  et al. 2021).
- **Mapping messy terms to a standard:** Fraunhofer SCAI work on embedding-based semantic
  harmonization (Wegner et al. 2024; Adams T. et al. 2025). This is the problem we face in
  mapping historical disease terms to MeSH.

## 4. Resources

| Resource | Source |
|---|---|
| Dioscorides | Wellmann's edition (1906–1914), TEI from First1KGreek (CC BY-SA 4.0), checked against Beck's translation (2005). |
| Culpeper | Project Gutenberg #49513, the 1850 Kelly "new edition". **Caveat:** it adds about a hundred herbs not in Culpeper's 1652–53 text, which we flag. |
| Other data | GBIF Backbone, Wikidata (Vrandečić & Krötzsch 2014), LOTUS, Europe PMC (2015), ClinicalTrials.gov (Zarin et al. 2011), MeSH (Lipscomb 2000). |

## 5. Caveats

- **Circularity.** Modern research is partly motivated by tradition, so co-mention measures
  attention plus evidence, not efficacy (Gertsch 2009).
- **The sources are not independent.** Culpeper inherits the Dioscoridean tradition (De Vos
  2010; Leonti et al. 2010, 2015). Persistence means a claim was transmitted and kept, not
  rediscovered.
- **Co-occurrence is a weak proxy.** It is the basic signal of literature-based discovery
  (Swanson 1986; Henry & McInnes 2017), but a co-mention can also report a null result or
  toxicity.
- **Publication bias** inflates counts for well-studied pairs (Dickersin 1990).
- **Retrospective identification.** Identifying ancient plants is uncertain (Hardy & Totelin
  2015; Lardos et al. 2024), and disease categories map imperfectly (Staub et al. 2015). We
  record confidence and alternatives, and repeat the tests at genus level.

## 6. What is new in Palimpsest

Compared with the studies we reviewed:

- **Extraction from the original Greek:** automatic extraction from Wellmann's Greek, with
  MeSH-mapped concepts and precision and recall measured against blind annotation. Earlier
  work read Matthioli's Italian by hand or covered one indication.
- **Cross-era name concordance:** Greek and 17th-century English names mapped to accepted
  binomials, with confidence levels and alternatives. It complements expert identification;
  it does not replace it.
- **Persistence test with within-plant controls:** a permutation test of Dioscorides–Culpeper
  overlap, then claimed versus never-claimed indications for the same plant (Poisson GLM,
  conditional logistic regression). Earlier counts of supported claims had no base-rate
  control.
- **Provenance-anchored knowledge graph:** every edge traces back to character offsets in a
  chapter and to cached API responses.
- **Ranking of under-studied leads:** a transparent score, with flags for historical safety
  warnings and conservation status. It systematizes the "untested" lists of Buenz et al. (2005) and
  Yarnell & Touwaide (2019). The ranked pairs are hypotheses, not therapeutic claims.

## References

- Adams M, Alther W, Kessler M, Kluge M, Hamburger M (2011). Malaria in the Renaissance: remedies from European herbals from the 16th and 17th century. *J Ethnopharmacol* 133(2):278–288. doi:10.1016/j.jep.2010.10.060
- Adams M, Berset C, Kessler M, Hamburger M (2009). Medicinal herbs for the treatment of rheumatic disorders — a survey of European herbals from the 16th and 17th century. *J Ethnopharmacol* 121(3):343–359. doi:10.1016/j.jep.2008.11.010
- Adams M, Schneider S-V, Kluge M, Kessler M, Hamburger M (2012). Epilepsy in the Renaissance: a survey of remedies from 16th and 17th century German herbals. *J Ethnopharmacol* 143(1):1–13. doi:10.1016/j.jep.2012.06.010
- Adams T, Salimi Y, Ay MC, Valderrama D, Jacobs M, Fröhlich H (2025). A benchmark of text embedding models for semantic harmonization of Alzheimer's disease cohorts. *J Prev Alzheimers Dis*, 100420. doi:10.1016/j.tjpad.2025.100420
- Antonopoulos RK, Dadiotis E, Ioannidis K, Cheilari A, Mitsis V, et al. (2026). Investigating the psychedelic hypothesis of kykeon, the sacred elixir of the Eleusinian Mysteries. *Sci Rep* 16:8757. doi:10.1038/s41598-026-39568-3
- Axiotis E, Kontogiannis A, Kalpoutzakis E, Giannakopoulos G (2021). A personalized machine-learning-enabled method for efficient research in ethnopharmacology: the case of the Southern Balkans and the coastal zone of Asia Minor. *Appl Sci* 11(13):5826. doi:10.3390/app11135826
- Beck LY, transl. (2005). *Pedanius Dioscorides of Anazarbus, De materia medica*. Hildesheim: Olms-Weidmann (Altertumswissenschaftliche Texte und Studien 38). [Verified via review: Riddle 2006, *Med Hist* 50(4):553–554, doi:10.1017/S0025727300010486]
- Bouras-Vallianatos P (2018). Enrichment of the medical vocabulary in the Greek-speaking medieval communities of Southern Italy: the lexica of plant names. In: Pitarakis B, Tanman G (eds), *Life Is Short, Art Long: The Art of Healing in Byzantium. New Perspectives*. Istanbul: Istanbul Research Institute, pp. 155–184. Open access: NCBI Bookshelf NBK518575 (PMID 30070806).
- Bouras-Vallianatos P (2021). Cross-cultural transfer of medical knowledge in the medieval Mediterranean: the introduction and dissemination of sugar-based potions from the Islamic world to Byzantium. *Speculum* 96:963–1008. doi:10.1086/715838
- Bouras-Vallianatos P, Stathakopoulos D, eds (2023). *Drugs in the Medieval Mediterranean: Transmission and Circulation of Pharmacological Knowledge*. Cambridge University Press. doi:10.1017/9781009389792
- Buenz EJ, Schnepple DJ, Bauer BA, Elkin PL, Riddle JM, Motley TJ (2004). Techniques: bioprospecting historical herbal texts by hunting for new leads in old tomes. *Trends Pharmacol Sci* 25(9):494–498. doi:10.1016/j.tips.2004.07.003
- Buenz EJ, Johnson HE, Beekman EM, Motley TJ, Bauer BA (2005). Bioprospecting Rumphius's Ambonese Herbal: Volume I. *J Ethnopharmacol* 96(1–2):57–70. doi:10.1016/j.jep.2004.08.016
- Connelly E, del Genio CI, Harrison F (2020). Data mining a medieval medical text reveals patterns in ingredient choice that reflect biological activity against infectious agents. *mBio* 11(1):e03136-19. doi:10.1128/mBio.03136-19
- Connelly E, Lee C, Furner-Pardoe J, del Genio CI, Harrison F (2022). A case study of the Ancientbiotics collaboration. *Patterns* 3(12):100632. doi:10.1016/j.patter.2022.100632
- CORDIS. ETHCSTWIN — Reinforcing the Scientific Excellence of the Institute for Ethnopharmacological Studies and Phytotherapy (IESP) through Twinning with Computer Science (CS), grant 101159928. https://cordis.europa.eu/project/id/101159928 ; project site https://www.ethcstwin.com/
- Culpeper N. *The Complete Herbal* (London: Thomas Kelly, 1850). Project Gutenberg eBook #49513 (2015). https://www.gutenberg.org/ebooks/49513
- De Vos P (2010). European materia medica in historical texts: longevity of a tradition and implications for future use. *J Ethnopharmacol* 132(1):28–47. doi:10.1016/j.jep.2010.05.035
- Dickersin K (1990). The existence of publication bias and risk factors for its occurrence. *JAMA* 263(10):1385–1389. doi:10.1001/jama.1990.03440100097014
- Europe PMC Consortium (2015). Europe PMC: a full-text literature database for the life sciences and platform for innovation. *Nucleic Acids Res* 43(D1):D1042–D1048. doi:10.1093/nar/gku1061
- Fang S, Dong L, Liu L, et al. (2021). HERB: a high-throughput experiment- and reference-guided database of traditional Chinese medicine. *Nucleic Acids Res* 49(D1):D1197–D1206. doi:10.1093/nar/gkaa1063
- Furner-Pardoe J, Anonye BO, Cain R, Moat J, Ortori CA, Lee C, Barrett DA, Corre C, Harrison F (2020). Anti-biofilm efficacy of a medieval treatment for bacterial infection requires the combination of multiple ingredients. *Sci Rep* 10. doi:10.1038/s41598-020-69273-8
- GBIF Secretariat (2023). GBIF Backbone Taxonomy. Checklist dataset. doi:10.15468/39omei
- Gertsch J (2009). How scientific is the science in ethnopharmacology? Historical perspectives and epistemological problems. *J Ethnopharmacol* 122(2):177–183. doi:10.1016/j.jep.2009.01.010
- Hardy G, Totelin L (2015). *Ancient Botany*. London: Routledge. doi:10.4324/9780203458358
- Harrison F, Roberts AEL, Gabrilska R, Rumbaugh KP, Lee C, Diggle SP (2015). A 1,000-year-old antimicrobial remedy with antistaphylococcal activity. *mBio* 6(4):e01129-15. doi:10.1128/mBio.01129-15
- Henry S, McInnes BT (2017). Literature based discovery: models, methods, and trends. *J Biomed Inform* 74:20–32. doi:10.1016/j.jbi.2017.08.011
- Johnson KP, Burns PJ, Stewart J, Cook T, Besnier C, Mattingly WJB (2021). The Classical Language Toolkit: an NLP framework for pre-modern languages. *Proc. ACL-IJCNLP 2021: System Demonstrations*, 20–29. doi:10.18653/v1/2021.acl-demo.3
- Lardos A, Heinrich M (2013). Continuity and change in medicinal plant use: the example of monasteries on Cyprus and historical iatrosophia texts. *J Ethnopharmacol* 150(1):202–214. doi:10.1016/j.jep.2013.08.026
- Lardos A, Patmore K, Allkin R, Lazarou R, Nesbitt M, Scott AC, Zipser B (2024). A systematic methodology to assess the identity of plants in historical texts: a case study based on the Byzantine pharmacy text John the Physician's *Therapeutics*. *J Ethnopharmacol* 322:117622. doi:10.1016/j.jep.2023.117622
- Lardos A, Prieto-Garcia J, Heinrich M (2011). Resins and gums in historical iatrosophia texts from Cyprus — a botanical and medico-pharmacological approach. *Front Pharmacol* 2:32. doi:10.3389/fphar.2011.00032
- Leonti M (2011). The future is written: impact of scripts on the cognition, selection, knowledge and transmission of medicinal plant use and its implications for ethnobotany and ethnopharmacology. *J Ethnopharmacol* 134(3):542–555. doi:10.1016/j.jep.2011.01.017
- Leonti M, Baker J, Staub P, Casu L, Hawkins J (2024). Taste shaped the use of botanical drugs. *eLife* 12:RP90070. doi:10.7554/eLife.90070
- Leonti M, Cabras S, Weckerle CS, Solinas MN, Casu L (2010). The causal dependence of present plant knowledge on herbals — contemporary medicinal plant use in Campania (Italy) compared to Matthioli (1568). *J Ethnopharmacol* 130(2):379–391. doi:10.1016/j.jep.2010.05.021
- Leonti M, Casu L, Cabras S (2026). Systemic and topical use of herbal drugs vary by plant organ and chemosensory properties in De Materia Medica. *J Ethnopharmacol* 370:121953. doi:10.1016/j.jep.2026.121953
- Leonti M, Casu L, Sanna F, Bonsignore L (2009). A comparison of medicinal plant use in Sardinia and Sicily — De Materia Medica revisited? *J Ethnopharmacol* 121(2):255–267. doi:10.1016/j.jep.2008.10.027
- Leonti M, Staub PO, Cabras S, Castellanos ME, Casu L (2015). From cumulative cultural transmission to evidence-based medicine: evolution of medicinal plant knowledge in Southern Italy. *Front Pharmacol* 6:207. doi:10.3389/fphar.2015.00207
- Leonti M, Verpoorte R (2017). Traditional Mediterranean and European herbal medicines. *J Ethnopharmacol* 199:161–167. doi:10.1016/j.jep.2017.01.052
- Lipscomb CE (2000). Medical Subject Headings (MeSH). *Bull Med Libr Assoc* 88:265–266. PMID 10928714
- Open Greek and Latin / First1KGreek. Dioscorides, *De materia medica*, ed. M. Wellmann (Berlin: Weidmann, 1906–1914), TEI `tlg0656.tlg001.1st1K-grc1.xml`, Harvard College Library 2018, CC BY-SA 4.0. https://github.com/OpenGreekAndLatin/First1KGreek
- Palladino C, Yousef T (2024). Development of robust NER models and named entity tagsets for Ancient Greek. *Proc. LT4HALA 2024 @ LREC-COLING*, 89–97. https://aclanthology.org/2024.lt4hala-1.11
- Riddle JM (1985). *Dioscorides on Pharmacy and Medicine*. Austin: University of Texas Press. doi:10.7560/715448
- Riemenschneider F, Frank A (2023). Exploring large language models for classical philology. *Proc. ACL 2023 (Vol. 1: Long Papers)*, 15181–15199. doi:10.18653/v1/2023.acl-long.846
- Rutz A, Sorokina M, Galgonek J, et al. (2022). The LOTUS initiative for open knowledge management in natural products research. *eLife* 11:e70780. doi:10.7554/eLife.70780
- Saslis-Lagoudakis CH, Savolainen V, Williamson EM, et al. (2012). Phylogenies reveal predictive power of traditional medicine in bioprospecting. *PNAS* 109(39):15835–15840. doi:10.1073/pnas.1202242109
- Staub PO, Casu L, Leonti M (2016). Back to the roots: a quantitative survey of herbal drugs in Dioscorides' De Materia Medica (ex Matthioli, 1568). *Phytomedicine* 23(10):1043–1052. doi:10.1016/j.phymed.2016.06.016
- Staub PO, Geck MS, Weckerle CS, Casu L, Leonti M (2015). Classifying diseases and remedies in ethnomedicine and ethnopharmacology. *J Ethnopharmacol* 174:514–519. doi:10.1016/j.jep.2015.08.051
- Swanson DR (1986). Fish oil, Raynaud's syndrome, and undiscovered public knowledge. *Perspect Biol Med* 30(1):7–18. doi:10.1353/pbm.1986.0087
- Tsioutsiou EE, Cheilari A, Aligiannis N (2023). Ethnopharmacological study of medicinal plants used against skin ailments on Mount Pelion, central Greece. *Front Pharmacol* 14:1225580. doi:10.3389/fphar.2023.1225580
- Venieri D, Gounaki I, Christidis GE, Knapp CW, Bouras-Vallianatos P, Photos-Jones E (2020). Bridging the gaps: bole and terra sigillata as artefacts, as simples and as antibacterial clays. *Minerals* 10(4):348. doi:10.3390/min10040348
- Vrandečić D, Krötzsch M (2014). Wikidata: a free collaborative knowledgebase. *Commun ACM* 57(10):78–85. doi:10.1145/2629489
- Watkins F, Pendry B, Corcoran O, Sanchez-Medina A (2011). Anglo-Saxon pharmacopoeia revisited: a potential treasure in drug discovery. *Drug Discov Today* 16(23–24):1069–1075. doi:10.1016/j.drudis.2011.07.002
- Wegner P, Balabin H, Ay MC, Bauermeister S, Killin L, Gallacher J, Hofmann-Apitius M, Salimi Y, et al. (2024). Semantic harmonization of Alzheimer's disease datasets using AD-Mapper. *J Alzheimers Dis* 99:1409–1423. doi:10.3233/JAD-240116
- Wu Y, Zhang F, Yang K, et al. (2019). SymMap: an integrative database of traditional Chinese medicine enhanced by symptom mapping. *Nucleic Acids Res* 47(D1):D1110–D1117. doi:10.1093/nar/gky1021
- Yarnell E, Touwaide A (2019). Accuracy of Dioscorides' De materia medica (first century C.E.) regarding diuretic activity of plants. *J Altern Complement Med* 25(1):107–120. doi:10.1089/acm.2018.0251
- Zarin DA, Tse T, Williams RJ, Califf RM, Ide NC (2011). The ClinicalTrials.gov results database — update and key issues. *N Engl J Med* 364(9):852–860. doi:10.1056/NEJMsa1012065
- Zouraris D, Graikou K, Vasileiou P, et al., Aligiannis N (2025). EthnoHERBS: harnessing traditional herbal knowledge for biodiversity conservation and innovative health solutions. *Comput Struct Biotechnol J* 29:85–94. doi:10.1016/j.csbj.2025.03.035
