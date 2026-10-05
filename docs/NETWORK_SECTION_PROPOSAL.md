# Adding the GCC Network (CEO · PCN · CLOs · Working Group)

**Status:** proposal + working design view — nothing in the live portal has changed.
**Design view:** `/preview/` — click through it, then tell me what to change.
**Source:** `data/GulfCDC_KnowledgeMapping_Network_MasterAnalysis_v3_CoreTaxonomy.xlsx`

---

## 1. What the v3 workbook actually contains

| | |
|---|---|
| Valid respondents | **55** |
| Member States | **6** (UAE 11 · Qatar 11 · Bahrain 10 · Saudi Arabia 10 · Oman 7 · Kuwait 6) |
| Core expertise tags | 136 (2.5 areas per expert) |
| Taxonomy areas covered | **40 of 57** |
| Adequate / Thin / Sole expert / No holder | 17 / 12 / 11 / 17 |
| Externally consulted by WHO or Member States | 38 |
| Regional Focal Point candidates (P1) | 5 |

The decisive fact: the network was coded against **the same 57-area Core Expertise
Taxonomy** as the internal staff mapping. That is what makes a comparison possible
rather than two unrelated lists sitting side by side.

## 2. The recommendation: a second *scope*, not a seventh tab

Adding "Network" as one more tab next to Contacts would quietly merge two
populations that must never be confused — 30 Gulf CDC employees you can email, and
55 officials of six sovereign health authorities that Gulf CDC does not employ.

Instead the portal gets a **scope switcher** above the navigation:

```
┌──────────────────────────────────────────────────────────────┐
│  ● Inside Gulf CDC        ● GCC Network                      │  ← scope
├──────────────────────────────────────────────────────────────┤
│  GCDC   Knowledge Mapping Page                               │
│  Overview · Experts · Member States · Regional Gaps ·        │  ← scope's own tabs
│  Gulf CDC ↔ Network · Map                                    │
└──────────────────────────────────────────────────────────────┘
```

Choosing a scope swaps the whole tab set. The internal space keeps exactly the
six sections it has today; the network space gets its own six. Nothing moves,
nothing is renamed, and no existing link breaks.

### Three layers of separation

1. **Navigation** — the two populations are never in the same tab strip. You
   cannot reach a network expert from Contacts, or a staff member from the
   network directory.
2. **Visual** — the internal space keeps GCDC navy + cyan. The network space is
   accented in **GCDC deep teal (`#046F8A`)**: teal rule under the header, teal
   card borders, teal map. Every network person also carries a Member-State chip
   (`AE` UAE, `BH` Bahrain …), and every network view opens with a banner stating
   in plain words that these people are *not* Gulf CDC staff.
3. **Data** — a separate dataset object, `window.GCDC_NETWORK`, built by
   `scripts/generate_network_data.py` from the v3 workbook. The internal
   `assets/js/data.js` is untouched. The two people lists are never concatenated
   anywhere in the code.

## 3. The six network sections

| Section | Source sheet | What it shows |
|---|---|---|
| **Overview** | 00_README, 01_Taxonomy | Headline indicators, coverage donut, experts by Member State, coverage by domain |
| **Experts** | 02_Master_Dataset | 55 cards — name, position, entity, Member State, core areas, profile level. **No email addresses.** |
| **Member States** | 04_MemberState_Coverage | Heatmap of expertise × 6 states; exposes single-state concentration |
| **Regional Gaps** | 06_Knowledge_Gaps | Status per area with the workbook's strategic recommendation |
| **Gulf CDC ↔ Network** | joins 03 with the internal matrix | The bridge — see below |
| **Map** | 08_Mapping_Hierarchy | The 212-node tree, same interaction as the internal Mapping section |

Two sheets are deliberately **left out of the public view**: `07_Engagement_Plan`
(who to approach, in what priority) and `09_Coding_Log` (verbatim survey answers
plus confidence flags). Both are internal working material about named foreign
officials. They belong behind the Entra ID sign-in, in the admin-only area, once
Azure is live.

## 4. The payoff: the Gulf CDC ↔ Network bridge

This is the section worth building the rest for, and the only place the two
populations appear together — in separate columns, never merged.

Running the join today:

| Reading | Areas |
|---|---|
| **Network covers a Gulf CDC gap** (internal ≤ 1 holder, network ≥ 2) | **16** |
| One regional holder only — fragile on both sides | 8 |
| Gap on both sides — must be sourced outside the GCC | 14 |
| Strong on both sides — anchor joint programmes here | 16 |

The 16 include **Surveillance Systems Design** (Gulf CDC 1 → network 8),
**Registry Development** (1 → 6), **Strategic Planning & Priority Setting** (1 → 6),
**Biostatistics** (1 → 5), **Risk Assessment** (1 → 5) and **Medical Laboratory**
(0 → 3). Each one is a concrete mentoring, secondment or Community-of-Practice
target, and it is the argument that turns the knowledge map from a report into a
plan.

## 5. The one thing the data cannot answer yet

**The workbook has no column saying who is CEO, PCN, CLO or Working Group.**

Every sheet treats the 55 as one undifferentiated network. `Track` only
distinguishes Managerial (40) from Professional (15), and `Position Level` gives
job seniority, not constituency. I checked all twelve sheets.

So the group filter is built and visible in the design view, but its four chips
render in a dashed "pending" state. To switch them on, either:

- **Preferred** — add a **`Network Group`** column to `02_Master_Dataset` with the
  values `CEO`, `PCN`, `CLO`, `WG`, and I regenerate; or
- send me a name → group list, and I store it as a correction layer
  (`NETWORK_GROUP` in `scripts/generate_network_data.py`), exactly how the
  `NAME_FIX` and `DEPT_FIX` corrections already work for the internal data.

Once present, the groups become a filter across every network section, a badge on
each expert card, and a "Coverage by group" chart mirroring the internal
"Coverage by department".

## 6. Before this goes live

The internal site already publishes 30 staff names and work emails, which is why
the Azure Static Web Apps + Entra ID migration is prepared. Publishing **55 named
officials of six foreign ministries** on a public `github.io` address raises that
materially — these are not Gulf CDC's people to publish.

Recommendation: **finish the Azure/Entra migration before the network space is
merged into the live portal** (`docs/AZURE_DEPLOYMENT.md`, blocked only on IT:
deployment token, app registration, DNS). The design view under `/preview/`
carries no email addresses and no engagement plan, so it is safe to circulate for
feedback in the meantime.

## 7. If approved

1. Add the `Network Group` column (or send the roster) so the four groups light up.
2. Fold `preview/` into the main app: scope switcher in `index.html`, network
   views into `assets/js/app.js`, `preview.css` into `assets/css/styles.css`.
3. Render the network map with the same interactive SVG tree as the internal one,
   in teal.
4. Put Engagement Plan and Coding Log behind `allowedRoles` in
   `staticwebapp.config.json`.
5. Regenerate with `python3 scripts/generate_network_data.py` whenever the
   workbook changes.
