#!/usr/bin/env python3
"""
Assert the Knowledge Mapping headline numbers.

Run after either generator. Every figure below is the one agreed in the
hybrid-taxonomy brief (§7); if the workbooks are revised, update this file in
the same commit as the new workbook so the two never drift apart silently.

    python3 scripts/check_counts.py
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

EXPECTED = {
    # The internal figures are the brief's §7 table plus Manaf Alqahtani, Gulf
    # CDC's CEO, whom the project owner asked on 2026-11-04 to show in the
    # internal mapping as well as the network one (see CROSS_LISTED in
    # generate_data.py). He answered the GCC Network survey, so the internal
    # workbook has no record for him. §7 read 30 staff, 99 tags, 57/65 areas,
    # 10·11·36·8 and 183 nodes; he adds four Level-3 tags, one of which
    # — Public Health Microbiology & Genomics — had no internal holder at all.
    "internal": {
        "people": 31,
        "departments": 5,
        "departmentCounts": {"CEO Office": 3, "PHE": 4, "HI": 9, "PHPP": 10, "TCB": 5},
        "domains": 7,
        "competencies": 23,
        "competenciesHeld": 19,
        "areas": 65,
        "areasHeld": 58,
        "tags": 103,
        "areaStatus": {"adequate": 11, "thin": 10, "single": 37, "noCore": 7},
        "competencyStatus": {"adequate": 12, "thin": 2, "single": 5,
                             "noCore": 2, "behavioural": 2},
        "profileCounts": {"Expert": 9, "Proficient": 5, "Competent": 17},
        "highRisk": 9,
        "moderateRisk": 12,
        "lowRisk": 10,
        "treeNodes": 188,
    },
    "network": {
        "people": 68,
        "states": 6,
        "domains": 7,
        "competencies": 23,
        "competenciesHeld": 20,
        "areas": 65,
        "covered": 52,
        "tags": 193,
        "adequate": 25,
        "thin": 11,
        "sole": 16,
        "noCore": 13,
        "competencyStatus": {"good": 13, "warn": 0, "serious": 7,
                             "critical": 1, "behavioural": 2},
        "profileCounts": {"Expert": 58, "Proficient": 5, "Competent": 5},
        "critical": 29,
        "focalPoints": 9,
        "external": 49,
        "treeNodes": 273,
    },
}

failures = []
checks = 0


def load(path):
    full = os.path.join(ROOT, path)
    if not os.path.exists(full):
        failures.append(f"missing {path} — run the generators first")
        return None
    with open(full, encoding="utf-8") as fh:
        return json.load(fh)


def check(scope, field, want, got):
    global checks
    checks += 1
    if got == want:
        print(f"  ok    {scope:8} {field:20} {got}")
    else:
        print(f"  FAIL  {scope:8} {field:20} expected {want}, got {got}")
        failures.append(f"{scope}.{field}: expected {want}, got {got}")


def check_meta(scope, path):
    meta = load(path)
    if meta is None:
        return
    for field, want in EXPECTED[scope].items():
        check(scope, field, want, meta.get(field))


def check_derived():
    """Recount the key figures from the tables, not just the meta summary."""
    global checks

    tx = load("data/taxonomy.json")
    comps = load("data/competencies.json")
    matrix = load("data/expertise_matrix.json")
    if tx and comps and matrix:
        checks += 1
        rows = len(tx)
        if rows != 65:
            failures.append(f"internal taxonomy has {rows} rows, expected 65")
            print(f"  FAIL  internal taxonomy rows      expected 65, got {rows}")
        else:
            print(f"  ok    internal taxonomy rows      {rows}")
        check("internal", "competency rows", 23, len(comps))
        check("internal", "matrix rows (held)", 58, len(matrix))
        # a person tagged twice under one competency is one holder, not two
        tagged = sum(len(m["holders"]) for m in matrix)
        check("internal", "tags via matrix", 103, tagged)
        behavioural = sorted(c["code"] for c in comps if c.get("behavioural"))
        check("internal", "behavioural codes", ["7.3", "7.5"], behavioural)

    people = load("data/network/people.json")
    ntx = load("data/network/taxonomy.json")
    ncomps = load("data/network/competencies.json")
    ncov = load("data/network/competencyCoverage.json")
    tree = load("data/network/tree.json")
    if people and ntx and ncomps and ncov and tree:
        check("network", "people rows", 68, len(people))
        check("network", "taxonomy rows", 65, len(ntx))
        check("network", "competency rows", 23, len(ncomps))
        check("network", "competency coverage", 23, len(ncov))
        check("network", "tree rows", 273, len(tree))
        check("network", "tags via people", 193, sum(len(p["areas"]) for p in people))
        behavioural = sorted(c["code"] for c in ncomps if c.get("behavioural"))
        check("network", "behavioural codes", ["7.3", "7.5"], behavioural)
        # the behavioural competencies must never be reported as a gap
        for c in ncomps:
            if c.get("behavioural"):
                checks += 1
                if c["status"] != "Not mapped — behavioural" or c["cls"] != "neutral":
                    msg = f"network competency {c['code']} is flagged as a gap"
                    failures.append(msg)
                    print(f"  FAIL  {msg}")
                else:
                    print(f"  ok    network  {c['code']} behavioural, neutral")

    # The two scopes stay separate datasets. Exactly one person is listed in
    # both, by the owner's decision, and the check names him rather than
    # allowing any overlap to pass unnoticed.
    CROSS_LISTED = {"Manaf Alqahtani"}
    if people and load("data/critical_holders.json") is not None:
        staff = {p["name"] for p in load("data/critical_holders.json")}
        overlap = staff & {p["name"] for p in people}
        checks += 1
        if overlap == CROSS_LISTED:
            print(f"  ok    scopes    only the cross-listed staff appear in both: "
                  f"{sorted(overlap)}")
        else:
            unexpected = overlap - CROSS_LISTED
            missing = CROSS_LISTED - overlap
            msg = (f"cross-listing is not as declared — unexpected: {sorted(unexpected)}, "
                   f"missing: {sorted(missing)}")
            failures.append(msg)
            print(f"  FAIL  {msg}")


def check_bundles():
    """The browser bundles must not carry fields no view reads."""
    global checks
    forbidden = {
        "assets/js/network-data.js": ["Engagement Focus", "Validation Action",
                                      "Suggested Network Role", "Coding Log"],
        "assets/js/data.js": ["Coding Log", "Interview Question", "Coding Source"],
    }
    for path, words in forbidden.items():
        full = os.path.join(ROOT, path)
        if not os.path.exists(full):
            failures.append(f"missing {path}")
            continue
        with open(full, encoding="utf-8") as fh:
            blob = fh.read()
        for word in words:
            checks += 1
            if word in blob:
                msg = f"{path} contains {word!r}"
                failures.append(msg)
                print(f"  FAIL  {msg}")
            else:
                print(f"  ok    bundle    {os.path.basename(path)} has no {word!r}")


def main():
    print("Internal scope")
    check_meta("internal", "data/meta.json")
    print("GCC Network scope")
    check_meta("network", "data/network/meta.json")
    print("Recounted from the tables")
    check_derived()
    print("Bundle contents")
    check_bundles()

    print()
    if failures:
        print(f"{len(failures)} of {checks} checks failed:")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    print(f"all {checks} checks passed")


if __name__ == "__main__":
    main()
