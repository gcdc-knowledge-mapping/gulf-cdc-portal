#!/usr/bin/env python3
"""
Build the internal Gulf CDC dataset for the Knowledge Mapping Page.

Source of truth:
    data/GulfCDC_KnowledgeMapping_MasterAnalysis_Internal_HybridTaxonomy_v3.xlsx
    data/Knowledge_Mapping_survey.xlsx   (work e-mail addresses only)

Writes:
    assets/js/data.js   (window.GCDC_DATA — embedded so file:// works)
    data/*.json         (the same payload, one file per table)

The workbook is the single source of truth. Every correction that used to live
in this script (name fixes, department moves, expertise edits, areas added in
the portal) is now inside the workbook, so no correction layer remains here —
except the small alias map used to join work e-mails from the raw survey, whose
"Full Name" answers do not always match the workbook spelling.

Taxonomy model: 7 CF domains -> 23 CF competencies -> 65 Level-3 expertise
areas. People are coded at Level 3; competencies and domains roll up, and a
person holding two areas under one competency counts once for that competency.
"""

import json
import os
import re
import unicodedata

import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

SRC = os.path.join(
    ROOT, "data", "GulfCDC_KnowledgeMapping_MasterAnalysis_Internal_HybridTaxonomy_v3.xlsx"
)
SURVEY = os.path.join(ROOT, "data", "Knowledge_Mapping_survey.xlsx")

# Survey "Full Name" answers that differ from the workbook spelling. This is the
# only correction layer left, and it exists solely for the e-mail join.
EMAIL_ALIAS = {
    "Bushra": "Bushra Alghamdi",
    "Faris": "Faris Aldammas",
    "Rose": "Rose Nazra",
    "Dr Mahim Al Balushi": "Mahim Al Balushi",
    "MOHAMMED ALSHEHRI": "Mohammed Alshehri",
}

# Competencies 7.3 and 7.5 are behavioural: they carry no Level-3 area and are
# never a gap.
BEHAVIOURAL = {"7.3", "7.5"}


def s(v):
    if v is None:
        return ""
    t = str(v).replace("\xa0", " ").strip()
    return "" if t in {"·", "-", "—", "None", "nan"} else t


def num(v, default=0):
    try:
        return int(float(str(v).strip()))
    except (TypeError, ValueError):
        return default


def norm(v):
    t = unicodedata.normalize("NFKD", s(v)).lower()
    t = re.sub(r"\b(dr|prof|mr|ms|mrs|eng)\.?\s+", "", t)
    return re.sub(r"[^a-z]+", "", t)


def table(wb, sheet, header_row):
    """Rows of a sheet as dicts. Numbered sheets put headers on row 4."""
    data = list(wb[sheet].iter_rows(values_only=True))
    head = [s(c) for c in data[header_row - 1]]
    out = []
    for r in data[header_row:]:
        if all(c is None for c in r):
            continue
        out.append({h: r[i] for i, h in enumerate(head) if h})
    return out


def status_for(n):
    if n >= 3:
        return "\U0001F7E2 Adequate"
    if n == 2:
        return "\U0001F7E1 Thin Coverage"
    if n == 1:
        return "\U0001F7E0 Single Core Expert (SPOF)"
    return "\U0001F534 No Core Expert"


def recommend(n):
    if n >= 3:
        return "Maintain via documentation and knowledge champions."
    if n == 2:
        return "Only two core holders — build redundancy and document SOPs."
    if n == 1:
        return "Single core expert — capture knowledge and identify a successor."
    return "No staff member holds this area at core level — recruit or develop this capability."


def emails_by_name():
    """Work e-mail per staff member, from the raw survey export."""
    if not os.path.exists(SURVEY):
        print(f"note: {os.path.basename(SURVEY)} not found — e-mails omitted")
        return {}
    ws = openpyxl.load_workbook(SURVEY, data_only=True)["Sheet1"]
    data = list(ws.iter_rows(values_only=True))
    head = [s(c) for c in data[0]]
    try:
        i_name, i_mail = head.index("Full Name:"), head.index("Work email:")
    except ValueError:
        print("note: survey has no Full Name / Work email column — e-mails omitted")
        return {}
    out = {}
    for r in data[1:]:
        nm, mail = s(r[i_name]), s(r[i_mail])
        if not nm or not mail:
            continue
        out[norm(EMAIL_ALIAS.get(nm, nm))] = mail
    return out


def main():
    wb = openpyxl.load_workbook(SRC, data_only=True)

    # ---- profile-level rules (editable in the sheet, never hard-coded) ----
    # The sheet lists the bands first, then explanatory bullet rows that use the
    # same first column. Only rows naming a proficiency level are bands; the
    # bullets are kept separately so the page can show them as notes.
    profile_levels, profile_notes = [], []
    for r in table(wb, "Profile_Level_Rules", 4):
        years = s(r.get("Years of experience (survey answer)"))
        if not years:
            continue
        level = s(r.get("CF Proficiency Level"))
        if not level or years.startswith("•"):
            profile_notes.append(years.lstrip("• ").strip())
            continue
        profile_levels.append({
            "years": years,
            "level": level,
            "stage": s(r.get("Career Stage (toolkit: entry / mid / senior)")),
            "depth": num(r.get("Depth Score (1-5) — used in the Index")),
        })

    # ---- taxonomy: 65 Level-3 areas under 23 competencies, 7 domains ------
    taxonomy = []
    for r in table(wb, "01_Taxonomy", 4):
        area = s(r.get("Level 3 – Expertise Area"))
        if not area:
            continue
        competency = s(r.get("Level 2 – CF Competency"))
        taxonomy.append({
            "domain": s(r.get("Level 1 – CF Domain")),
            "code": s(r.get("Code")),
            "competency": competency,
            # kept so existing views that read `subdomain` keep working
            "subdomain": competency,
            "expertise": area,
            "fit": s(r.get("Framework Fit")),
            "origin": s(r.get("Origin (Core Taxonomy domain › sub-domain)")),
            "holders_n": num(r.get("Gulf CDC Holders (n)")),
            "path": s(r.get("Coggle Path")),
        })

    # ---- people ------------------------------------------------------------
    mails = emails_by_name()
    staff = []
    for r in table(wb, "02_Master_Dataset", 4):
        name = s(r.get("Name"))
        if not name:
            continue
        areas = [s(r.get(f"L3 Area {i}")) for i in range(1, 6)]
        areas = [a for a in areas if a]
        staff.append({
            "rank": num(r.get("#")),
            "name": name,
            "department": s(r.get("Department")),
            "position": s(r.get("Position")),
            "years": s(r.get("Years (survey)")),
            "leader": "★" in s(r.get("Leader (Mgr / Exec)")),
            "profile_level": s(r.get("Profile Level (CF)")),
            "impact": num(r.get("Impact (1-5)")),
            "core_areas": "; ".join(areas),
            "areas": areas,
            "core_count": len(areas),
            "sole_areas_n": num(r.get("Sole-Expert Areas (n)")),
            "depth": num(r.get("Depth (1-5)")),
            "scarcity": num(r.get("Scarcity (1-5)")),
            "risk_index": num(r.get("Risk Index (1-125)")),
            "competencies": [c for c in
                             (x.strip() for x in s(r.get("L2 CF Competencies (rolled up)")).split(";"))
                             if c],
            "source": s(r.get("Coding Source")),
            "email": mails.get(norm(name), ""),
        })

    by_name = {p["name"]: p for p in staff}
    dept_of = {p["name"]: p["department"] for p in staff}

    # ---- long table: one row per person x area ----------------------------
    fact = [f for f in table(wb, "Fact_CoreExpertise", 1) if s(f.get("Name"))]

    # career stage per person, from the profile rules
    stage_of_level = {p["level"]: p["stage"] for p in profile_levels}
    for p in staff:
        p["career_stage"] = stage_of_level.get(p["profile_level"], "")

    # ---- expertise matrix: holders per area -------------------------------
    holders_by_area = {}
    for f in fact:
        area = s(f.get("L3 – Expertise Area"))
        nm = s(f.get("Name"))
        if area and nm:
            holders_by_area.setdefault(area, []).append(f"{nm} ({dept_of.get(nm, '')})")

    matrix = []
    for t in taxonomy:
        hs = holders_by_area.get(t["expertise"], [])
        if not hs:
            continue
        matrix.append({
            "domain": t["domain"], "code": t["code"], "competency": t["competency"],
            "subdomain": t["subdomain"], "expertise": t["expertise"], "fit": t["fit"],
            "holders_n": len(hs), "holders": sorted(hs),
        })

    # ---- gaps: every one of the 65 areas ----------------------------------
    gaps = []
    for t in taxonomy:
        hs = holders_by_area.get(t["expertise"], [])
        n = len(hs)
        gaps.append({
            "domain": t["domain"], "code": t["code"], "competency": t["competency"],
            "subdomain": t["subdomain"], "expertise": t["expertise"], "fit": t["fit"],
            "holders_n": n, "status": status_for(n),
            "sole_holder": hs[0] if n == 1 else "",
            "recommendation": recommend(n),
        })

    # ---- competencies: distinct people, not tags --------------------------
    people_per_comp, tags_per_comp, depts_per_comp = {}, {}, {}
    for f in fact:
        code = s(f.get("Code"))
        nm = s(f.get("Name"))
        if not code or not nm:
            continue
        tags_per_comp[code] = tags_per_comp.get(code, 0) + 1
        people_per_comp.setdefault(code, set()).add(nm)
        depts_per_comp.setdefault(code, set()).add(dept_of.get(nm, ""))

    competencies = []
    for r in table(wb, "06_Competency_Coverage", 4):
        code = s(r.get("Code"))
        if not code:
            continue
        behavioural = code in BEHAVIOURAL
        people = len(people_per_comp.get(code, ()))
        competencies.append({
            "domain": s(r.get("L1 – CF Domain")),
            "code": code,
            "competency": s(r.get("L2 – CF Competency")),
            "areasDefined": num(r.get("L3 Areas Defined")),
            "areasHeld": num(r.get("L3 Areas Held")),
            "people": people,
            "tags": tags_per_comp.get(code, 0),
            "departments": len([d for d in depts_per_comp.get(code, ()) if d]),
            "status": "Not mapped — behavioural" if behavioural else status_for(people),
            "behavioural": behavioural,
            "recommendation": s(r.get("Strategic Recommendation")),
        })

    # ---- critical holders --------------------------------------------------
    rare_by_name = {}
    for f in fact:
        if num(f.get("Area Holders (n)")) == 1:
            rare_by_name.setdefault(s(f.get("Name")), []).append(s(f.get("L3 – Expertise Area")))

    continuity = {}
    for r in table(wb, "05_Critical_Holders", 4):
        nm = s(r.get("Name"))
        if nm:
            continuity[nm] = s(r.get("Continuity Consideration"))

    def flag_for(ri):
        if ri >= 80:
            return "\U0001F534 High continuity risk"
        if ri >= 40:
            return "\U0001F7E1 Moderate continuity risk"
        return "\U0001F7E2 Low continuity risk"

    critical = []
    for p in sorted(staff, key=lambda x: (-x["risk_index"], x["name"])):
        critical.append({
            "rank": len(critical) + 1,
            "name": p["name"], "department": p["department"], "position": p["position"],
            "years": p["years"], "profile_level": p["profile_level"],
            "career_stage": p["career_stage"],
            "depth": p["depth"], "scarcity": p["scarcity"], "impact": p["impact"],
            "risk_index": p["risk_index"],
            "core_count": p["core_count"], "core_areas": p["core_areas"],
            "competencies": p["competencies"],
            "rare_expertise": "; ".join(sorted(rare_by_name.get(p["name"], []))),
            "flag": flag_for(p["risk_index"]),
            "leader": p["leader"],
            "continuity": continuity.get(p["name"], ""),
            "source": p["source"],
            "email": p["email"],
        })

    # ---- interview shortlist ----------------------------------------------
    shortlist = []
    for r in table(wb, "08_Interview_Shortlist", 4):
        nm = s(r.get("Name"))
        if not nm:
            continue
        shortlist.append({
            "order": num(r.get("Order")), "name": nm,
            "department": s(r.get("Department")), "position": s(r.get("Position")),
            "profile_level": s(r.get("Profile Level")),
            "risk_index": num(r.get("Risk Index")),
            "focus": s(r.get("Core Expertise Focus — [CF code] area")),
            "interview_status": s(r.get("Interview Status")),
            "duration": s(r.get("Duration")),
        })

    # ---- headline counts ---------------------------------------------------
    area_status = {"adequate": 0, "thin": 0, "single": 0, "noCore": 0}
    for g in gaps:
        n = g["holders_n"]
        key = "adequate" if n >= 3 else "thin" if n == 2 else "single" if n == 1 else "noCore"
        area_status[key] += 1

    comp_status = {"adequate": 0, "thin": 0, "single": 0, "noCore": 0, "behavioural": 0}
    for c in competencies:
        if c["behavioural"]:
            comp_status["behavioural"] += 1
            continue
        n = c["people"]
        key = "adequate" if n >= 3 else "thin" if n == 2 else "single" if n == 1 else "noCore"
        comp_status[key] += 1

    profile_counts = {}
    for p in staff:
        profile_counts[p["profile_level"]] = profile_counts.get(p["profile_level"], 0) + 1

    depts = {}
    for p in staff:
        depts[p["department"]] = depts.get(p["department"], 0) + 1

    # Mapping tree size, counted the same way in both scopes: root, then only
    # the CF domains, competencies and expertise areas that someone holds, then
    # one node per Level-3 tag. Unheld areas belong to the Gaps view, not here.
    held_areas = {m["expertise"] for m in matrix}
    held_comps = {t["code"] for t in taxonomy if t["expertise"] in held_areas}
    held_doms = {t["domain"] for t in taxonomy if t["expertise"] in held_areas}
    tree_nodes = 1 + len(held_doms) + len(held_comps) + len(held_areas) + len(fact)

    meta = {
        "people": len(staff),
        "departments": len(depts),
        "departmentCounts": depts,
        "domains": len({t["domain"] for t in taxonomy}),
        "competencies": len(competencies),
        "competenciesHeld": sum(1 for c in competencies if not c["behavioural"] and c["people"] > 0),
        "areas": len(taxonomy),
        "areasHeld": len(matrix),
        "tags": len(fact),
        "areaStatus": area_status,
        "competencyStatus": comp_status,
        "profileCounts": profile_counts,
        "highRisk": sum(1 for p in staff if p["risk_index"] >= 80),
        "moderateRisk": sum(1 for p in staff if 40 <= p["risk_index"] < 80),
        "lowRisk": sum(1 for p in staff if p["risk_index"] < 40),
        "withEmail": sum(1 for p in staff if p["email"]),
        "treeNodes": tree_nodes,
    }

    # `origin` records which retired domain each area came from. Only the
    # generated taxonomy document uses it, so it stays in data/taxonomy.json
    # and out of the browser bundle, which carries nothing a view cannot read.
    bundle_taxonomy = [{k: v for k, v in t.items() if k != "origin"} for t in taxonomy]

    out = {
        "meta": meta,
        "profileLevels": profile_levels,
        "profileNotes": profile_notes,
        "taxonomy": bundle_taxonomy,
        "competencies": competencies,
        "expertiseMatrix": matrix,
        "knowledgeGaps": gaps,
        "criticalHolders": critical,
        "interviewShortlist": shortlist,
    }

    def dump(name, obj):
        with open(os.path.join(ROOT, "data", name), "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)

    dump("taxonomy.json", taxonomy)
    dump("competencies.json", competencies)
    dump("expertise_matrix.json", matrix)
    dump("knowledge_gaps.json", gaps)
    dump("critical_holders.json", critical)
    dump("interview_shortlist.json", shortlist)
    dump("profile_levels.json",
         {"bands": profile_levels, "notes": profile_notes})
    dump("meta.json", meta)

    banner = (
        "/* Gulf CDC Portal — embedded dataset.\n"
        "   Generated by scripts/generate_data.py from\n"
        f"   data/{os.path.basename(SRC)}.\n"
        f"   Hybrid taxonomy: {meta['domains']} CF domains · "
        f"{meta['competencies']} competencies · {meta['areas']} expertise areas "
        f"· {meta['people']} staff. */\n"
    )
    with open(os.path.join(ROOT, "assets", "js", "data.js"), "w", encoding="utf-8") as f:
        f.write(banner + "window.GCDC_DATA = " + json.dumps(out, ensure_ascii=False, indent=2) + ";\n")

    write_taxonomy_doc(taxonomy, competencies, profile_levels, profile_notes, meta)

    print("Regenerated: assets/js/data.js and data/*.json")
    print(f"  people={meta['people']} departments={meta['departments']} tags={meta['tags']}")
    print(f"  areas={meta['areasHeld']}/{meta['areas']} "
          f"A/T/S/N={area_status['adequate']}/{area_status['thin']}/"
          f"{area_status['single']}/{area_status['noCore']}")
    print(f"  competencies held={meta['competenciesHeld']}/{meta['competencies']} "
          f"A/T/S/N/B={comp_status['adequate']}/{comp_status['thin']}/"
          f"{comp_status['single']}/{comp_status['noCore']}/{comp_status['behavioural']}")
    print(f"  profile={profile_counts} emails={meta['withEmail']}")


def write_taxonomy_doc(taxonomy, competencies, profile_levels, profile_notes, meta):
    """Write docs/HYBRID_TAXONOMY.md from the workbook, so the reference
    document can never drift from the data the page actually shows."""
    L = []
    w = L.append

    w("# The hybrid taxonomy")
    w("")
    w("<!-- Generated by scripts/generate_data.py. Edit the workbook, not this file. -->")
    w("")
    w("Both scopes of the Knowledge Mapping Page — Internal GCDC and the GCC")
    w("Network — are coded against one three-level structure:")
    w("")
    w(f"**{meta['domains']} CF domains** → **{meta['competencies']} CF competencies** "
      f"→ **{meta['areas']} Level-3 expertise areas**")
    w("")
    w("Levels 1 and 2 are the Gulf CDC Public Health Competency Framework, in its")
    w("own wording and numbering. Level 3 is this project's own layer: the")
    w("expertise areas staff and network members actually named in the survey,")
    w("each placed under exactly one competency.")
    w("")

    w("## 1. Framework fit")
    w("")
    w("Not every expertise area people named falls inside the Competency")
    w("Framework's scope. Rather than force them, each area carries a fit flag:")
    w("")
    fits = {}
    for t in taxonomy:
        fits[t["fit"]] = fits.get(t["fit"], 0) + 1
    w("| Framework Fit | Areas | Meaning |")
    w("|---|---|---|")
    meanings = {
        "Direct": "the area sits squarely inside the competency as the framework defines it",
        "Nearest fit — outside CF scope": "research, laboratory/clinical and workforce-education "
                                         "expertise the framework does not cover; placed under "
                                         "the closest competency and marked",
        "Added in v6 — CF coverage": "added so a competency the framework requires is not left "
                                     "without a Level-3 area",
    }
    for fit, n in sorted(fits.items(), key=lambda kv: -kv[1]):
        w(f"| {fit} | {n} | {meanings.get(fit, '')} |")
    w("")

    w("## 2. Counting rules")
    w("")
    w("People are coded at **Level 3 only**. Competency and domain figures roll")
    w("up from there, and someone who holds two areas under one competency counts")
    w("**once** for that competency — so competency holders are distinct people,")
    w("not expertise tags.")
    w("")
    w("An area counts only where it is held as **core** expertise — what someone")
    w("would be called on to do or teach — not mere awareness of the subject:")
    w("")
    w("| Holders | Status |")
    w("|---|---|")
    w("| 0 | \U0001F534 No core expert |")
    w("| 1 | \U0001F7E0 Single core expert (single point of failure) |")
    w("| 2 | \U0001F7E1 Thin coverage |")
    w("| 3 or more | \U0001F7E2 Adequate |")
    w("")
    behavioural = [c for c in competencies if c["behavioural"]]
    if behavioural:
        w("Two competencies are **behavioural**:")
        w("")
        for c in behavioural:
            w(f"- **{c['competency']}**")
        w("")
        w("They describe how someone works rather than a body of knowledge, so they")
        w("have no Level-3 area by design. They are reported as *Not mapped —")
        w("behavioural* in neutral grey and are **never counted as a gap**. That is")
        w(f"why {meta['competencies'] - len(behavioural)}, not {meta['competencies']}, "
          "competencies can carry holders.")
        w("")

    w("## 3. Profile Level")
    w("")
    w("Profile Level is the CF proficiency band. It is derived from the years of")
    w("experience each person reported in the survey, using the workbook's own")
    w("`Profile_Level_Rules` sheet — the portal never hard-codes the thresholds:")
    w("")
    w("| Years of experience | CF proficiency | Career stage | Depth score |")
    w("|---|---|---|---|")
    for p in profile_levels:
        w(f"| {p['years']} | {p['level']} | {p['stage']} | {p['depth']} |")
    w("")
    w("Where Profile Level is sorted or filtered, the order is")
    w("**Expert > Proficient > Competent**.")
    w("")
    for note in profile_notes:
        w(f"- {note}")
    if profile_notes:
        w("")

    w("## 4. From the old taxonomy to the CF domains")
    w("")
    w("The portal previously used 10 knowledge-management domains and 30")
    w("sub-domains of this project's own making. Every Level-3 area kept its")
    w("identity and moved under a CF competency; this table shows where each old")
    w("domain's areas ended up. An old domain can map to more than one CF domain,")
    w("which is the point of the move — the framework splits distinctions the old")
    w("structure ran together.")
    w("")
    origins = {}
    for t in taxonomy:
        old = (t.get("origin") or "").split("›")[0].strip()
        if not old:
            continue
        origins.setdefault(old, {})
        origins[old][t["domain"]] = origins[old].get(t["domain"], 0) + 1
    w("Two labels in the first column are not previous domains: *Portal taxonomy")
    w("review* marks the six areas created during the portal's own taxonomy")
    w("review, and *New in v6* the two added for CF coverage. Both are now part")
    w("of the workbook taxonomy like any other area.")
    w("")
    w("| Origin | CF domain(s) | Areas |")
    w("|---|---|---|")
    for old in sorted(origins, key=lambda k: (-sum(origins[k].values()), k)):
        total = sum(origins[old].values())
        targets = "<br>".join(
            f"{dom.split('–')[0].strip()} ({n})"
            for dom, n in sorted(origins[old].items(), key=lambda kv: kv[0])
        )
        w(f"| {old} | {targets} | {total} |")
    w("")

    w("## 5. The full structure")
    w("")
    w("Holder counts are **internal GCDC staff**; the GCC Network is counted")
    w("separately and never merged in. Areas with no core holder are the gaps,")
    w("listed in full on the page's Gaps tab.")
    w("")
    by_code = {c["code"]: c for c in competencies}
    current_domain = None
    for c in sorted(competencies, key=lambda c: tuple(int(x) for x in c["code"].split("."))):
        if c["domain"] != current_domain:
            current_domain = c["domain"]
            w(f"### {current_domain}")
            w("")
        areas = [t for t in taxonomy if t["code"] == c["code"]]
        if c["behavioural"]:
            w(f"**{c['competency']}** — not mapped (behavioural)")
            w("")
            continue
        w(f"**{c['competency']}** — {c['people']} holder(s) · "
          f"{c['areasHeld']}/{c['areasDefined']} areas held")
        w("")
        for t in areas:
            mark = "" if t["fit"] == "Direct" else f" *({t['fit']})*"
            n = t["holders_n"]
            if n == 0:
                count = "no core holder"
            elif n == 1:
                count = "1 holder (single core expert)"
            else:
                count = f"{n} holders"
            w(f"- {t['expertise']} — {count}{mark}")
        w("")

    unused = [c for c in by_code.values() if c["code"] not in {t["code"] for t in taxonomy}]
    if unused:
        w("Competencies with no Level-3 area defined: "
          + ", ".join(sorted(c["code"] for c in unused)))
        w("")

    path = os.path.join(ROOT, "docs", "HYBRID_TAXONOMY.md")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L).rstrip() + "\n")


if __name__ == "__main__":
    main()
