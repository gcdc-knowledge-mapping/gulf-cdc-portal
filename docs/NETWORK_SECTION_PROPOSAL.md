# Adding the GCC Network (CEO · PCN · CLOs · Working Group)

**Status:** approved and live.
**GCC Network scope:** `/network/` — reachable from the scope switcher on every page.
**Source:** `data/GulfCDC_KnowledgeMapping_Network_MasterAnalysis_v8_HybridTaxonomy.xlsx`

---

## 1. What the workbook contains

| | |
|---|---|
| Valid respondents | **68** |
| Member States | **6** |
| Level-3 expertise tags | 193 (2.8 areas per expert) |
| Expertise areas held | **52 of 65** |
| Adequate / Thin / Single core expert / No holder | 25 / 11 / 16 / 13 |
| CF competencies held | **20 of 23** (2 of the remaining 3 are behavioural) |
| Profile level: Expert / Proficient / Competent | 58 / 5 / 5 |
| Externally consulted by WHO or Member States | 49 |
| Regional Focal Point candidates (P1) | 9 |

The decisive fact: the network is coded against **the same taxonomy** as the
internal staff mapping — the 7 domains and 23 competencies of the Gulf CDC Public
Health Competency Framework, over 65 shared Level-3 expertise areas. That is what
makes a comparison possible rather than two unrelated lists sitting side by side.
The comparison itself lives in `data/network/bridge.json`, at both the competency
and the area level, and is deliberately not bundled into either page.

## 2. The recommendation: a second *scope*, not a seventh tab

Adding "Network" as one more tab next to Contacts would quietly merge two
populations that must never be confused — 31 Gulf CDC employees you can email, and
68 officials of six sovereign health authorities that Gulf CDC does not employ.

Instead the portal gets a **scope switcher** above the navigation:

```
┌──────────────────────────────────────────────────────────────┐
│  ● Internal GCDC          ● GCC Network                      │  ← scope
├──────────────────────────────────────────────────────────────┤
│  GCDC   Knowledge Mapping Page                               │
│  Home · Overview · Core Expertise · Experts ·                │  ← scope's own tabs
│  Member States · Mapping                                     │
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
   `scripts/generate_network_data.py` from the v8 workbook. The internal
   `assets/js/data.js` is untouched. The two people lists are never concatenated
   anywhere in the code.

## 3. The six network sections

The structure mirrors the internal scope section for section, so moving between
the two scopes feels like the same portal rather than two products.

| Section | Source sheet | What it shows |
|---|---|---|
| **Home** | 00_README | Same hero and layout as the internal Home, with a *GCC Network* badge: 68 experts, 6 Member States (with flags), 7 CF domains |
| **Overview** | 00_README, 01_Taxonomy, 06_Competency_Coverage | Headline indicators, coverage donut for the 65 expertise areas, experts by Member State, coverage by CF domain, and a table of all 23 CF competencies |
| **Core Expertise** | 02_Master_Dataset | Sortable table of name, Member State (flag) and core expertise — the network twin of the internal Core Expertise page. CSV export included |
| **Experts** | 02_Master_Dataset | 68 cards — name, position, entity, Member State, CF profile level, core areas and work email |
| **Member States** | 04_MemberState_Coverage, Fact_CoreExpertise | Heatmap × 6 states, columns ordered United Arab Emirates · Bahrain · Saudi Arabia · Oman · Qatar · Kuwait, with a toggle between CF competency (default, distinct people) and expertise area |
| **Mapping** | computed from Fact_CoreExpertise | The 273-node interactive tree — Network → CF domain → CF competency → Expertise area → Holder — with the same geometry, controls and behaviour as the internal Mapping section and each holder's Member State shown as a flag |

Two sheets are deliberately **left out of the published bundle**:
`08_Engagement_Plan` (who to approach, in what priority) and `10_Coding_Log`
(verbatim survey answers plus confidence flags). They are the Center's own
working material rather than anyone's expertise, no view reads them, and the
engagement plan is git-ignored as well as unbundled.

### Member State flags

The six flags are simplified SVGs drawn in-repo (`assets/img/flags/`), so the page
still makes no external requests and the CSP is unchanged. They are
approximations at 30×20px, not official renderings — the Saudi flag in
particular represents the shahada as an abstract band rather than imitating
letterforms. The full country name always appears with the flag, so nothing
depends on recognising the image.

## 4. The Gulf CDC ↔ Network comparison

The two populations share the 65-area taxonomy, so their counts join directly at
both the competency and the area level.
The comparison was built as a view and then removed from the navigation on
review; it is still generated to `data/network/bridge.json` and can be brought
back at any time.

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

## 5. Constituencies: one network, no sub-categories

The original plan was to split the network four ways — CEO, PCN, Country Liaison
Officers, Working Group. That has been dropped on review:

- **The whole population is presented as one "GCC Network."** The workbook carries
  no constituency column in any of its twelve sheets (`Track` only separates
  Managerial from Professional, and `Position Level` gives job seniority), so the
  split could not be derived from the data, and the analysis does not depend on
  it. The group filter and its four chips have been removed.
- **The CEO belongs to the internal scope, not the network.** This needed no data
  change: no Gulf CDC person appears among the 55 respondents — there is no name
  overlap with the internal 30, and no Gulf CDC affiliation anywhere in the
  workbook. The internal dataset already carries a **CEO office** department
  (Waleed Al Nadabi, Executive Director; Sarah Alsaleh, Senior Specialist).

If the constituencies are ever needed, `scripts/generate_network_data.py` still
carries the `NETWORK_GROUP` correction layer, and a `Network Group` column in
`02_Master_Dataset` would populate it.

## 6. Publication decision

**Decided by the project owner, November 2026:** the names, work e-mail
addresses, expertise and skills of both populations — the 31 Gulf CDC staff and
the 68 network members — are treated as **public information**.

What follows from that:

- E-mail addresses stay visible on both scopes. There is no hide switch.
- Both analysis workbooks are committed to `data/` as the source of truth.
- The raw network survey export stays git-ignored. That is not a publication
  judgement: it carries every verbatim free-text answer and exists only as an
  input to the e-mail join. The addresses it yielded are committed separately as
  `data/network_emails.json` so the build is reproducible without it.
- The derived engagement plan stays out of the repository and out of the
  bundles. The decision covers expertise and contact details, not the Center's
  own approach priorities for named officials of six foreign health authorities.

This replaces the earlier recommendation on this page, which was to finish the
Azure/Entra migration before publishing the network scope. That migration
(`docs/AZURE_DEPLOYMENT.md`) remains worth doing for access control and for a
professional address on the Center's own domain, but it is now a separate IT
track rather than a precondition.

## 7. How it is wired

The network scope is a second page rather than a mode inside the single-page
app, which keeps `assets/js/app.js` and the internal views completely untouched:

| File | Role |
|---|---|
| `network/index.html` | The GCC Network page and its seven tabs |
| `assets/js/network.js` | All network views, including the mapping tree |
| `assets/js/network-data.js` | `window.GCDC_NETWORK`, generated from the workbook |
| `assets/css/network.css` | Network-only styling, on top of `styles.css` |
| `assets/img/flags/` | The six Member State flags |

The scope switcher markup sits in the utility bar of both pages, and its styling
lives in `styles.css` because both need it.

**Still outstanding:** put Engagement Plan and Coding Log behind `allowedRoles`
in `staticwebapp.config.json`, and regenerate with
`python3 scripts/generate_network_data.py` whenever the workbook changes.
