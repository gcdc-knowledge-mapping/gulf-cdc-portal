/* ===========================================================================
   GCC Network space — design view (prototype).
   Mirrors the conventions of assets/js/app.js: one IIFE, delegated handlers
   assigned with el.onclick (never addEventListener — views re-render), and no
   inline event handlers so the production CSP stays satisfied.
   =========================================================================== */
(function () {
  "use strict";

  var D = window.GCDC_NETWORK || {};
  var PEOPLE = D.people || [];
  var TAX = D.taxonomy || [];
  var COV = D.coverage || [];
  var GAPS = D.gaps || [];
  var BRIDGE = D.bridge || [];
  var TREE = D.tree || [];
  var STATES = D.states || [];
  var M = D.meta || {};

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function pill(cls, label, icon) {
    return '<span class="pill pill--' + cls + '"><span class="pill__dot"></span>' +
      (icon ? esc(icon) + " " : "") + esc(label) + "</span>";
  }
  function announce(msg) { var l = $("#live"); if (l) l.textContent = msg; }

  function initials(name) {
    var parts = String(name).replace(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i, "").trim().split(/\s+/);
    return ((parts[0] || "")[0] || "") + ((parts[parts.length - 1] || "")[0] || "");
  }

  function donut(segments, opts) {
    opts = opts || {};
    var total = segments.reduce(function (a, s) { return a + s.value; }, 0) || 1;
    var R = 52, C = 2 * Math.PI * R, cx = 60, cy = 60, sw = 18, off = 0;
    var arcs = segments.filter(function (s) { return s.value > 0; }).map(function (s) {
      var len = (s.value / total) * C;
      var seg = '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="' + s.color +
        '" stroke-width="' + sw + '" stroke-dasharray="' + (len - 2) + " " + (C - len + 2) +
        '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 ' + cx + " " + cy + ')"></circle>';
      off += len;
      return seg;
    }).join("");
    var center = opts.centerNum != null
      ? '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" class="donut-center__num">' + opts.centerNum + "</text>" +
        '<text x="' + cx + '" y="' + (cy + 15) + '" text-anchor="middle" class="donut-center__lbl">' + esc(opts.centerLbl || "") + "</text>"
      : "";
    return '<svg viewBox="0 0 120 120" width="150" height="150" class="chart" role="img" aria-label="' +
      esc(opts.aria || "chart") + '"><circle cx="' + cx + '" cy="' + cy + '" r="' + R +
      '" fill="none" stroke="var(--surface-2)" stroke-width="' + sw + '"></circle>' + arcs + center + "</svg>";
  }
  function legend(items) {
    return '<div class="legend">' + items.map(function (i) {
      return '<span class="legend__item"><span class="legend__swatch" style="background:' + i.color +
        '"></span>' + esc(i.label) + ' <b style="color:var(--ink)">' + i.value + "</b></span>";
    }).join("") + "</div>";
  }
  function rankedBars(items, max) {
    return '<div class="bars">' + items.map(function (it) {
      return '<div class="bar-row"><span class="bar-row__label" title="' + esc(it.label) + '">' + esc(it.label) +
        '</span><span class="bar-row__track"><span class="bar-row__fill" style="width:' +
        ((it.value / max) * 100) + "%;background:" + it.color + '"></span></span>' +
        '<span class="bar-row__val">' + it.value + "</span></div>";
    }).join("") + "</div>";
  }

  var NET = "var(--net)";
  var CLS_COLOR = { good: "var(--st-good)", warn: "var(--st-warn)", serious: "var(--st-serious)", critical: "var(--st-critical)" };

  function flag(code, name) {
    return '<span class="flagchip"><span class="flagchip__code">' + esc(code) + "</span>" + esc(name) + "</span>";
  }

  /* ------------------------------------------------------- context banner */
  function ctx(title, body) {
    return '<div class="ctx"><div class="ctx__icon" aria-hidden="true">◍</div><div>' +
      '<div class="ctx__title">' + esc(title) + "</div>" +
      '<div class="ctx__body">' + body + "</div></div></div>";
  }

  var NETWORK_CTX = ctx(
    "GCC Network — external to Gulf CDC",
    "These <b>55 experts</b> are Permanent Contact Network members, Country Liaison Officers and Working Group " +
    "members nominated by the <b>six GCC Member States</b>. They are <b>not Gulf CDC staff</b> and do not appear in " +
    "Contacts or Core Expertise. Both populations are coded against the same 57-area Core Expertise Taxonomy, " +
    "which is what makes the <b>Gulf CDC ↔ Network</b> comparison possible."
  );

  /* -------------------------------------------------------- group filters */
  // The v3 workbook does not yet carry a constituency column, so the four
  // group chips render in their "pending" state. One column in the workbook
  // (or a name → group list) switches them on with no further code change.
  var GROUP_DEFS = [
    { key: "", label: "All network" },
    { key: "CEO", label: "CEO / Executive" },
    { key: "PCN", label: "PCN" },
    { key: "CLO", label: "Liaison Officers" },
    { key: "WG", label: "Working Group" }
  ];
  var state = { group: "", q: "", st: "", track: "", domain: "" };

  function groupbar() {
    return '<div class="groupbar">' + GROUP_DEFS.map(function (g) {
      var n = g.key ? PEOPLE.filter(function (p) { return p.group === g.key; }).length : PEOPLE.length;
      var pending = g.key && n === 0;
      return '<button type="button" class="groupchip' +
        (state.group === g.key ? " is-active" : "") + (pending ? " is-pending" : "") +
        '" data-group="' + esc(g.key) + '"' + (pending ? ' title="Waiting on the constituency column in the workbook"' : "") +
        ">" + esc(g.label) + '<span class="groupchip__n">' + (pending ? "—" : n) + "</span></button>";
    }).join("") +
      '<span class="count-note">Group tags pending — add a <b>Network Group</b> column to 02_Master_Dataset and these switch on.</span></div>';
  }

  /* -------------------------------------------------------------- views */
  var VIEWS = {};

  VIEWS.overview = function () {
    var segs = [
      { label: "Adequate (3+ holders)", value: M.adequate, color: CLS_COLOR.good },
      { label: "Thin (2 holders)", value: M.thin, color: CLS_COLOR.warn },
      { label: "Sole expert (1)", value: M.sole, color: CLS_COLOR.serious },
      { label: "No core holder (0)", value: M.noCore, color: CLS_COLOR.critical }
    ];
    var stateMax = Math.max.apply(null, (D.byState || []).map(function (s) { return s.people; }));
    var domMax = Math.max.apply(null, (D.byDomain || []).map(function (d) { return d.areas; }));

    return NETWORK_CTX + groupbar() +
      '<div class="grid-4">' +
        kpi(M.people, "Network experts", "across 6 Member States") +
        kpi(M.states, "Member States", "Bahrain · Kuwait · Oman · Qatar · Saudi Arabia · UAE") +
        kpi(M.covered + " / " + M.areas, "Taxonomy areas covered", M.tags + " core expertise tags") +
        kpi(M.external, "Externally consulted", "advise WHO / Member States / partners") +
      "</div>" +

      '<div class="grid-2" style="margin-top:16px">' +
        card("Regional expertise coverage", "How the 57 core areas are held across the network",
          '<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">' +
          donut(segs, { centerNum: M.areas, centerLbl: "areas", aria: "Network coverage by status" }) +
          "<div>" + legend(segs) +
          '<dl class="deflist" style="margin-top:12px">' +
          '<dt>Adequate</dt><dd>3 or more experts hold the area — safe to anchor a GCC Community of Practice.</dd>' +
          '<dt>Thin</dt><dd>Only 2 holders region-wide — one departure makes it a sole-expert area.</dd>' +
          '<dt>Sole expert</dt><dd>A single person in the whole network holds it — a regional single point of failure.</dd>' +
          '<dt>No core holder</dt><dd>Nobody in the network claims it as core — source externally or target the next wave.</dd>' +
          "</dl></div></div>") +
        card("Experts by Member State", "Where the network's depth sits",
          rankedBars((D.byState || []).map(function (s) {
            return { label: s.state, value: s.people, color: NET };
          }), stateMax)) +
      "</div>" +

      '<div class="card" style="margin-top:16px">' +
        '<div class="card__hd"><div class="card__title">Coverage by domain</div>' +
        '<div class="card__sub">Areas held by at least one network expert, out of all areas in the domain</div></div>' +
        rankedBars((D.byDomain || []).map(function (d) {
          return { label: d.domain, value: d.covered, color: d.covered === d.areas ? CLS_COLOR.good : NET };
        }), domMax) +
      "</div>";
  };

  function kpi(value, label, note) {
    return '<div class="card kpi kpi--net"><div class="kpi__value">' + esc(String(value)) + "</div>" +
      '<div class="kpi__label">' + esc(label) + "</div>" +
      (note ? '<div class="kpi__note">' + esc(note) + "</div>" : "") + "</div>";
  }
  function card(title, sub, body) {
    return '<div class="card"><div class="card__hd"><div class="card__title">' + esc(title) + "</div>" +
      (sub ? '<div class="card__sub">' + esc(sub) + "</div>" : "") + "</div>" + body + "</div>";
  }

  VIEWS.directory = function () {
    var list = PEOPLE.filter(function (p) {
      if (state.group && p.group !== state.group) return false;
      if (state.st && p.state !== state.st) return false;
      if (state.track && p.track !== state.track) return false;
      if (state.q) {
        var hay = (p.name + " " + p.state + " " + p.level + " " + p.entity + " " + p.areas.join(" ")).toLowerCase();
        if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
      }
      return true;
    });

    var opts = function (values, cur) {
      return values.map(function (v) {
        return '<option value="' + esc(v) + '"' + (cur === v ? " selected" : "") + ">" + esc(v) + "</option>";
      }).join("");
    };

    return NETWORK_CTX + groupbar() +
      '<div class="filters">' +
        '<input type="search" id="dirQ" placeholder="Search name, entity or expertise…" aria-label="Search the directory" value="' + esc(state.q) + '" />' +
        '<select id="dirState" aria-label="Filter by Member State"><option value="">All Member States</option>' +
          opts(STATES.map(function (s) { return s.name; }), state.st) + "</select>" +
        '<select id="dirTrack" aria-label="Filter by track"><option value="">All tracks</option>' +
          opts(["Managerial", "Professional"], state.track) + "</select>" +
        '<span class="count-note">' + list.length + " of " + PEOPLE.length + " experts</span>" +
      "</div>" +
      '<div class="net-grid">' + list.map(function (p) {
        return '<article class="netcard">' +
          '<div class="netcard__hd"><div class="netcard__avatar" aria-hidden="true">' + esc(initials(p.name)) + "</div>" +
          '<div class="netcard__id"><div class="netcard__name">' + esc(p.name) + "</div>" +
          '<div class="netcard__role">' + esc(p.level) + " · " + esc(p.entity) + "</div></div></div>" +
          '<div class="netcard__tags">' + flag(p.code, p.state) +
            '<span class="pill pill--neutral"><span class="pill__dot"></span>' + esc(p.track) + "</span>" +
            (p.external ? pill("good", "Externally consulted") : "") +
            (p.soleAreas > 0 ? pill("serious", p.soleAreas + " sole-expert area" + (p.soleAreas > 1 ? "s" : "")) : "") +
          "</div>" +
          '<div class="netcard__areas">' + p.areas.map(function (a) {
            return '<span class="tag-chip">' + esc(a) + "</span>";
          }).join("") + "</div>" +
          '<div class="netcard__foot"><span>' + esc(p.profile) + " profile</span>" +
          '<span class="netcard__idx">Index ' + p.index + "</span></div>" +
        "</article>";
      }).join("") + "</div>" +
      (list.length ? "" : '<p class="card" style="margin-top:14px">No expert matches these filters.</p>');
  };

  VIEWS.states = function () {
    var rows = COV.filter(function (c) {
      return !state.domain || c.domain === state.domain;
    });
    var domains = [];
    COV.forEach(function (c) { if (domains.indexOf(c.domain) === -1) domains.push(c.domain); });

    var head = '<tr><th>Core expertise area</th>' + STATES.map(function (s) {
      return "<th>" + esc(s.code) + "</th>";
    }).join("") + "<th>Total</th><th>States</th></tr>";

    var body = rows.map(function (c) {
      return "<tr><td class=\"area\">" + esc(c.area) + "</td>" + STATES.map(function (s) {
        var n = c.by[s.name] || 0;
        var h = n === 0 ? "h0" : n === 1 ? "h1" : n === 2 ? "h2" : "h3";
        return '<td class="cell ' + h + '">' + (n || "·") + "</td>";
      }).join("") + '<td class="cell"><b>' + c.total + "</b></td>" +
        '<td class="cell">' + c.states + "</td></tr>";
    }).join("");

    return NETWORK_CTX +
      '<div class="filters"><select id="stDomain" aria-label="Filter by domain"><option value="">All domains</option>' +
        domains.map(function (d) {
          return '<option value="' + esc(d) + '"' + (state.domain === d ? " selected" : "") + ">" + esc(d) + "</option>";
        }).join("") + "</select>" +
        '<span class="count-note">Darker cell = more holders in that Member State. A row covered by one state only is a regional concentration risk.</span></div>' +
      '<div class="card"><div class="scroll-y"><table class="heat"><thead>' + head + "</thead><tbody>" + body + "</tbody></table></div></div>";
  };

  VIEWS.gaps = function () {
    var order = { critical: 0, serious: 1, warn: 2, good: 3 };
    var rows = GAPS.slice().sort(function (a, b) {
      return (order[a.cls] - order[b.cls]) || a.area.localeCompare(b.area);
    });
    return NETWORK_CTX +
      '<div class="card"><div class="card__hd"><div class="card__title">Where the GCC network is exposed</div>' +
      '<div class="card__sub">' + M.sole + " sole-expert areas and " + M.noCore +
      " areas with no holder anywhere in the network, out of " + M.areas + " taxonomy areas</div></div>" +
      '<div class="scroll-y"><table class="data"><thead><tr><th class="no-sort">Status</th><th class="no-sort">Core expertise area</th>' +
      '<th class="no-sort">Domain</th><th class="no-sort num">Holders</th><th class="no-sort num">States</th>' +
      '<th class="no-sort">Recommendation</th></tr></thead><tbody>' +
      rows.map(function (g) {
        return "<tr><td>" + pill(g.cls, g.status) + "</td>" +
          "<td><b>" + esc(g.area) + "</b></td>" +
          "<td>" + esc(g.domain) + "</td>" +
          '<td class="num">' + g.holders + "</td>" +
          '<td class="num">' + g.states + "</td>" +
          '<td style="color:var(--ink-2)">' + esc(g.recommendation) + "</td></tr>";
      }).join("") + "</tbody></table></div></div>";
  };

  VIEWS.bridge = function () {
    var covers = BRIDGE.filter(function (b) { return b.verdict === "Network covers the gap"; });
    var both = BRIDGE.filter(function (b) { return b.verdict === "Gap on both sides"; });
    var order = { "Network covers the gap": 0, "One regional holder only": 1, "Gap on both sides": 2, "Internal only": 3, "Covered both sides": 4 };
    var rows = BRIDGE.slice().sort(function (a, b) {
      return (order[a.verdict] - order[b.verdict]) || (b.network - a.network) || a.area.localeCompare(b.area);
    });
    var maxN = Math.max.apply(null, BRIDGE.map(function (b) { return Math.max(b.internal, b.network); })) || 1;

    return '<div class="bridge-note">This is the <b>only</b> view where the two populations appear together, and they stay in ' +
      'separate columns. Both are coded against the same 57-area taxonomy, so the counts are directly comparable. ' +
      '<b>' + covers.length + " areas</b> where Gulf CDC has one expert or none are covered by two or more experts in the " +
      "network — these are the ready-made mentoring, secondment and Community-of-Practice targets. " +
      "<b>" + both.length + " areas</b> are thin on both sides and need external sourcing." +
      "</div>" +

      '<div class="grid-4" style="margin-bottom:16px">' +
        kpi(covers.length, "Gaps the network can close", "internal ≤1 holder, network ≥2") +
        kpi(BRIDGE.filter(function (b) { return b.verdict === "One regional holder only"; }).length,
            "One regional holder only", "fragile on both sides") +
        kpi(both.length, "Gaps on both sides", "source outside the GCC") +
        kpi(BRIDGE.filter(function (b) { return b.verdict === "Covered both sides"; }).length,
            "Strong on both sides", "anchor joint programmes here") +
      "</div>" +

      '<div class="card"><div class="scroll-y"><table class="data"><thead><tr>' +
        '<th class="no-sort">Core expertise area</th>' +
        '<th class="no-sort"><span class="side side--int">Gulf CDC</span></th>' +
        '<th class="no-sort"><span class="side side--net">GCC Network</span></th>' +
        '<th class="no-sort">Read</th></tr></thead><tbody>' +
      rows.map(function (b) {
        return "<tr><td><b>" + esc(b.area) + "</b><div style=\"font-size:12px;color:var(--ink-muted)\">" +
          esc(b.domain) + "</div></td>" +
          '<td><div class="cmp"><span class="cmp__n">' + b.internal + '</span><span class="cmp__bar">' +
            '<span class="cmp__fill cmp__fill--int" style="width:' + ((b.internal / maxN) * 100) + '%"></span></span></div></td>' +
          '<td><div class="cmp"><span class="cmp__n">' + b.network + '</span><span class="cmp__bar">' +
            '<span class="cmp__fill cmp__fill--net" style="width:' + ((b.network / maxN) * 100) + '%"></span></span></div></td>' +
          "<td>" + pill(b.verdictCls === "neutral" ? "neutral" : b.verdictCls, b.verdict) + "</td></tr>";
      }).join("") + "</tbody></table></div></div>";
  };

  VIEWS.mapping = function () {
    var shown = TREE.slice(0, 160);
    return NETWORK_CTX +
      '<div class="card"><div class="card__hd"><div class="card__title">Network expertise map</div>' +
      '<div class="card__sub">Root → Domain → Sub-domain → Core expertise → Holder (Member State). ' +
      "In the built version this renders as the same interactive SVG tree as the internal Mapping section, " +
      "drawn in the network's teal so the two maps are never confused.</div></div>" +
      '<div class="scroll-y tree">' + shown.map(function (n) {
        var cls = "tree__l" + Math.min(n.level, 4);
        return '<div class="tree__row" style="padding-left:' + (n.level * 22) + 'px">' +
          '<span class="' + cls + '">' + (n.level === 4 ? "• " : "") + esc(n.label) + "</span>" +
          (n.note ? '<span class="tree__note">' + esc(n.note) + "</span>" : "") + "</div>";
      }).join("") + "</div>" +
      '<p class="card__sub" style="margin-top:10px">Showing the first ' + shown.length + " of " + TREE.length + " nodes.</p></div>";
  };

  /* --------------------------------------------------------------- router */
  function go(name) {
    name = VIEWS[name] ? name : "overview";
    $$("#tabs .tab").forEach(function (t) {
      var on = t.getAttribute("data-view") === name;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-current", on ? "page" : "false");
    });
    $$(".view").forEach(function (v) { v.hidden = true; });
    var el = $("#view-" + name);
    el.hidden = false;
    el.innerHTML = VIEWS[name]();
    bind(el, name);
    window.scrollTo({ top: 0, behavior: "smooth" });
    announce(name + " loaded");
    current = name;
  }
  var current = "overview";

  // Handlers are assigned, never added — go() re-renders and addEventListener
  // would stack duplicates on every visit.
  function bind(el, name) {
    el.onclick = function (e) {
      var g = e.target.closest("[data-group]");
      if (g) { state.group = g.getAttribute("data-group"); go(current); }
    };
    var q = $("#dirQ", el);
    if (q) {
      q.oninput = function () { state.q = q.value; go(current); setTimeout(function () {
        var n = $("#dirQ"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
      }, 0); };
    }
    var st = $("#dirState", el);
    if (st) st.onchange = function () { state.st = st.value; go(current); };
    var tr = $("#dirTrack", el);
    if (tr) tr.onchange = function () { state.track = tr.value; go(current); };
    var dm = $("#stDomain", el);
    if (dm) dm.onchange = function () { state.domain = dm.value; go(current); };
    void name;
  }

  /* ----------------------------------------------------------------- init */
  $("#tabs").onclick = function (e) {
    var t = e.target.closest(".tab");
    if (t) go(t.getAttribute("data-view"));
  };

  $("#scope").onclick = function (e) {
    var b = e.target.closest("[data-scope]");
    if (!b) return;
    if (b.getAttribute("data-scope") === "internal") window.location.href = "../index.html";
  };

  var themeToggle = $("#themeToggle");
  if (themeToggle) {
    themeToggle.onclick = function () {
      var root = document.documentElement;
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("gcdc-theme", next); } catch (err) { void err; }
    };
  }
  try {
    var saved = localStorage.getItem("gcdc-theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  } catch (err) { void err; }

  var form = $("#siteSearchForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      state.q = $("#siteSearch").value;
      go("directory");
    });
  }

  go("overview");
})();
