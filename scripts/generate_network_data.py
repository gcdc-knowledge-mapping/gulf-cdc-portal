#!/usr/bin/env python3
"""
Build the GCC Network dataset for the Knowledge Mapping Page.

Source of truth:
    data/GulfCDC_KnowledgeMapping_Network_MasterAnalysis_v3_CoreTaxonomy.xlsx

Writes:
    preview/network-data.js   (window.GCDC_NETWORK — embedded so file:// works)
    data/network/*.json       (same payload, one file per table)

The network population (PCN, Country Liaison Officers, Working Group members,
CEO-level) is kept in its own dataset object and is never merged with the
internal staff dataset in assets/js/data.js. The only place the two meet is the
"bridge" table, which compares holder counts per expertise area.

NETWORK_GROUP maps a respondent name to one of: CEO, PCN, CLO, WG.
The v3 workbook does not yet carry a constituency column, so until it does
every unmapped respondent is reported as "Unassigned".
"""

import json
import os
import re
import unicodedata

import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

SRC = os.path.join(
    ROOT, "data", "GulfCDC_KnowledgeMapping_Network_MasterAnalysis_v3_CoreTaxonomy.xlsx"
)
INTERNAL_MATRIX = os.path.join(ROOT, "data", "expertise_matrix.json")
OUT_JS = os.path.join(ROOT, "preview", "network-data.js")
OUT_DIR = os.path.join(ROOT, "data", "network")

# --- correction layers (same pattern as generate_data.py) --------------------

# name -> constituency. Fill in from the network roster, or add a "Network
# Group" column to 02_Master_Dataset and this layer becomes unnecessary.
NETWORK_GROUP = {}

GROUPS = [
    ("CEO", "CEO / Executive"),
    ("PCN", "Permanent Contact Network"),
    ("CLO", "Country Liaison Officers"),
    ("WG", "Working Group"),
]

STATE_CODE = {
    "Bahrain": "BH",
    "Kuwait": "KW",
    "Oman": "OM",
    "Qatar": "QA",
    "Saudi Arabia": "SA",
    "UAE": "AE",
}

STATES = list(STATE_CODE.keys())


def clean(v):
    if v is None:
        return ""
    s = str(v).replace("\xa0", " ").strip()
    return "" if s in {"·", "-", "—", "None", "nan"} else s


def num(v, default=0):
    try:
        return int(float(str(v).strip()))
    except (TypeError, ValueError):
        return default


def norm(s):
    s = unicodedata.normalize("NFKD", clean(s)).lower()
    s = re.sub(r"\b(dr|prof|mr|ms|mrs|eng)\.?\s+", "", s)
    return re.sub(r"[^a-z]+", "", s)


def header_row(rows, limit=8):
    best, count = 0, -1
    for i in range(min(limit, len(rows))):
        n = sum(1 for v in rows[i] if v is not None)
        if n > count:
            best, count = i, n
    return best


def table(ws):
    """Return (headers, list-of-dicts) for a sheet with a banner above the header."""
    rows = list(ws.iter_rows(values_only=True))
    hi = header_row(rows)
    hdr = [clean(v) for v in rows[hi]]
    out = []
    for r in rows[hi + 1 :]:
        if all(v is None or clean(v) == "" for v in r):
            continue
        out.append({h: r[i] for i, h in enumerate(hdr) if h})
    return hdr, out


def status_of(holders):
    if holders <= 0:
        return "No core expert", "critical"
    if holders == 1:
        return "Sole expert", "serious"
    if holders == 2:
        return "Thin", "warn"
    return "Adequate", "good"


def main():
    wb = openpyxl.load_workbook(SRC, data_only=True)

    # ---- people -----------------------------------------------------------
    _, master = table(wb["02_Master_Dataset"])
    people = []
    for r in master:
        name = clean(r.get("Name"))
        if not name:
            continue
        state = clean(r.get("Member State"))
        areas = [clean(r.get(f"Core {i}")) for i in (1, 2, 3)]
        areas = [a for a in areas if a]
        people.append(
            {
                "id": num(r.get("ID")),
                "name": name,
                "state": state,
                "code": STATE_CODE.get(state, ""),
                "entity": clean(r.get("Entity")),
                "track": clean(r.get("Track")),
                "level": clean(r.get("Position Level")),
                "years": clean(r.get("Years")),
                "background": clean(r.get("Primary Background")),
                "areas": areas,
                "soleAreas": num(r.get("Sole-Expert Areas (n)")),
                "external": clean(r.get("Externally Consulted")).lower().startswith("y"),
                "profile": clean(r.get("Profile Level")),
                "index": num(r.get("Expertise Index (1-125)")),
                "confidence": clean(r.get("Coding Confidence")),
                "group": NETWORK_GROUP.get(norm(name), ""),
            }
        )

    # ---- taxonomy with live network holder counts -------------------------
    _, tax_rows = table(wb["01_Taxonomy"])
    taxonomy = []
    for r in tax_rows:
        area = clean(r.get("Tier 3 – Expertise"))
        if not area:
            continue
        holders = num(r.get("Network Core Holders (n)"))
        label, cls = status_of(holders)
        taxonomy.append(
            {
                "domain": clean(r.get("Tier 1 – Domain")),
                "sub": clean(r.get("Tier 2 – Sub-Domain")),
                "area": area,
                "holders": holders,
                "states": num(r.get("Member States Covering")),
                "status": label,
                "cls": cls,
            }
        )

    # ---- member-state coverage -------------------------------------------
    _, cov_rows = table(wb["04_MemberState_Coverage"])
    coverage = []
    for r in cov_rows:
        area = clean(r.get("Tier 3 – Expertise"))
        domain = clean(r.get("Tier 1 – Domain"))
        # The sheet ends with three roll-up rows ("Respondents per Member
        # State", …) that carry no domain. They are not expertise areas.
        if not area or not domain:
            continue
        coverage.append(
            {
                "domain": domain,
                "area": area,
                "by": {s: num(r.get(s)) for s in STATES},
                "total": num(r.get("Total")),
                "states": num(r.get("States Covering")),
            }
        )

    # ---- gaps -------------------------------------------------------------
    _, gap_rows = table(wb["06_Knowledge_Gaps"])
    gaps = []
    for r in gap_rows:
        area = clean(r.get("Tier 3 – Expertise"))
        if not area:
            continue
        holders = num(r.get("Holders (n)"))
        label, cls = status_of(holders)
        gaps.append(
            {
                "domain": clean(r.get("Tier 1 – Domain")),
                "sub": clean(r.get("Tier 2 – Sub-Domain")),
                "area": area,
                "holders": holders,
                "states": num(r.get("States Covering")),
                "status": label,
                "cls": cls,
                "concentration": clean(r.get("Concentration")),
                "snapshot": clean(r.get("Holders (Name, State) — snapshot")),
                "recommendation": clean(r.get("Strategic Recommendation")),
            }
        )

    # ---- engagement plan --------------------------------------------------
    _, eng_rows = table(wb["07_Engagement_Plan"])
    engagement = []
    for r in eng_rows:
        name = clean(r.get("Name"))
        if not name:
            continue
        engagement.append(
            {
                "priority": clean(r.get("Priority")),
                "name": name,
                "state": clean(r.get("Member State")),
                "role": clean(r.get("Suggested Network Role")),
                "action": clean(r.get("Validation Action")),
                "focus": clean(r.get("Engagement Focus")),
            }
        )

    # ---- transferable skills ---------------------------------------------
    ws = wb["10_Transferable_Skills"]
    _, skill_rows = table(ws)
    skills = []
    for r in skill_rows:
        cat = clean(r.get("Skill Category"))
        if cat:
            skills.append({"skill": cat, "people": num(r.get("People (n)"))})
    skills.sort(key=lambda s: -s["people"])

    # ---- hierarchy --------------------------------------------------------
    rows = list(wb["08_Mapping_Hierarchy"].iter_rows(values_only=True))
    hi = header_row(rows)
    tree = []
    for r in rows[hi + 1 :]:
        label = clean(r[1])
        if not label:
            continue
        tree.append(
            {
                "level": num(r[0]),
                "label": re.sub(r"^[\s└─•]+", "", label).strip(),
                "type": clean(r[2]),
                "note": clean(r[3]),
            }
        )

    # ---- bridge: internal vs network per expertise area -------------------
    bridge = []
    if os.path.exists(INTERNAL_MATRIX):
        with open(INTERNAL_MATRIX, encoding="utf-8") as fh:
            internal = json.load(fh)
        internal_by_area = {}
        for row in internal:
            area = clean(row.get("expertise"))
            if area:
                internal_by_area[area] = row
        net_by_area = {t["area"]: t for t in taxonomy}
        for area in sorted(set(internal_by_area) | set(net_by_area)):
            irow = internal_by_area.get(area, {})
            ih = num(irow.get("holders_n"), 0)
            nrow = net_by_area.get(area, {})
            nh = num(nrow.get("holders"), 0)
            ilabel, icls = status_of(ih)
            nlabel, ncls = status_of(nh)
            if ih <= 1 and nh >= 2:
                verdict, vcls = "Network covers the gap", "good"
            elif ih <= 1 and nh == 1:
                verdict, vcls = "One regional holder only", "warn"
            elif ih <= 1 and nh == 0:
                verdict, vcls = "Gap on both sides", "critical"
            elif nh == 0:
                verdict, vcls = "Internal only", "neutral"
            else:
                verdict, vcls = "Covered both sides", "good"
            bridge.append(
                {
                    "domain": clean(nrow.get("domain") or irow.get("domain")),
                    "area": area,
                    "internal": ih,
                    "internalStatus": ilabel,
                    "internalCls": icls,
                    "network": nh,
                    "networkStatus": nlabel,
                    "networkCls": ncls,
                    "verdict": verdict,
                    "verdictCls": vcls,
                }
            )

    # ---- rollups ----------------------------------------------------------
    by_state = []
    for s in STATES:
        members = [p for p in people if p["state"] == s]
        by_state.append(
            {
                "state": s,
                "code": STATE_CODE[s],
                "people": len(members),
                "tags": sum(len(p["areas"]) for p in members),
                "areas": len({a for p in members for a in p["areas"]}),
            }
        )
    by_state.sort(key=lambda d: -d["people"])

    by_domain = {}
    for t in taxonomy:
        d = by_domain.setdefault(
            t["domain"],
            {"domain": t["domain"], "areas": 0, "covered": 0, "good": 0, "warn": 0, "serious": 0, "critical": 0},
        )
        d["areas"] += 1
        if t["holders"] > 0:
            d["covered"] += 1
        d[t["cls"]] += 1
    by_domain = sorted(by_domain.values(), key=lambda d: -d["covered"])

    by_group = []
    for key, label in GROUPS:
        members = [p for p in people if p["group"] == key]
        by_group.append({"key": key, "label": label, "people": len(members)})
    unassigned = [p for p in people if not p["group"]]
    if unassigned:
        by_group.append({"key": "", "label": "Unassigned", "people": len(unassigned)})

    counts = {"good": 0, "warn": 0, "serious": 0, "critical": 0}
    for t in taxonomy:
        counts[t["cls"]] += 1

    meta = {
        "people": len(people),
        "states": len({p["state"] for p in people if p["state"]}),
        "tags": sum(len(p["areas"]) for p in people),
        "areas": len(taxonomy),
        "covered": sum(1 for t in taxonomy if t["holders"] > 0),
        "adequate": counts["good"],
        "thin": counts["warn"],
        "sole": counts["serious"],
        "noCore": counts["critical"],
        "external": sum(1 for p in people if p["external"]),
        "critical": sum(1 for p in people if p["index"] >= 60),
        "focalPoints": sum(1 for e in engagement if e["priority"] == "P1"),
        "grouped": sum(1 for p in people if p["group"]),
    }

    payload = {
        "meta": meta,
        "groups": [{"key": k, "label": l} for k, l in GROUPS],
        "people": people,
        "taxonomy": taxonomy,
        "coverage": coverage,
        "gaps": gaps,
        "skills": skills,
        "tree": tree,
        "bridge": bridge,
        "byState": by_state,
        "byDomain": by_domain,
        "byGroup": by_group,
        "states": [{"name": s, "code": STATE_CODE[s]} for s in STATES],
    }

    os.makedirs(os.path.dirname(OUT_JS), exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)

    with open(OUT_JS, "w", encoding="utf-8") as fh:
        fh.write("/* Generated by scripts/generate_network_data.py — do not edit by hand. */\n")
        fh.write("window.GCDC_NETWORK = ")
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
        fh.write(";\n")

    for key, value in payload.items():
        with open(os.path.join(OUT_DIR, f"{key}.json"), "w", encoding="utf-8") as fh:
            json.dump(value, fh, ensure_ascii=False, indent=2)

    # The engagement plan names who to approach and in what order. It is written
    # for local use only — never bundled into network-data.js, and git-ignored —
    # until the repository is private and the site is behind Entra ID sign-in.
    with open(os.path.join(OUT_DIR, "engagement.json"), "w", encoding="utf-8") as fh:
        json.dump(engagement, fh, ensure_ascii=False, indent=2)

    print(f"people={meta['people']} states={meta['states']} areas={meta['areas']} "
          f"covered={meta['covered']} bridge={len(bridge)} grouped={meta['grouped']}")
    print(f"wrote {OUT_JS}")


if __name__ == "__main__":
    main()
