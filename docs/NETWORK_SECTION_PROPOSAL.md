# Adding the GCC Network (CEO · PCN · CLOs · Working Group)

**Status:** approved and live.
**GCC Network scope:** `/network/` — reachable from the scope switcher on every page.
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
│  ● Internal GCDC          ● GCC Network                      │  ← scope
├──────────────────────────────────────────────────────────────┤
│  GCDC   Knowledge Mapping Page                               │
│  Home · Overview · Core Expertise · Experts ·                │  ← scope's own tabs
│  Member States · GCDC ↔ Network · Mapping                    │
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

## 3. The seven network sections

The structure mirrors the internal scope section for section, so moving between
the two scopes feels like the same portal rather than two products.

| Section | Source sheet | What it shows |
|---|---|---|
| **Home** | 00_README | Same hero and layout as the internal Home, with a *GCC Network* badge: 55 experts, 6 Member States (with flags), 10 domains |
| **Overview** | 00_README, 01_Taxonomy | Headline indicators, coverage donut, experts by Member State, coverage by domain |
| **Core Expertise** | 02_Master_Dataset | Sortable table of name, Member State (flag) and core expertise — the network twin of the internal Core Expertise page. CSV export included |
| **Experts** | 02_Master_Dataset | 55 cards — name, position, entity, Member State, core areas, profile level. **No email addresses.** |
| **Member States** | 04_MemberState_Coverage | Heatmap of expertise × 6 states, columns ordered United Arab Emirates · Bahrain · Saudi Arabia · Oman · Qatar · Kuwait |
| **GCDC ↔ Network** | joins 03 with the internal matrix | The bridge — see below |
| **Mapping** | 08_Mapping_Hierarchy | The 212-node interactive tree, same geometry, controls and behaviour as the internal Mapping section |

Three sheets are deliberately **left out of the public view**: `06_Knowledge_Gaps`
(the Regional Gaps page was removed on review), `07_Engagement_Plan` (who to
approach, in what priority) and `09_Coding_Log` (verbatim survey answers plus
confidence flags). The latter two are internal working material about named
foreign officials and belong behind the Entra ID sign-in once Azure is live.

### Member State flags

The six flags are simplified SVGs drawn in-repo (`assets/img/flags/`), so the page
still makes no external requests and the CSP is unchanged. They are
approximations at 30×20px, not official renderings — the Saudi flag in
particular represents the shahada as an abstract band rather than imitating
letterforms. The full country name always appears with the flag, so nothing
depends on recognising the image.

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

## 6. Before this goes live

The internal site already publishes 30 staff names and work emails, which is why
the Azure Static Web Apps + Entra ID migration is prepared. Publishing **55 named
officials of six foreign ministries** on a public `github.io` address raises that
materially — these are not Gulf CDC's people to publish.

Recommendation: **finish the Azure/Entra migration before the network space is
merged into the live portal** (`docs/AZURE_DEPLOYMENT.md`, blocked only on IT:
deployment token, app registration, DNS). The network scope carries no email
addresses and no engagement plan, which limits the exposure, but it does not
remove it.

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
