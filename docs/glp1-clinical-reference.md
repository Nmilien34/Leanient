# GLP-1 Clinical Reference (sourced)

Encodable numbers behind Leanient's muscle-retention model. Every figure here was
retrieved from a primary or authoritative source (linked). Treat this as the single
source of truth for drug-aware logic (verdict engine, shot-cycle, cold-start stat,
projected-path muscle band). **Re-verify before any number ships in a medical claim.**

Last pulled: 2026-06 (main-session WebSearch/WebFetch).

---

## 1. Pharmacokinetics & dosing cadence

| Drug | Brands | Half-life | Tmax / steady state | Cadence |
|---|---|---|---|---|
| Semaglutide | Ozempic, Wegovy | ~1 week (~165 h); present in circulation ~5 weeks | steady state ~4–5 weeks | **Weekly** |
| Tirzepatide | Mounjaro, Zepbound | ~5 days (~120 h) | steady state ~4 weeks | **Weekly** |
| Liraglutide | Saxenda, Victoza | ~13 h; Tmax ~11 h | — | **Daily** |

Implication: the shot-cycle "energy curve" should differ by drug. Liraglutide is **daily**, so
the weekly shot-cycle model we apply to everyone is wrong for it. Tirzepatide's shorter
half-life (~5 d) means a slightly steeper late-week fade than semaglutide (~7 d).

Sources: [Ozempic FDA label](https://www.accessdata.fda.gov/drugsatfda_docs/label/2023/209637s020s021lbl.pdf),
[Mounjaro FDA label](https://www.accessdata.fda.gov/drugsatfda_docs/label/2022/215866s000lbl.pdf),
[Saxenda FDA label](https://www.accessdata.fda.gov/drugsatfda_docs/label/2023/206321s016lbl.pdf).

---

## 2. Titration / escalation schedules

**Wegovy (semaglutide, weight mgmt):** 0.25 mg (wk 1–4) → 0.5 (5–8) → 1.0 (9–12) → 1.7 (13–16) → **2.4 mg (17+) maintenance**. ~16 weeks to full dose. (HD 7.2 mg added 2025.) Delay escalation 4 weeks if a step isn't tolerated.

**Ozempic (semaglutide, T2D):** 0.25 (starter, 4 wk) → 0.5 → 1.0 → 2.0 mg — different ceiling/steps than Wegovy.

**Zepbound / Mounjaro (tirzepatide):** 2.5 mg (wk 1–4) → 5 → 7.5 → 10 → 12.5 → **15 mg**, each step ≥4 weeks, max increase 2.5 mg/step. Maintenance 5 / 10 / 15 mg. ~20 weeks to max.

Implication: we can anticipate step-ups ("you move to X next week — suppression deepens, protein gets harder") because the ramp is a known 4-week cadence.

Sources: [Wegovy PI](https://www.novo-pi.com/wegovy.pdf),
[Zepbound FDA label](https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/217806s003lbl.pdf).

---

## 3. Lean-mass / muscle loss — the core stat

What share of total weight lost was **lean/fat-free mass** (DEXA), by trial:

| Trial (drug) | Duration | Total wt | Fat mass | Lean mass | Lean share of loss |
|---|---|---|---|---|---|
| STEP-1 DEXA substudy (semaglutide) | 68 wk | −15.0% | −19.3% | −9.7% | **~39%** (abs. calc ~45%) |
| SURMOUNT-1 (tirzepatide) | 72 wk | −21.3% | −33.9% | −10.9% | **~25%** (≈75% fat) |

So across drugs the honest cross-drug range is **~25–40%** of lost weight as lean mass —
tirzepatide at the low end, semaglutide at the high end (in these trials).

**Critical caveats (for honest framing):**
- DEXA "lean mass" includes water, glycogen, and organ mass — it **overstates** true skeletal-muscle loss.
- In both trials the lean-to-total-body **proportion improved** (body composition got better) because fat fell faster.
- A real-world analysis found *greater* lean decline with tirzepatide than semaglutide — trial vs. routine-care data disagree. **Hedge any per-drug ordering.**

Sources: [STEP-1 body-composition exploratory analysis (Endocrine Society)](https://academic.oup.com/jes/article/5/Supplement_1/A16/6240360),
[STEP-1 (NEJM)](https://www.nejm.org/doi/full/10.1056/NEJMoa2032183),
[SURMOUNT-1 body composition (Diabetes Obes Metab 2025)](https://dom-pubs.onlinelibrary.wiley.com/doi/10.1111/dom.16275),
[Lean-mass changes review, Neeland 2024](https://dom-pubs.onlinelibrary.wiley.com/doi/10.1111/dom.15728),
[Real-world lean decline (medRxiv)](https://www.medrxiv.org/content/10.64898/2026.04.11.26350687v1.full).

---

## 4. Muscle preservation: protein + resistance training

- **Protein:** Obesity Society target **1.2–1.6 g/kg/day** (actual/adjusted body weight), or ~1.5 g/kg lean mass; **up to 2.0 g/kg ideal body weight** when actively resistance training.
- **Per meal:** **20–30 g** high-quality protein to trigger muscle protein synthesis; distribute evenly across the day (beats 1–2 big hits).
- **Resistance training:** **2–3×/week**, recommended jointly by ACLM / ASN / OMA / The Obesity Society alongside GLP-1 therapy; most effective single intervention to preserve muscle during loss.

Sources: [The Obesity Society / multi-society protein & RT guidance summary](https://www.clinicalnutritioncenter.com/research-updates/protein-glp1-muscle-preservation-denver),
[GLP-1 protein guidance (Fella Health review)](https://www.fellahealth.com/guide/how-much-protein-to-eat-on-glp-1).

---

## 5. GLP-1 vs dual GLP-1/GIP (tirzepatide)

Tirzepatide adds a **GIP** agonist arm to semaglutide's GLP-1-only action; the GIP component
is implicated in its larger fat-mass reduction and (in trials) relatively better lean
preservation. Mechanistic appetite/nausea differences need a deeper primary-source pass
before we encode anything beyond the PK/body-comp numbers above. **(Pending.)**

---

## 6. Encodable constants (draft)

```
semaglutide:  { halfLifeHours: 165, cadence: "weekly", leanLossPct: [0.39, 0.45], proteinGkg: [1.2, 1.6],
                titration: ["0.25/4wk","0.5/4wk","1.0/4wk","1.7/4wk","2.4 maint"] }   // Wegovy
tirzepatide:  { halfLifeHours: 120, cadence: "weekly", leanLossPct: [0.25, 0.30], proteinGkg: [1.2, 1.6],
                titration: ["2.5/4wk","5/4wk","7.5/4wk","10/4wk","12.5/4wk","15 maint"] }
liraglutide:  { halfLifeHours: 13,  cadence: "daily",  leanLossPct: [0.30, 0.40], proteinGkg: [1.2, 1.6] }  // SCALE lean % still to fetch
generic_glp1: { leanLossPct: [0.25, 0.40] }   // cold-start fallback when drug unknown
```

**Still to pull:** SCALE (liraglutide) DEXA lean %, per-dose nausea/GI incidence by titration step,
deeper GIP appetite mechanism. None block the cold-start work.
