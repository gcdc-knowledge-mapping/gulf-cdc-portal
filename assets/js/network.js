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
  var BRIDGE = D.bridge || [];
  var FLAT = D.tree || [];
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

  var FLAG_DIR = "../assets/img/flags/";

  var STATE_BY_NAME = {};
  STATES.forEach(function (s) { STATE_BY_NAME[s.name] = s; });
  // Holder labels in the tree end with a Member State code, e.g. "… (BH)".
  var STATE_BY_CODE = {};
  STATES.forEach(function (s) { STATE_BY_CODE[s.code] = s; });

  // Flag + label. The country name always travels with the flag, so meaning is
  // never carried by the image alone.
  function flagImg(stateName, size) {
    var s = STATE_BY_NAME[stateName];
    if (!s) return "";
    return '<img class="flag" src="' + FLAG_DIR + esc(s.flag) + '" width="' + (size || 22) +
      '" alt="" />';
  }
  function flagChip(stateName) {
    var s = STATE_BY_NAME[stateName];
    if (!s) return "";
    return '<span class="flagchip">' + flagImg(stateName, 20) + esc(s.label) + "</span>";
  }

  /* ------------------------------------------------------------- charts */
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
      return '<div class="bar-row"><span class="bar-row__label" title="' + esc(it.label) + '">' +
        (it.icon || "") + esc(it.label) +
        '</span><span class="bar-row__track"><span class="bar-row__fill" style="width:' +
        ((it.value / max) * 100) + "%;background:" + it.color + '"></span></span>' +
        '<span class="bar-row__val">' + it.value + "</span></div>";
    }).join("") + "</div>";
  }

  var NET = "var(--net)";
  var CLS_COLOR = { good: "var(--st-good)", warn: "var(--st-warn)", serious: "var(--st-serious)", critical: "var(--st-critical)" };

  function kpi(value, label, note) {
    return '<div class="card kpi kpi--net"><div class="kpi__value">' + esc(String(value)) + "</div>" +
      '<div class="kpi__label">' + esc(label) + "</div>" +
      (note ? '<div class="kpi__note">' + esc(note) + "</div>" : "") + "</div>";
  }
  function card(title, sub, body) {
    return '<div class="card"><div class="card__hd"><div class="card__title">' + esc(title) + "</div>" +
      (sub ? '<div class="card__sub">' + esc(sub) + "</div>" : "") + "</div>" + body + "</div>";
  }

  function ctx(title, body) {
    return '<div class="ctx"><div class="ctx__icon" aria-hidden="true">◍</div><div>' +
      '<div class="ctx__title">' + esc(title) + "</div>" +
      '<div class="ctx__body">' + body + "</div></div></div>";
  }

  var NETWORK_CTX = ctx(
    "GCC Network — external to Gulf CDC",
    "These <b>55 experts</b> were nominated by the <b>six GCC Member States</b>. They are " +
    "<b>not Gulf CDC staff</b> and do not appear in the internal Contacts or Core Expertise " +
    "sections. Both populations are coded against the same 57-area Core Expertise Taxonomy, " +
    "which is what makes the <b>GCDC ↔ Network</b> comparison possible."
  );

  var state = { q: "", st: "", track: "", domain: "", sort: "name", dir: 1, coreQ: "", coreSt: "" };

  /* -------------------------------------------------------------- views */
  var VIEWS = {};

  VIEWS.home = function () {
    return '<div class="hero">' +
      '<div class="hero__inner">' +
      '<img class="hero__logo" src="../assets/img/km-logo.svg" alt="Knowledge Mapping" />' +
      '<div class="hero__ar" dir="rtl">خريطة المعرفة</div>' +
      '<div class="hero__en">KNOWLEDGE MAPPING</div>' +
      '<div class="hero__tag">Right Knowledge. Right People. Right Time.</div>' +
      '<div class="hero__scope">GCC Network</div>' +
      "</div></div>" +

      '<div class="grid-2" style="margin-top:26px">' +
      card("About the GCC Network", "",
        '<p style="color:var(--ink-2)">The regional layer of the Knowledge Mapping initiative. It maps the ' +
        'specialised health expertise held across the Permanent Contact Network, Country Liaison Officers and ' +
        'Working Group members nominated by the six GCC Member States, and classifies it within the same ' +
        'unified public health framework used inside the Center — so regional and internal expertise can be ' +
        "read together rather than side by side.</p>") +
      card("Purpose", "",
        '<p style="color:var(--ink-2)">To identify where public health expertise sits across the GCC, connect ' +
        'the Center to the right regional expert at the right time, and show where the network can strengthen ' +
        'the areas in which Gulf CDC has only one expert or none. This turns the knowledge map into a basis for ' +
        "mentoring, secondments and GCC Communities of Practice.</p>") +
      "</div>" +

      '<div class="home-stats">' +
      '<div class="card home-stat"><div class="home-stat__num">' + M.people + "</div>" +
        '<div class="home-stat__label">Network experts</div>' +
        '<div class="home-stat__note">PCN, Liaison Officers and Working Group members</div></div>' +
      '<div class="card home-stat"><div class="home-stat__num">' + M.states + "</div>" +
        '<div class="home-stat__label">Member States</div>' +
        '<div class="home-stat__flags">' + STATES.map(function (s) {
          return '<img class="flag" src="' + FLAG_DIR + esc(s.flag) + '" width="26" alt="' + esc(s.label) + '" title="' + esc(s.label) + '" />';
        }).join("") + "</div></div>" +
      '<div class="card home-stat"><div class="home-stat__num">' + (D.byDomain || []).length + "</div>" +
        '<div class="home-stat__label">Domains of experience</div>' +
        '<div class="home-stat__note">' + M.tags + " core expertise tags recorded</div></div>" +
      "</div>";
  };

  VIEWS.overview = function () {
    var segs = [
      { label: "Adequate (3+ holders)", value: M.adequate, color: CLS_COLOR.good },
      { label: "Thin (2 holders)", value: M.thin, color: CLS_COLOR.warn },
      { label: "Sole expert (1)", value: M.sole, color: CLS_COLOR.serious },
      { label: "No core holder (0)", value: M.noCore, color: CLS_COLOR.critical }
    ];
    // Member State bars follow the requested column order, not a ranking.
    var byState = STATES.map(function (s) {
      var row = (D.byState || []).filter(function (b) { return b.state === s.name; })[0] || { people: 0 };
      return { label: s.label, value: row.people, color: NET, icon: flagImg(s.name, 20) };
    });
    var stateMax = Math.max.apply(null, byState.map(function (s) { return s.value; })) || 1;
    var domMax = Math.max.apply(null, (D.byDomain || []).map(function (d) { return d.areas; })) || 1;

    return NETWORK_CTX +
      '<div class="grid-4">' +
        kpi(M.people, "Network experts", "across 6 Member States") +
        kpi(M.states, "Member States", "United Arab Emirates · Bahrain · Saudi Arabia · Oman · Qatar · Kuwait") +
        kpi(M.covered + " / " + M.areas, "Taxonomy areas covered", M.tags + " core expertise tags") +
        kpi(M.external, "Externally consulted", "advise WHO / Member States / partners") +
      "</div>" +

      '<div class="grid-2" style="margin-top:16px">' +
        card("Regional expertise coverage", "How the 57 core areas are held across the network",
          '<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">' +
          donut(segs, { centerNum: M.areas, centerLbl: "areas", aria: "Network coverage by status" }) +
          "<div>" + legend(segs) +
          '<dl class="deflist" style="margin-top:12px">' +
          "<dt>Adequate</dt><dd>3 or more experts hold the area — safe to anchor a GCC Community of Practice.</dd>" +
          "<dt>Thin</dt><dd>Only 2 holders region-wide — one departure makes it a sole-expert area.</dd>" +
          "<dt>Sole expert</dt><dd>A single person in the whole network holds it — a regional single point of failure.</dd>" +
          "<dt>No core holder</dt><dd>Nobody in the network claims it as core — source externally or target the next wave.</dd>" +
          "</dl></div></div>") +
        card("Experts by Member State", "Where the network's depth sits", rankedBars(byState, stateMax)) +
      "</div>" +

      '<div class="card" style="margin-top:16px">' +
        '<div class="card__hd"><div class="card__title">Coverage by domain</div>' +
        '<div class="card__sub">Areas held by at least one network expert, out of all areas in the domain</div></div>' +
        rankedBars((D.byDomain || []).map(function (d) {
          return { label: d.domain, value: d.covered, color: d.covered === d.areas ? CLS_COLOR.good : NET };
        }), domMax) +
      "</div>";
  };

  /* --------------------------------------------------- Core Expertise */
  VIEWS.core = function () {
    var list = PEOPLE.filter(function (p) {
      if (state.coreSt && p.state !== state.coreSt) return false;
      if (state.coreQ) {
        var hay = (p.name + " " + p.state + " " + p.areas.join(" ")).toLowerCase();
        if (hay.indexOf(state.coreQ.toLowerCase()) === -1) return false;
      }
      return true;
    });
    var order = {};
    STATES.forEach(function (s, i) { order[s.name] = i; });
    list.sort(function (a, b) {
      var v = state.sort === "state"
        ? (order[a.state] - order[b.state]) || a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name);
      return v * state.dir;
    });

    var arrow = function (key) {
      return state.sort === key ? (state.dir === 1 ? " ▲" : " ▼") : "";
    };

    return NETWORK_CTX +
      '<div class="filters">' +
        '<input type="search" id="coreQ" placeholder="Search name or expertise…" aria-label="Search core expertise" value="' + esc(state.coreQ) + '" />' +
        '<select id="coreState" aria-label="Filter by Member State"><option value="">All Member States</option>' +
          STATES.map(function (s) {
            return '<option value="' + esc(s.name) + '"' + (state.coreSt === s.name ? " selected" : "") + ">" + esc(s.label) + "</option>";
          }).join("") + "</select>" +
        '<button type="button" class="btn" id="coreCsv">Export CSV</button>' +
        '<span class="count-note">' + list.length + " of " + PEOPLE.length + " experts</span>" +
      "</div>" +
      '<div class="card"><table class="data data--stack"><thead><tr>' +
        '<th data-sort="name" aria-sort="' + (state.sort === "name" ? (state.dir === 1 ? "ascending" : "descending") : "none") + '">Name<span class="arrow">' + arrow("name") + "</span></th>" +
        '<th data-sort="state" aria-sort="' + (state.sort === "state" ? (state.dir === 1 ? "ascending" : "descending") : "none") + '">Member State<span class="arrow">' + arrow("state") + "</span></th>" +
        '<th class="no-sort">Core expertise</th></tr></thead><tbody>' +
      list.map(function (p) {
        return '<tr><td data-label="Name"><b>' + esc(p.name) + "</b>" +
          '<div style="font-size:12px;color:var(--ink-muted)">' + esc(p.level) + "</div></td>" +
          '<td data-label="Member State">' + flagChip(p.state) + "</td>" +
          '<td data-label="Core expertise"><div class="netcard__areas">' +
          (p.areas.length
            ? p.areas.map(function (a) { return '<span class="tag-chip">' + esc(a) + "</span>"; }).join("")
            : '<span class="muted">—</span>') +
          "</div></td></tr>";
      }).join("") + "</tbody></table>" +
      (list.length ? "" : '<div class="empty"><p><b>No expert matches these filters.</b></p></div>') +
      "</div>";
  };

  VIEWS.directory = function () {
    var list = PEOPLE.filter(function (p) {
      if (state.st && p.state !== state.st) return false;
      if (state.track && p.track !== state.track) return false;
      if (state.q) {
        var hay = (p.name + " " + p.state + " " + p.level + " " + p.entity + " " + p.areas.join(" ")).toLowerCase();
        if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
      }
      return true;
    });

    return NETWORK_CTX +
      '<div class="filters">' +
        '<input type="search" id="dirQ" placeholder="Search name, entity or expertise…" aria-label="Search the directory" value="' + esc(state.q) + '" />' +
        '<select id="dirState" aria-label="Filter by Member State"><option value="">All Member States</option>' +
          STATES.map(function (s) {
            return '<option value="' + esc(s.name) + '"' + (state.st === s.name ? " selected" : "") + ">" + esc(s.label) + "</option>";
          }).join("") + "</select>" +
        '<select id="dirTrack" aria-label="Filter by track"><option value="">All tracks</option>' +
          ["Managerial", "Professional"].map(function (v) {
            return '<option value="' + v + '"' + (state.track === v ? " selected" : "") + ">" + v + "</option>";
          }).join("") + "</select>" +
        '<span class="count-note">' + list.length + " of " + PEOPLE.length + " experts</span>" +
      "</div>" +
      '<div class="net-grid">' + list.map(function (p) {
        var st = STATE_BY_NAME[p.state] || {};
        return '<article class="netcard">' +
          '<div class="netcard__hd"><div class="netcard__avatar" aria-hidden="true">' + esc(initials(p.name)) + "</div>" +
          '<div class="netcard__id"><div class="netcard__name">' + esc(p.name) + "</div>" +
          '<div class="netcard__role">' + esc(p.level) + " · " + esc(p.entity) + "</div></div>" +
          '<div class="netcard__flag">' +
            '<img class="flag flag--lg" src="' + FLAG_DIR + esc(st.flag || "") + '" width="34" alt="" />' +
            '<span class="netcard__country">' + esc(st.label || p.state) + "</span>" +
          "</div></div>" +
          '<div class="netcard__tags">' +
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
    var rows = COV.filter(function (c) { return !state.domain || c.domain === state.domain; });
    var domains = [];
    COV.forEach(function (c) { if (domains.indexOf(c.domain) === -1) domains.push(c.domain); });

    var head = "<tr><th>Core expertise area</th>" + STATES.map(function (s) {
      return '<th><span class="heat__state">' +
        '<img class="flag flag--lg" src="' + FLAG_DIR + esc(s.flag) + '" width="30" alt="" />' +
        '<span class="heat__name">' + esc(s.label) + "</span></span></th>";
    }).join("") + "<th>Total</th><th>States</th></tr>";

    var body = rows.map(function (c) {
      return '<tr><td class="area">' + esc(c.area) + "</td>" + STATES.map(function (s) {
        var n = c.by[s.name] || 0;
        var h = n === 0 ? "h0" : n === 1 ? "h1" : n === 2 ? "h2" : "h3";
        return '<td class="cell ' + h + '" title="' + esc(s.label) + ": " + n + ' holder' + (n === 1 ? "" : "s") + '">' +
          (n || "·") + "</td>";
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

  VIEWS.bridge = function () {
    var covers = BRIDGE.filter(function (b) { return b.verdict === "Network covers the gap"; });
    var both = BRIDGE.filter(function (b) { return b.verdict === "Gap on both sides"; });
    var order = { "Network covers the gap": 0, "One regional holder only": 1, "Gap on both sides": 2, "Internal only": 3, "Covered both sides": 4 };
    var rows = BRIDGE.slice().sort(function (a, b) {
      return (order[a.verdict] - order[b.verdict]) || (b.network - a.network) || a.area.localeCompare(b.area);
    });
    var maxN = Math.max.apply(null, BRIDGE.map(function (b) { return Math.max(b.internal, b.network); })) || 1;

    return '<div class="bridge-note">This is the <b>only</b> view where the two populations appear together, and they stay in ' +
      "separate columns. Both are coded against the same 57-area taxonomy, so the counts are directly comparable. " +
      "<b>" + covers.length + " areas</b> where Gulf CDC has one expert or none are covered by two or more experts in the " +
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
        '<th class="no-sort"><span class="side side--int">Internal GCDC</span></th>' +
        '<th class="no-sort"><span class="side side--net">GCC Network</span></th>' +
        '<th class="no-sort">Read</th></tr></thead><tbody>' +
      rows.map(function (b) {
        return "<tr><td><b>" + esc(b.area) + '</b><div style="font-size:12px;color:var(--ink-muted)">' +
          esc(b.domain) + "</div></td>" +
          '<td><div class="cmp"><span class="cmp__n">' + b.internal + '</span><span class="cmp__bar">' +
            '<span class="cmp__fill cmp__fill--int" style="width:' + ((b.internal / maxN) * 100) + '%"></span></span></div></td>' +
          '<td><div class="cmp"><span class="cmp__n">' + b.network + '</span><span class="cmp__bar">' +
            '<span class="cmp__fill cmp__fill--net" style="width:' + ((b.network / maxN) * 100) + '%"></span></span></div></td>' +
          "<td>" + pill(b.verdictCls, b.verdict) + "</td></tr>";
      }).join("") + "</tbody></table></div></div>";
  };

  /* ------------------------------------------------- Mapping (tree) */
  // Rebuilt as a nested tree from the workbook's own indented hierarchy, then
  // drawn with the same geometry and CSS as the internal Mapping section.
  var MAP_TREE = (function () {
    var root = null, stack = [], di = -1, colors = {};
    FLAT.forEach(function (n, i) {
      var node = {
        id: "n" + i, label: n.label, tier: n.level, note: n.note,
        children: []
      };
      if (n.level === 0) {
        node.label = "GCC Network";
        node.color = "var(--net)";
        root = node; stack = [node];
        return;
      }
      if (n.level === 1) {
        di += 1;
        colors[node.id] = "var(--c" + ((di % 9) + 1) + ")";
        node.color = colors[node.id];
      }
      var parent = stack[n.level - 1];
      if (!parent) return;
      node.color = n.level === 1 ? node.color : parent.color;
      parent.children.push(node);
      stack[n.level] = node;
      stack.length = n.level + 1;
    });
    if (!root) root = { id: "root", label: "GCC Network", tier: 0, color: "var(--net)", children: [] };
    (function count(n) {
      n.nExp = n.tier === 3 ? 1 : 0;
      n.nHold = n.tier === 4 ? 1 : 0;
      n.children.forEach(function (c) { count(c); n.nExp += c.nExp; n.nHold += c.nHold; });
    })(root);
    return root;
  })();

  var mapState = { expanded: null, q: "", k: 1, tx: 24, ty: 24 };
  function mapDefaultExpanded() {
    var s = {};
    s[MAP_TREE.id] = 1;
    MAP_TREE.children.forEach(function (d) { s[d.id] = 1; });
    return s;
  }

  VIEWS.mapping = function () {
    return '<div class="view__head"><h1>Network Expertise Mapping</h1>' +
      "<p>The GCC network hierarchy as an interactive tree — Network → Domain → Sub-domain → Core expertise → " +
      "Holder (Member State). Click a node to expand or collapse its branch; drag to pan and scroll to zoom.</p></div>" +
      '<div class="toolbar">' +
      '<div class="field"><input type="search" id="mapq" placeholder="Search the tree…" aria-label="Search mapping tree" value="' + esc(mapState.q) + '"></div>' +
      '<button class="btn" id="mapExpand">Expand all</button>' +
      '<button class="btn" id="mapCollapse">Collapse all</button>' +
      '<button class="btn" id="mapReset">Reset view</button>' +
      '<span class="muted" style="margin-left:auto;font-size:13px">' + MAP_TREE.children.length +
      " domains · " + M.areas + " areas · " + M.people + " experts</span>" +
      "</div>" +
      '<div class="map-wrap card" id="mapWrap">' +
      '<svg id="mapSvg" class="map-svg map-svg--net" role="tree" aria-label="Network expertise hierarchy tree"><g id="mapPan"></g></svg>' +
      "</div>" +
      '<div class="legend" style="margin-top:12px">' +
      '<span class="legend__item"><span class="legend__swatch" style="background:var(--net)"></span>Network</span>' +
      '<span class="legend__item"><span class="legend__swatch" style="background:var(--c2)"></span>Domain</span>' +
      '<span class="legend__item"><span class="legend__swatch" style="background:var(--surface);border:2px solid var(--c2)"></span>Sub-domain</span>' +
      '<span class="legend__item"><span class="legend__swatch" style="background:var(--surface-2);border:1px solid var(--border-strong)"></span>Core expertise</span>' +
      '<span class="legend__item"><span class="legend__swatch" style="background:var(--net-soft);border-radius:8px"></span>Holder</span>' +
      "</div>";
  };

  function bindMapping() {
    if (!mapState.expanded) mapState.expanded = mapDefaultExpanded();

    var TIER_X = [0, 240, 520, 790, 1090];
    var TIER_W = [200, 240, 230, 260, 210];
    var ROW_H = 34, NODE_H = 26;

    function applySearch() {
      var q = mapState.q.trim().toLowerCase();
      if (!q) return null;
      var open = {}, hits = {};
      open[MAP_TREE.id] = 1;
      (function walk(n, anc) {
        if (n.label.toLowerCase().indexOf(q) !== -1) {
          hits[n.id] = 1;
          anc.forEach(function (a) { open[a] = 1; });
        }
        n.children.forEach(function (c) { walk(c, anc.concat([n.id])); });
      })(MAP_TREE, []);
      mapState.expanded = open;
      return hits;
    }

    function draw() {
      var hits = applySearch();
      var row = 0, nodes = [], links = [];
      (function place(n, parent) {
        var kids = mapState.expanded[n.id] ? n.children : [];
        var node = { n: n, x: TIER_X[n.tier], y: 0 };
        if (kids.length) {
          var placed = kids.map(function (c) { return place(c, node); });
          node.y = (placed[0].y + placed[placed.length - 1].y) / 2;
        } else {
          node.y = row++ * ROW_H;
        }
        nodes.push(node);
        if (parent) links.push({ from: parent, to: node, color: n.color });
        return node;
      })(MAP_TREE, null);

      var linkSvg = links.map(function (l) {
        var x1 = l.from.x + TIER_W[l.from.n.tier], y1 = l.from.y + NODE_H / 2;
        var x2 = l.to.x, y2 = l.to.y + NODE_H / 2;
        var mx = (x1 + x2) / 2;
        return '<path class="map-link" d="M' + x1 + "," + y1 + " C" + mx + "," + y1 + " " + mx + "," + y2 + " " + x2 + "," + y2 + '" style="stroke:' + l.color + '"/>';
      }).join("");

      var nodeSvg = nodes.map(function (o) {
        var n = o.n, w = TIER_W[n.tier];
        var expandable = n.children.length > 0;
        var open = !!mapState.expanded[n.id];
        var hit = hits && hits[n.id];
        var badge = expandable && !open
          ? (n.tier <= 2 ? " · " + n.nExp + "▸" : " · " + n.nHold + "▸") : "";
        var arrow = expandable ? (open ? "▾ " : "▸ ") : "";
        var isPerson = n.tier === 4;
        // Holder labels carry the Member State as a code, e.g. "Name (BH)".
        // Show it as a flag on the node instead, and keep the code out of the
        // text so the name has room.
        var codeMatch = isPerson ? /\(([A-Z]{2})\)\s*$/.exec(n.label) : null;
        var hState = codeMatch ? STATE_BY_CODE[codeMatch[1]] : null;
        var person = isPerson ? n.label.replace(/\s*\([^)]*\)\s*$/, "") : "";
        var textX = hState ? 36 : 11;
        // Average glyph width per tier — tiers 0-2 render bold (and tier 0 at
        // 14px), so a single estimate would overflow their rects.
        var charW = n.tier === 0 ? 8.0 : n.tier === 1 ? 8.3 : n.tier === 2 ? 7.1 : 6.6;
        var raw = isPerson && hState ? person : n.label;
        var budget = Math.floor((w - textX - 11) / charW) - badge.length - arrow.length;
        var label = raw.length > budget ? raw.slice(0, budget - 1) + "…" : raw;
        var cls = "map-node map-node--t" + n.tier + (expandable ? " is-toggle" : "") +
          (isPerson ? " is-person" : "") + (hit ? " is-hit" : "");
        var style = n.tier === 1 ? "fill:" + n.color :
                    n.tier === 2 ? "stroke:" + n.color :
                    n.tier === 4 ? "fill:color-mix(in srgb, " + n.color + " 14%, var(--surface))" : "";
        var title = esc(n.label) + (expandable
          ? " — " + n.nExp + " area" + (n.nExp !== 1 ? "s" : "") + ", " + n.nHold + " holder" + (n.nHold !== 1 ? "s" : "")
          : isPerson ? (hState ? " — " + esc(hState.label) + " · open in Core Expertise" : " — open in Core Expertise") : "");
        return '<g class="' + cls + '" transform="translate(' + o.x + "," + o.y + ')" data-id="' + n.id + '"' +
          (expandable ? ' data-toggle="1"' : "") + (isPerson ? ' data-person="' + esc(person) + '"' : "") + ">" +
          "<title>" + title + "</title>" +
          '<rect width="' + w + '" height="' + NODE_H + '" rx="' + (n.tier === 4 ? 13 : 7) + '" style="' + style + '"/>' +
          (hState
            ? '<image class="map-flag" href="' + FLAG_DIR + esc(hState.flag) +
              '" x="9" y="' + ((NODE_H - 13) / 2) + '" width="20" height="13" preserveAspectRatio="xMidYMid meet"/>'
            : "") +
          '<text x="' + textX + '" y="' + (NODE_H / 2 + 4) + '">' + esc(arrow + label) +
          (badge ? '<tspan class="map-badge">' + esc(badge) + "</tspan>" : "") + "</text></g>";
      }).join("");

      var pan = $("#mapPan");
      pan.innerHTML = linkSvg + nodeSvg;
      pan.setAttribute("transform", "translate(" + mapState.tx + "," + mapState.ty + ") scale(" + mapState.k + ")");
      $("#mapSvg").style.minHeight = "560px";
    }

    var svg = $("#mapSvg");
    var drag = null, moved = 0, downTarget = null;
    svg.addEventListener("pointerdown", function (e) {
      drag = { x: e.clientX, y: e.clientY, tx: mapState.tx, ty: mapState.ty };
      moved = 0; downTarget = e.target.closest("[data-toggle],[data-person]");
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      mapState.tx = drag.tx + dx; mapState.ty = drag.ty + dy;
      $("#mapPan").setAttribute("transform", "translate(" + mapState.tx + "," + mapState.ty + ") scale(" + mapState.k + ")");
    });
    // Pointer capture retargets click to the svg, so resolve from pointerdown.
    svg.addEventListener("pointerup", function () {
      drag = null;
      if (moved > 5 || !downTarget) { downTarget = null; return; }
      var node = downTarget;
      downTarget = null;
      var person = node.getAttribute("data-person");
      if (person) {
        state.coreQ = person; state.coreSt = "";
        return go("core");
      }
      var id = node.getAttribute("data-id");
      if (mapState.q) { mapState.q = ""; $("#mapq").value = ""; }
      if (mapState.expanded[id]) delete mapState.expanded[id];
      else mapState.expanded[id] = 1;
      draw();
    });
    svg.addEventListener("wheel", function (e) {
      e.preventDefault();
      var rect = svg.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var f = Math.exp(-e.deltaY * 0.0012);
      var k = Math.min(2.5, Math.max(0.35, mapState.k * f));
      var real = k / mapState.k;
      mapState.tx = mx - (mx - mapState.tx) * real;
      mapState.ty = my - (my - mapState.ty) * real;
      mapState.k = k;
      $("#mapPan").setAttribute("transform", "translate(" + mapState.tx + "," + mapState.ty + ") scale(" + mapState.k + ")");
    }, { passive: false });

    $("#mapq").oninput = function (e) { mapState.q = e.target.value; draw(); };
    $("#mapExpand").onclick = function () {
      mapState.q = ""; $("#mapq").value = "";
      var all = {};
      (function walk(n) { if (n.children.length) { all[n.id] = 1; n.children.forEach(walk); } })(MAP_TREE);
      mapState.expanded = all; draw();
    };
    $("#mapCollapse").onclick = function () {
      mapState.q = ""; $("#mapq").value = "";
      var s = {}; s[MAP_TREE.id] = 1;
      mapState.expanded = s; draw();
    };
    $("#mapReset").onclick = function () {
      mapState.q = ""; $("#mapq").value = "";
      mapState.expanded = mapDefaultExpanded();
      mapState.k = 1; mapState.tx = 24; mapState.ty = 24; draw();
    };

    draw();
  }

  /* --------------------------------------------------------------- CSV */
  function downloadCsv(filename, rows) {
    var csv = rows.map(function (r) {
      return r.map(function (c) {
        var s = String(c == null ? "" : c);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(",");
    }).join("\n");
    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* --------------------------------------------------------------- router */
  var current = "home";

  function go(name) {
    name = VIEWS[name] ? name : "home";
    $$("#tabs .tab").forEach(function (t) {
      var on = t.getAttribute("data-view") === name;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-current", on ? "page" : "false");
    });
    $$(".view").forEach(function (v) { v.hidden = true; });
    var el = $("#view-" + name);
    el.hidden = false;
    el.innerHTML = VIEWS[name]();
    current = name;
    bind(el, name);
    window.scrollTo({ top: 0, behavior: "smooth" });
    announce(name + " loaded");
  }

  // Handlers are assigned, never added — go() re-renders and addEventListener
  // would stack duplicates on every visit.
  function bind(el, name) {
    if (name === "mapping") { bindMapping(); return; }

    var keepFocus = function (id) {
      setTimeout(function () {
        var n = $(id);
        if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
      }, 0);
    };

    var q = $("#dirQ", el);
    if (q) q.oninput = function () { state.q = q.value; go(current); keepFocus("#dirQ"); };
    var st = $("#dirState", el);
    if (st) st.onchange = function () { state.st = st.value; go(current); };
    var tr = $("#dirTrack", el);
    if (tr) tr.onchange = function () { state.track = tr.value; go(current); };
    var dm = $("#stDomain", el);
    if (dm) dm.onchange = function () { state.domain = dm.value; go(current); };

    var cq = $("#coreQ", el);
    if (cq) cq.oninput = function () { state.coreQ = cq.value; go(current); keepFocus("#coreQ"); };
    var cs = $("#coreState", el);
    if (cs) cs.onchange = function () { state.coreSt = cs.value; go(current); };

    el.onclick = function (e) {
      var th = e.target.closest("th[data-sort]");
      if (th) {
        var key = th.getAttribute("data-sort");
        if (state.sort === key) state.dir = -state.dir;
        else { state.sort = key; state.dir = 1; }
        return go(current);
      }
      if (e.target.closest("#coreCsv")) {
        var rows = [["Name", "Position", "Member State", "Core expertise"]];
        PEOPLE.forEach(function (p) {
          rows.push([p.name, p.level, (STATE_BY_NAME[p.state] || {}).label || p.state, p.areas.join("; ")]);
        });
        downloadCsv("gcc-network-core-expertise.csv", rows);
      }
    };
  }

  /* ----------------------------------------------------------------- init */
  $("#tabs").onclick = function (e) {
    var t = e.target.closest(".tab");
    if (t) go(t.getAttribute("data-view"));
  };

  $("#scope").onclick = function (e) {
    var b = e.target.closest("[data-scope]");
    if (b && b.getAttribute("data-scope") === "internal") window.location.href = "../index.html";
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
      state.coreQ = $("#siteSearch").value;
      go("core");
    });
  }

  go("home");
})();
