#!/usr/bin/env python3
"""
Build the GCC Network dataset for the Knowledge Mapping Page.

Source of truth:
    data/GulfCDC_KnowledgeMapping_Network_MasterAnalysis_v8_HybridTaxonomy.xlsx
    data/Knowledge_Mapping_Survey_GCDC_Network.xlsx   (work e-mails, joined on ID)

Writes:
    assets/js/network-data.js   (window.GCDC_NETWORK — embedded so file:// works)
    data/network/*.json         (the same payload, one file per table)

The workbook is the single source of truth: the taxonomy-review additions and
every expertise edit now live inside it, so no correction layer remains here.

The network population is never merged with the internal staff dataset. The one
place the two meet is data/network/bridge.json, which is written for reference
and is not bundled into the page.
"""

import json
import os
import re

import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

SRC = os.path.join(
    ROOT, "data", "GulfCDC_KnowledgeMapping_Network_MasterAnalysis_v8_HybridTaxonomy.xlsx"
)
SURVEY = os.path.join(ROOT, "data", "Knowledge_Mapping_Survey_GCDC_Network.xlsx")
EMAILS = os.path.join(ROOT, "data", "network_emails.json")
INTERNAL_MATRIX = os.path.join(ROOT, "data", "expertise_matrix.json")
INTERNAL_COMPS = os.path.join(ROOT, "data", "competencies.json")
OUT_JS = os.path.join(ROOT, "assets", "js", "network-data.js")
OUT_DIR = os.path.join(ROOT, "data", "network")

STATE_CODE = {
    "Bahrain": "BH", "Kuwait": "KW", "Oman": "OM",
    "Qatar": "QA", "Saudi Arabia": "SA", "UAE": "AE",
}
# Column order requested for the Member States view, left to right.
STATE_ORDER = ["UAE", "Bahrain", "Saudi Arabia", "Oman", "Qatar", "Kuwait"]
STATE_LABEL = {
    "UAE": "United Arab Emirates", "Bahrain": "Bahrain",
    "Saudi Arabia": "Saudi Arabia", "Oman": "Oman",
    "Qatar": "Qatar", "Kuwait": "Kuwait",
}
STATES = STATE_ORDER

# Competencies 7.3 and 7.5 are behavioural: no Level-3 area, never a gap.
BEHAVIOURAL = {"7.3", "7.5"}


# Free-text answers sometimes hold two addresses, a work one and a personal one.
# A directory should show the work address, so the consumer providers are listed
# here and an address on one of them is only used when it is all there is.
CONSUMER_MAIL = {
    "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "hotmail.co.uk",
    "live.com", "yahoo.com", "yahoo.co.uk", "icloud.com", "me.com", "aol.com",
}
ADDRESS_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


def pick_address(raw):
    """One address from a cell that may hold several, work address preferred.

    Returns "" when nothing in the cell is a syntactically valid address, so a
    typo reaches the page as a blank rather than as a broken mailto: link.
    """
    found = [p for p in re.split(r"[\s,;]+", s(raw)) if ADDRESS_RE.match(p)]
    if not found:
        return ""
    for a in found:
        if a.split("@")[-1].lower() not in CONSUMER_MAIL:
            return a
    return found[0]


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


def table(wb, sheet, header_row):
    data = list(wb[sheet].iter_rows(values_only=True))
    head = [s(c) for c in data[header_row - 1]]
    out = []
    for r in data[header_row:]:
        if all(c is None for c in r):
            continue
        out.append({h: r[i] for i, h in enumerate(head) if h})
    return out


def status_of(n):
    if n <= 0:
        return "No core expert", "critical"
    if n == 1:
        return "Single core expert", "serious"
    if n == 2:
        return "Thin", "warn"
    return "Adequate", "good"


def emails_by_id():
    """Respondent ID -> official e-mail.

    Preferred source is the raw survey export, joined on the respondent ID.
    The export carries verbatim answers for named officials of six foreign
    health authorities, so it is not kept in the repository; when it is absent
    the addresses already extracted from it are read from data/network_emails.json
    instead. Either way the join is on ID, with an exact-name fallback, and the
    run prints who is left without an address.
    """
    if os.path.exists(SURVEY):
        ws = openpyxl.load_workbook(SURVEY, data_only=True)["Sheet1"]
        data = list(ws.iter_rows(values_only=True))
        head = [s(c) for c in data[0]]
        try:
            i_id, i_mail = head.index("ID"), head.index("Official email")
            i_name = head.index("Name") if "Name" in head else None
        except ValueError:
            print("note: survey export has no ID / Official email column")
            return {}, {}
        by_id, by_name, rejected = {}, {}, []
        for r in data[1:]:
            rid, mail = num(r[i_id], -1), pick_address(r[i_mail])
            if not mail:
                if s(r[i_mail]):
                    rejected.append(f"id {rid}: {s(r[i_mail])!r}")
                continue
            if rid >= 0:
                by_id[rid] = mail
            if i_name is not None and s(r[i_name]):
                by_name[s(r[i_name])] = mail
        print(f"e-mails: {os.path.basename(SURVEY)} ({len(by_id)} addresses)")
        for rj in rejected:
            print(f"  note: not a valid e-mail address, left blank — {rj}")
        return by_id, by_name

    if os.path.exists(EMAILS):
        with open(EMAILS, encoding="utf-8") as fh:
            rows = json.load(fh)
        by_id = {num(r["id"], -1): r["email"] for r in rows if r.get("email")}
        by_name = {s(r.get("name")): r["email"] for r in rows if r.get("email")}
        print(f"e-mails: {os.path.basename(EMAILS)} ({len(by_id)} addresses) "
              "— survey export not present")
        return by_id, by_name

    print("note: no e-mail source found — e-mails omitted")
    return {}, {}


def main():
    wb = openpyxl.load_workbook(SRC, data_only=True)
    mail_by_id, mail_by_name = emails_by_id()

    # ---- profile-level rules ----------------------------------------------
    # The sheet lists the bands first, then explanatory bullet rows that reuse
    # the same first column. Only rows naming a proficiency level are bands.
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

    # ---- taxonomy ----------------------------------------------------------
    taxonomy = []
    for r in table(wb, "01_Taxonomy", 4):
        area = s(r.get("Level 3 – Expertise Area"))
        if not area:
            continue
        competency = s(r.get("Level 2 – CF Competency"))
        holders = num(r.get("Area Holders (n)"))
        label, cls = status_of(holders)
        taxonomy.append({
            "domain": s(r.get("Level 1 – CF Domain")),
            "code": s(r.get("Code")),
            "competency": competency,
            "sub": competency,          # back-compatible with existing views
            "area": area,
            "fit": s(r.get("Framework Fit")),
            "origin": s(r.get("Origin (Core Taxonomy domain › sub-domain)")),
            "holders": holders,
            "states": num(r.get("Member States Covering")),
            "status": label, "cls": cls,
        })

    # ---- people ------------------------------------------------------------
    stage_of_level = {p["level"]: p["stage"] for p in profile_levels}
    people = []
    for r in table(wb, "02_Master_Dataset", 4):
        name = s(r.get("Name"))
        if not name:
            continue
        state = s(r.get("Member State"))
        areas = [s(r.get(f"L3 Expertise Area {i}")) for i in range(1, 6)]
        areas = [a for a in areas if a]
        level = s(r.get("Profile Level (CF)"))
        rid = num(r.get("ID"))
        people.append({
            "id": rid,
            "name": name,
            "state": state,
            "code": STATE_CODE.get(state, ""),
            "entity": s(r.get("Entity")),
            "track": s(r.get("Track")),
            "level": s(r.get("Position Level")),
            "years": s(r.get("Years")),
            "background": s(r.get("Primary Background")),
            "areas": areas,
            "competencies": [c for c in
                             (x.strip() for x in s(r.get("L2 CF Competencies (rolled up)")).split(";"))
                             if c],
            "soleAreas": num(r.get("Sole-Expert Areas (n)")),
            "external": s(r.get("Externally Consulted")).lower().startswith("y"),
            "profile": level,
            "stage": s(r.get("CF Career Stage")) or stage_of_level.get(level, ""),
            "index": num(r.get("Expertise Index (1-125)")),
            "confidence": s(r.get("Coding Confidence")),
            "email": mail_by_id.get(rid) or mail_by_name.get(name, ""),
        })

    # ---- long table --------------------------------------------------------
    fact = [f for f in table(wb, "Fact_CoreExpertise", 1) if s(f.get("Name"))]
    by_name = {p["name"]: p for p in people}

    # areas each person is the network's only holder of
    holders_by_area = {}
    for f in fact:
        area, nm = s(f.get("L3 – Expertise Area")), s(f.get("Name"))
        if area and nm:
            holders_by_area.setdefault(area, []).append(nm)
    sole_by_name = {}
    for area, who in holders_by_area.items():
        if len(who) == 1:
            sole_by_name.setdefault(who[0], []).append(area)
    for p in people:
        p["soleList"] = sorted(sole_by_name.get(p["name"], []))
        p["soleAreas"] = len(p["soleList"])

    # ---- competencies: distinct people ------------------------------------
    people_per_comp, tags_per_comp, states_per_comp = {}, {}, {}
    for f in fact:
        code, nm = s(f.get("Code")), s(f.get("Name"))
        if not code or not nm:
            continue
        tags_per_comp[code] = tags_per_comp.get(code, 0) + 1
        people_per_comp.setdefault(code, set()).add(nm)
        st = by_name.get(nm, {}).get("state", "")
        if st:
            states_per_comp.setdefault(code, set()).add(st)

    competencies = []
    for r in table(wb, "06_Competency_Coverage", 4):
        code = s(r.get("Code"))
        if not code:
            continue
        behavioural = code in BEHAVIOURAL
        n = len(people_per_comp.get(code, ()))
        label, cls = status_of(n)
        competencies.append({
            "domain": s(r.get("L1 – CF Domain")),
            "code": code,
            "competency": s(r.get("L2 – CF Competency")),
            "areasDefined": num(r.get("L3 Areas Defined")),
            "areasHeld": num(r.get("L3 Areas Held")),
            "people": n,
            "tags": tags_per_comp.get(code, 0),
            "states": len(states_per_comp.get(code, ())),
            "status": "Not mapped — behavioural" if behavioural else label,
            "cls": "neutral" if behavioural else cls,
            "behavioural": behavioural,
            "recommendation": s(r.get("Strategic Recommendation")),
        })

    # ---- coverage: areas by state, and competencies by state --------------
    coverage = []
    for t in taxonomy:
        who = holders_by_area.get(t["area"], [])
        by = {st: sum(1 for nm in who if by_name.get(nm, {}).get("state") == st) for st in STATES}
        coverage.append({
            "domain": t["domain"], "code": t["code"], "competency": t["competency"],
            "area": t["area"], "by": by, "total": len(who),
            "states": sum(1 for v in by.values() if v),
        })

    comp_people_state = {}
    for f in fact:
        code, nm = s(f.get("Code")), s(f.get("Name"))
        st = by_name.get(nm, {}).get("state", "")
        if code and nm and st:
            comp_people_state.setdefault(code, {}).setdefault(st, set()).add(nm)

    competency_coverage = []
    for c in competencies:
        per = comp_people_state.get(c["code"], {})
        by = {st: len(per.get(st, ())) for st in STATES}
        competency_coverage.append({
            "domain": c["domain"], "code": c["code"], "competency": c["competency"],
            "by": by, "total": sum(by.values()),
            "states": sum(1 for v in by.values() if v),
            "behavioural": c["behavioural"],
        })

    # ---- tree: Root -> domain -> competency -> area -> holder -------------
    domains = []
    for t in taxonomy:
        if t["domain"] not in domains:
            domains.append(t["domain"])
    comp_order = []
    for t in taxonomy:
        key = (t["domain"], t["code"], t["competency"])
        if key not in comp_order:
            comp_order.append(key)

    tree = [{"level": 0, "label": "GCC Network", "type": "ROOT",
             "note": f"{len(people)} experts · {len({p['state'] for p in people})} Member States"}]
    for dom in domains:
        dom_areas = [t for t in taxonomy if t["domain"] == dom and t["holders"] > 0]
        if not dom_areas:
            continue
        tree.append({"level": 1, "label": dom, "type": "CF Domain (Level 1)",
                     "note": f"{len(dom_areas)} area(s) held"})
        for d2, code, comp in comp_order:
            if d2 != dom:
                continue
            comp_areas = [t for t in dom_areas if t["code"] == code]
            if not comp_areas:
                continue
            tree.append({"level": 2, "label": comp, "type": "CF Competency (Level 2)",
                         "note": f"{len(people_per_comp.get(code, ()))} holder(s)"})
            for t in comp_areas:
                who = sorted(holders_by_area.get(t["area"], []))
                note = f"{len(who)} holder(s) · {t['states']} state(s)"
                if len(who) == 1:
                    note += " · SINGLE CORE EXPERT"
                tree.append({"level": 3, "label": t["area"],
                             "type": "Expertise Area (Level 3)", "note": note})
                for nm in who:
                    cc = by_name.get(nm, {}).get("code", "")
                    tree.append({"level": 4, "label": f"{nm} ({cc})",
                                 "type": "Holder", "note": ""})

    # ---- roll-ups ----------------------------------------------------------
    by_state = []
    for st in STATES:
        members = [p for p in people if p["state"] == st]
        by_state.append({
            "state": st, "label": STATE_LABEL[st], "code": STATE_CODE[st],
            "people": len(members),
            "tags": sum(len(p["areas"]) for p in members),
            "areas": len({a for p in members for a in p["areas"]}),
        })

    by_domain = []
    for dom in domains:
        areas = [t for t in taxonomy if t["domain"] == dom]
        comps = [c for c in competencies if c["domain"] == dom]
        live = [c for c in comps if not c["behavioural"]]
        by_domain.append({
            "domain": dom,
            "areas": len(areas),
            "covered": sum(1 for t in areas if t["holders"] > 0),
            "competencies": len(comps),
            "competenciesHeld": sum(1 for c in live if c["people"] > 0),
            "good": sum(1 for t in areas if t["cls"] == "good"),
            "warn": sum(1 for t in areas if t["cls"] == "warn"),
            "serious": sum(1 for t in areas if t["cls"] == "serious"),
            "critical": sum(1 for t in areas if t["cls"] == "critical"),
        })

    area_counts = {"good": 0, "warn": 0, "serious": 0, "critical": 0}
    for t in taxonomy:
        area_counts[t["cls"]] += 1
    comp_counts = {"good": 0, "warn": 0, "serious": 0, "critical": 0, "behavioural": 0}
    for c in competencies:
        comp_counts["behavioural" if c["behavioural"] else c["cls"]] += 1

    profile_counts = {}
    for p in people:
        profile_counts[p["profile"]] = profile_counts.get(p["profile"], 0) + 1

    # ---- engagement plan (reference only, never bundled) ------------------
    engagement = []
    for r in table(wb, "08_Engagement_Plan", 4):
        nm = s(r.get("Name"))
        if not nm:
            continue
        engagement.append({
            "priority": s(r.get("Priority")), "name": nm,
            "state": s(r.get("Member State")),
            "role": s(r.get("Suggested Network Role")),
            "action": s(r.get("Validation Action")),
            "focus": s(r.get("Engagement Focus")),
        })

    meta = {
        "people": len(people),
        "states": len({p["state"] for p in people if p["state"]}),
        "domains": len(domains),
        "competencies": len(competencies),
        "competenciesHeld": sum(1 for c in competencies if not c["behavioural"] and c["people"] > 0),
        "areas": len(taxonomy),
        "covered": sum(1 for t in taxonomy if t["holders"] > 0),
        "tags": len(fact),
        "adequate": area_counts["good"], "thin": area_counts["warn"],
        "sole": area_counts["serious"], "noCore": area_counts["critical"],
        "competencyStatus": comp_counts,
        "profileCounts": profile_counts,
        "soleExperts": sum(1 for p in people if p["soleAreas"] > 0),
        "external": sum(1 for p in people if p["external"]),
        "critical": sum(1 for p in people if p["index"] >= 60),
        "focalPoints": sum(1 for e in engagement if e["priority"] == "P1"),
        "withEmail": sum(1 for p in people if p["email"]),
        "treeNodes": len(tree),
    }

    # ---- bridge: internal vs network, at both levels (not bundled) --------
    bridge = {"areas": [], "competencies": []}
    if os.path.exists(INTERNAL_MATRIX):
        with open(INTERNAL_MATRIX, encoding="utf-8") as fh:
            internal_areas = {s(r.get("expertise")): num(r.get("holders_n")) for r in json.load(fh)}
        for t in taxonomy:
            ih, nh = internal_areas.get(t["area"], 0), t["holders"]
            bridge["areas"].append({
                "domain": t["domain"], "code": t["code"], "area": t["area"],
                "internal": ih, "network": nh, "verdict": verdict_for(ih, nh),
            })
    if os.path.exists(INTERNAL_COMPS):
        with open(INTERNAL_COMPS, encoding="utf-8") as fh:
            internal_comps = {s(r.get("code")): (num(r.get("people")), bool(r.get("behavioural")))
                              for r in json.load(fh)}
        for c in competencies:
            ih, beh = internal_comps.get(c["code"], (0, c["behavioural"]))
            bridge["competencies"].append({
                "domain": c["domain"], "code": c["code"], "competency": c["competency"],
                "internal": ih, "network": c["people"],
                "verdict": "Behavioural — not mapped" if (beh or c["behavioural"])
                           else verdict_for(ih, c["people"]),
            })

    payload = {
        "meta": meta,
        "profileLevels": profile_levels,
        "profileNotes": profile_notes,
        "people": people,
        "taxonomy": taxonomy,
        "competencies": competencies,
        "coverage": coverage,
        "competencyCoverage": competency_coverage,
        "tree": tree,
        "byState": by_state,
        "byDomain": by_domain,
        "states": [{"name": st, "label": STATE_LABEL[st], "code": STATE_CODE[st],
                    "flag": STATE_CODE[st].lower() + ".svg"} for st in STATE_ORDER],
    }

    os.makedirs(os.path.dirname(OUT_JS), exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)

    with open(OUT_JS, "w", encoding="utf-8") as fh:
        fh.write("/* Generated by scripts/generate_network_data.py — do not edit by hand.\n"
                 "   Hybrid taxonomy: 7 CF domains · 23 competencies · 65 expertise areas"
                 f" · {len(people)} experts. */\n")
        fh.write("window.GCDC_NETWORK = ")
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
        fh.write(";\n")

    for key, value in payload.items():
        with open(os.path.join(OUT_DIR, f"{key}.json"), "w", encoding="utf-8") as fh:
            json.dump(value, fh, ensure_ascii=False, indent=2)

    # written for reference; no view reads them, so they stay out of the bundle
    for name, value in (("bridge", bridge), ("engagement", engagement)):
        with open(os.path.join(OUT_DIR, f"{name}.json"), "w", encoding="utf-8") as fh:
            json.dump(value, fh, ensure_ascii=False, indent=2)

    print(f"wrote {OUT_JS}")
    print(f"  people={meta['people']} states={meta['states']} tags={meta['tags']}")
    print(f"  areas={meta['covered']}/{meta['areas']} "
          f"A/T/S/N={area_counts['good']}/{area_counts['warn']}/"
          f"{area_counts['serious']}/{area_counts['critical']}")
    print(f"  competencies held={meta['competenciesHeld']}/{meta['competencies']} "
          f"A/T/S/N/B={comp_counts['good']}/{comp_counts['warn']}/"
          f"{comp_counts['serious']}/{comp_counts['critical']}/{comp_counts['behavioural']}")
    print(f"  profile={profile_counts} external={meta['external']} "
          f"index>=60={meta['critical']} P1={meta['focalPoints']}")
    print(f"  tree nodes={meta['treeNodes']} emails={meta['withEmail']}/{len(people)}")
    missing = [f"{p['id']} {p['name']} ({p['state']})" for p in people if not p["email"]]
    if missing:
        print(f"  no e-mail on file for {len(missing)}:")
        for m in missing:
            print(f"    - {m}")


def verdict_for(internal, network):
    if internal <= 1 and network >= 2:
        return "Network covers the gap"
    if internal <= 1 and network == 1:
        return "One regional holder only"
    if internal <= 1 and network == 0:
        return "Gap on both sides"
    if network == 0:
        return "Internal only"
    return "Covered both sides"


if __name__ == "__main__":
    main()
