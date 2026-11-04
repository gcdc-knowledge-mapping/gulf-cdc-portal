# Gulf CDC — Workforce Knowledge Continuity Portal

An interactive, dependency-free web portal that turns the Gulf CDC's workforce
knowledge-continuity assessment into a decision tool: where critical expertise
lives, where losing one person would break a capability, and who to interview
first to capture that knowledge.

## What it shows

| Section | Purpose |
|---|---|
| **Overview** | Headline KPIs, expertise-coverage and workforce-risk breakdowns, coverage by CF domain, a table of all 23 CF competencies, and the highest continuity risks at a glance. |
| **Critical Experts** | All assessed staff scored on knowledge depth, skill scarcity, and impact. Sortable/filterable; risk index = depth × scarcity × impact. |
| **Knowledge Gaps** | Every core area rated by number of core holders, with a domain × resilience heatmap and recommended actions. Flags single core experts, thin coverage, and areas with no core expert. |
| **Interview Plan** | The knowledge-capture interview shortlist with per-person core-expertise focus and interview status. |
| **Expertise Matrix** | The full taxonomy (CF domain → CF competency → expertise area) with the people holding each area, colour-coded by coverage resilience and marked where an area sits outside the framework's own scope. |
| **Mapping** | The hierarchy as an interactive Coggle-style tree: Root → CF domain → CF competency → Expertise area → Holder. Only areas someone holds appear; the rest are on the Gaps tab. |

## Running it

It's a static site — no build, no server required.

```bash
# Simplest: open the file directly
open index.html            # macOS   (xdg-open on Linux)

# Or serve it (recommended for a clean URL / GitHub Pages parity)
python3 -m http.server 8000
# then visit http://localhost:8000
```

The dataset is embedded in `assets/js/data.js`, so the portal works fully offline
and even when opened straight from disk (`file://`).

## Data

Two analysis workbooks are the single source of truth, one per scope:

| Workbook | Scope |
|---|---|
| `data/GulfCDC_KnowledgeMapping_MasterAnalysis_Internal_HybridTaxonomy_v3.xlsx` | Internal GCDC — 30 staff, 5 departments |

One further member of staff, Gulf CDC's CEO, answered the GCC Network survey
rather than the internal one, so the internal workbook holds no record for him.
He is listed in the internal mapping as well, bringing it to **31 staff**; his
coding is read from the network workbook, so it has a single source. See
`CROSS_LISTED` in `scripts/generate_data.py`. This is the only person who
appears in both scopes, and `check_counts.py` asserts that it stays that way.
| `data/GulfCDC_KnowledgeMapping_Network_MasterAnalysis_v8_HybridTaxonomy.xlsx` | GCC Network — 68 experts, 6 Member States |

Both use the **hybrid taxonomy**: the **7 domains of the Gulf CDC Public Health
Competency Framework** → **23 CF competencies** (coded `1.1`–`7.5`, official
wording) → **65 Level-3 expertise areas**, each under exactly one competency.
Every area carries a *Framework Fit* flag — `Direct` (45), `Nearest fit — outside
CF scope` (18: research, laboratory/clinical and workforce-education areas) or
`Added in v6 — CF coverage` (2).

Two competencies are **behavioural** (`7.3` Lead and Manage People, `7.5`
Professionalism and Ethics). They have no Level-3 area by design, so they are
reported as *Not mapped — behavioural* in neutral grey and are never counted as
a gap.

**Counting rules.** People are coded at Level 3 only; competency and domain
figures roll up from there, and someone holding two areas under one competency
counts **once** for that competency. An area counts only where it is held as
*core* expertise, not mere awareness:

| Holders | Status |
|---|---|
| 0 | No core expert |
| 1 | Single core expert |
| 2 | Thin coverage |
| 3+ | Adequate |

**Profile Level** is the CF proficiency band, derived from the survey's years of
experience and read from the workbook's `Profile_Level_Rules` sheet (never
hard-coded): `<2y` and `2–5y` → Competent, `6–10y` → Proficient, `>10y` →
Expert.

### Regenerating

Drop a revised workbook in over the one above (same name) and run the generator
for that scope:

```bash
python3 scripts/generate_data.py          # Internal GCDC
python3 scripts/generate_network_data.py  # GCC Network
python3 scripts/check_counts.py           # assert the headline figures
```

Each generator rewrites the embedded dataset the page loads — `assets/js/data.js`
(`window.GCDC_DATA`) or `assets/js/network-data.js` (`window.GCDC_NETWORK`) —
plus readable JSON exports, one file per table, in `data/` and `data/network/`:

- `taxonomy.json` — domain → competency → expertise area, with Framework Fit
- `competencies.json` — the 23 CF competencies with distinct-holder counts
- `expertise_matrix.json` / `people.json` — who holds each area
- `knowledge_gaps.json` / `coverage.json` — coverage status per area
- `critical_holders.json` — staff risk scoring (depth, scarcity, impact, index)
- `interview_shortlist.json` — the knowledge-capture interview plan
- `profile_levels.json` — the CF proficiency bands, as read from the workbook
- `tree.json` — the mapping hierarchy, built from the data
- `network/bridge.json` — internal vs. network coverage side by side, at both
  area and competency level. **Reference only; not bundled into the page**, which
  is also what keeps the two populations separate.

The two scopes are never merged: `window.GCDC_DATA` and `window.GCDC_NETWORK`
stay separate objects, and only fields a view actually reads go into the
bundles — `check_counts.py` asserts both rules.

The generators read the workbooks as the only source of truth and apply no
corrections of their own, apart from a small e-mail alias map for staff who
answered the survey under a short name. The network e-mail join needs the raw
survey export, which is git-ignored; without it the generator falls back to
`data/network_emails.json`, which holds the addresses already extracted from it.

Requires Python with `openpyxl` (`python3 -m pip install openpyxl`).

### Publication decision

By a project-owner decision of **November 2026**, the names, work e-mail
addresses, expertise and skills of both populations are treated as **public
information**. E-mails are therefore visible on both scopes and there is no hide
switch, and both analysis workbooks are committed here as the source of truth.

Two things stay out of the repository, for reasons other than the above: the raw
network survey export, which carries every verbatim free-text answer and is only
an input for the e-mail join, and the derived engagement plan, which is the
Center's own approach priorities rather than anyone's expertise. See `.gitignore`
for both, and `docs/NETWORK_SECTION_PROPOSAL.md` §6 for the decision in full.
The move to Azure Static Web Apps with Microsoft Entra sign-in
(`docs/AZURE_DEPLOYMENT.md`) remains a separate IT track; it is no longer a
precondition for publishing.

## Design notes

- **Vanilla HTML/CSS/JS** — no frameworks or external requests, so it loads instantly and hosts anywhere (GitHub Pages, S3, an intranet share).
- **Theme-aware** — light and dark, with the choice remembered; respects the OS preference on first load.
- **Reserved status colours** — green / amber / orange / red always carry an icon and a text label, never colour alone, so the state is legible to colour-blind users and in print.
- **Accessible** — keyboard-navigable tabs, sortable tables with `aria-sort`, a skip link, and reduced-motion support.

## Layout

```
index.html                        # Internal GCDC — shell + navigation
network/index.html                # GCC Network — shell + navigation
assets/css/styles.css             # design tokens, layout, components, scope switcher
assets/css/network.css            # GCC Network accent tokens, flags, heatmap
assets/js/data.js                 # embedded internal dataset (generated)
assets/js/network.js              # GCC Network views, charts, tables, routing
assets/js/network-data.js         # embedded network dataset (generated)
assets/js/app.js                  # internal views, charts, tables, routing
assets/img/                       # GCDC logo (colour + reversed white)
assets/img/flags/                 # Member State flags (inline SVG, self-hosted)
scripts/generate_data.py          # rebuilds data.js + data/*.json
scripts/generate_network_data.py  # rebuilds network-data.js + data/network/*.json
scripts/check_counts.py           # asserts the headline figures after a rebuild
data/*.xlsx                       # the two analysis workbooks — source of truth
data/*.json, data/network/*.json  # generated JSON exports
docs/HYBRID_TAXONOMY.md           # the taxonomy and counting rules (generated)
docs/AZURE_DEPLOYMENT.md          # handover for IT: Entra sign-in, custom domain
```
