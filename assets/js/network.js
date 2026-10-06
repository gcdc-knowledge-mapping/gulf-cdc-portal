/* ===========================================================================
   GCC Network scope — the regional counterpart to assets/js/app.js.
   Mirrors its conventions: one IIFE, delegated handlers
   assigned with el.onclick (never addEventListener — views re-render), and no
   inline event handlers so the production CSP stays satisfied.
   =========================================================================== */
(function () {
  "use strict";

  var D = window.GCDC_NETWORK || {};
  var PEOPLE = D.people || [];
  var TAX = D.taxonomy || [];
  var COV = D.coverage || [];
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
  // Ranked horizontal bars. An item with `action` becomes keyboard-operable,
  // matching the internal Overview.
  function rankedBars(items, max) {
    return '<div class="bars">' + items.map(function (it) {
      var act = it.action
        ? ' role="button" tabindex="0" data-action="' + esc(it.action) +
          '" title="' + esc(it.actionHint || "Show details") + '"'
        : "";
      return '<div class="bar-row' + (it.action ? " is-clickable" : "") + '"' + act + ">" +
        '<span class="bar-row__label" title="' + esc(it.label) + '">' +
        (it.icon || "") + esc(it.label) + "</span>" +
        '<span class="bar-row__track"><span class="bar-row__fill" style="width:' +
        ((it.value / max) * 100) + "%;background:" + it.color + '"' +
        (it.tip ? ' data-tip="' + esc(it.tip) + '"' : "") + "></span></span>" +
        '<span class="bar-row__val">' + it.value + "</span></div>";
    }).join("") + "</div>";
  }

  var NET = "var(--net)";
  var CLS_COLOR = { good: "var(--st-good)", warn: "var(--st-warn)", serious: "var(--st-serious)", critical: "var(--st-critical)" };

  /* ------------------------------------------------------- shared UI bits */
  function kpi(value, label, note, accent, action, hint) {
    var tag = action ? "button" : "div";
    var attrs = action
      ? ' type="button" data-action="' + esc(action) + '" title="' + esc(hint || "") + '"'
      : "";
    return "<" + tag + ' class="card kpi' + (action ? " is-clickable" : "") +
      '" style="--kpi-accent:' + (accent || "var(--net)") + '"' + attrs + ">" +
      '<div class="kpi__value">' + esc(String(value)) + "</div>" +
      '<div class="kpi__label">' + esc(label) + "</div>" +
      (note ? '<div class="kpi__note">' + esc(note) + "</div>" : "") +
      (action ? '<span class="kpi__go" aria-hidden="true">→</span>' : "") +
      "</" + tag + ">";
  }
  function card(title, sub, body) {
    return '<div class="card"><div class="card__hd"><div class="card__title">' + esc(title) + "</div>" +
      (sub ? '<div class="card__sub">' + esc(sub) + "</div>" : "") + "</div>" + body + "</div>";
  }
  function head(title, lead) {
    return '<div class="view__head"><h1>' + esc(title) + "</h1><p>" + lead + "</p></div>";
  }
  // Active-filter chips — each individually removable, as on the internal side.
  function filterChips(items) {
    var on = items.filter(function (i) { return i.value; });
    if (!on.length) return "";
    return '<div class="chips"><span class="chips__lbl">Filtered by</span>' +
      on.map(function (i) {
        return '<button type="button" class="chip" data-clear="' + esc(i.clear) +
          '" aria-label="Remove filter ' + esc(i.label) + ': ' + esc(i.value) + '">' +
          esc(i.label) + ": <b>" + esc(i.value) + '</b> <span aria-hidden="true">✕</span></button>';
      }).join("") +
      (on.length > 1 ? '<button type="button" class="chip chip--all" data-clear="all">Clear all</button>' : "") +
      "</div>";
  }
  var toastTimer = null;
  function toast(msg) {
    var t = $("#toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast"; t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-on"); }, 2200);
    announce(msg);
  }
  function emptyState(msg) {
    return '<div class="empty"><div class="empty__icon" aria-hidden="true">🔍</div>' +
      "<p><b>" + esc(msg) + "</b></p>" +
      '<p class="muted">Try a different search term or Member State.</p>' +
      '<button type="button" class="btn" data-clear="all">Clear all filters</button></div>';
  }

  var NOMINATED_NOTE =
    "These experts were nominated by the six GCC Member States.";

  var state = {
    q: "", st: "", track: "",          // Experts
    coreQ: "", coreSt: "",             // Core Expertise
    domain: "",                        // Member States
    sort: "name", dir: 1
  };

  function stateLabel(name) {
    return (STATE_BY_NAME[name] || {}).label || name;
  }

  // Jump to another view with filters pre-applied (mirrors app.js jumpTo).
  function jumpTo(view, patch) {
    Object.keys(patch || {}).forEach(function (k) { state[k] = patch[k]; });
    go(view);
  }

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

      '<div class="grid grid--2" style="margin-top:26px">' +
      card("About Knowledge Mapping", "",
        '<p style="color:var(--ink-2)">An institutional initiative to develop a comprehensive map of health ' +
        "expertise across the Center and GCC countries. It identifies and documents employees’ specialized " +
        "knowledge and skills, classifies them within a unified public health framework, and serves as a " +
        "reference for determining areas of expertise, proficiency levels, and their distribution across " +
        "departments.</p>") +
      card("Purpose", "",
        '<p style="color:var(--ink-2)">To identify, document, and connect knowledge and expertise across the ' +
        "organization, ensuring access to the right knowledge at the right time. This supports informed " +
        "decision-making, ensures business continuity, maximizes the use of institutional expertise, and " +
        "reduces the risk of knowledge loss.</p>") +
      "</div>" +

      '<div class="home-stats">' +
      '<div class="card home-stat"><div class="home-stat__num">' + M.people + "</div>" +
        '<div class="home-stat__label">Network experts</div>' +
        '<div class="home-stat__note">PCN, CLOs, Working Group members</div></div>' +
      '<div class="card home-stat"><div class="home-stat__num">' + M.states + "</div>" +
        '<div class="home-stat__label">Member States</div>' +
        '<div class="home-stat__flags">' + STATES.map(function (s) {
          return '<img class="flag" src="' + FLAG_DIR + esc(s.flag) + '" width="26" alt="' +
            esc(s.label) + '" title="' + esc(s.label) + '" />';
        }).join("") + "</div></div>" +
      '<div class="card home-stat"><div class="home-stat__num">' + (D.byDomain || []).length + "</div>" +
        '<div class="home-stat__label">Domains of experience</div>' +
        '<div class="home-stat__note">' + M.tags + " core expertise tags recorded</div></div>" +
      "</div>";
  };

  VIEWS.overview = function () {
    // Areas with no holder are left out: a zero reflects who answered the
    // survey, not an absence of the expertise across the GCC.
    var segs = [
      { label: "Adequate (3+ holders)", value: M.adequate, color: CLS_COLOR.good },
      { label: "Thin (2 holders)", value: M.thin, color: CLS_COLOR.warn },
      { label: "Sole expert (1)", value: M.sole, color: CLS_COLOR.serious }
    ];
    var fragile = Math.round(((M.sole + M.thin) / M.covered) * 100);

    // Member State bars follow the requested column order, not a ranking.
    var byState = STATES.map(function (s) {
      var row = (D.byState || []).filter(function (b) { return b.state === s.name; })[0] || { people: 0, areas: 0 };
      return {
        label: s.label, value: row.people, color: NET, icon: flagImg(s.name, 20),
        action: "state:" + s.name,
        actionHint: "Show " + s.label + " experts",
        tip: row.areas + " core areas covered"
      };
    });
    var stateMax = Math.max.apply(null, byState.map(function (s) { return s.value; })) || 1;
    var domMax = Math.max.apply(null, (D.byDomain || []).map(function (d) { return d.areas; })) || 1;

    return head("Knowledge Mapping — GCC Network",
      "A live picture of where public health expertise sits across the GCC Permanent Contact Network, " +
      "Country Liaison Officers and Working Group members: <b>" + M.people + " experts</b> across <b>" +
      M.states + " Member States</b>, mapped to " + (D.byDomain || []).length + " domains and " +
      M.areas + " core expertise areas. " + NOMINATED_NOTE) +

      '<div class="grid grid--kpi">' +
        kpi(M.people, "Network experts", M.states + " Member States", "var(--net)", "view:directory", "Open the expert directory") +
        kpi(M.covered + " / " + M.areas, "Taxonomy areas covered", M.tags + " core expertise tags", "var(--accent)", "view:states", "See coverage by Member State") +
        kpi(M.sole, "Sole regional expert", "Only one holder in the network", "var(--st-serious)", "view:states", "See where the network is thin") +
        kpi(M.external, "Externally consulted", "advise WHO / Member States / partners", "var(--st-good)", "view:directory", "Show externally consulted experts") +
      "</div>" +

      '<div class="grid grid--2" style="margin-top:16px">' +
        '<div class="card"><div class="card__hd"><div class="card__title">Expertise coverage</div>' +
        '<div class="card__sub">How many of the ' + M.covered + " areas the network holds are resilient vs. fragile</div></div>" +
        '<div class="donut-wrap">' +
        donut(segs, { centerNum: M.covered, centerLbl: "areas held", aria: "Network coverage by status" }) +
        '<div style="flex:1;min-width:150px">' + legend(segs) +
        '<p class="card__sub" style="margin-top:12px">' + fragile +
        "% of the areas the network holds rest on one or two people across the whole region.</p></div></div>" +
        '<dl class="deflist">' +
        '<div><dt><span class="legend__swatch" style="background:var(--st-good)"></span> Adequate</dt>' +
        "<dd>Three or more experts across the GCC hold the area as core expertise — deep enough to anchor a regional Community of Practice.</dd></div>" +
        '<div><dt><span class="legend__swatch" style="background:var(--st-warn)"></span> Thin</dt>' +
        "<dd>Exactly two holders region-wide. Workable today, but one departure leaves a single regional expert.</dd></div>" +
        '<div><dt><span class="legend__swatch" style="background:var(--st-serious)"></span> Sole expert</dt>' +
        "<dd>One person in the entire network holds this area. The region depends on a single individual — the highest continuity risk.</dd></div>" +
        "</dl></div>" +

        '<div class="card"><div class="card__hd"><div class="card__title">Experts by Member State</div>' +
        '<div class="card__sub">Where the network\'s depth sits — click a bar to open that country\'s experts</div></div>' +
        rankedBars(byState, stateMax) + "</div>" +
      "</div>" +

      '<div class="card" style="margin-top:16px">' +
        '<div class="card__hd"><div class="card__title">Coverage by domain</div>' +
        '<div class="card__sub">Areas held by at least one network expert, out of all areas in the domain</div></div>' +
        rankedBars((D.byDomain || []).map(function (d) {
          return {
            label: d.domain, value: d.covered,
            color: d.covered === d.areas ? CLS_COLOR.good : NET,
            tip: d.covered + " of " + d.areas + " areas covered",
            action: "domain:" + d.domain,
            actionHint: "Show " + d.domain + " in Member States"
          };
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
    var sortAttr = function (key) {
      return state.sort === key ? (state.dir === 1 ? "ascending" : "descending") : "none";
    };

    return head("Core Expertise",
      "Every network expert and the areas they hold at <em>core</em> expertise level, with the Member State " +
      "they represent. Filter by country, or search by name or expertise.") +

      '<div class="toolbar">' +
        '<div class="field field--search"><span class="field__icon" aria-hidden="true">⌕</span>' +
        '<input type="search" id="coreQ" data-view-search placeholder="Search name or expertise…  (press /)" ' +
        'aria-label="Search core expertise" value="' + esc(state.coreQ) + '"></div>' +
        '<div class="field"><select id="coreState" aria-label="Filter by Member State">' +
        '<option value="">All Member States</option>' +
        STATES.map(function (s) {
          return '<option value="' + esc(s.name) + '"' + (state.coreSt === s.name ? " selected" : "") + ">" + esc(s.label) + "</option>";
        }).join("") + "</select></div>" +
        '<button type="button" class="btn btn--ghost" id="coreCsv" title="Download the filtered list as CSV">⭳ Export CSV</button>' +
        '<span class="count" role="status">' + list.length + " of " + PEOPLE.length + " experts</span>" +
      "</div>" +
      filterChips([
        { label: "Search", value: state.coreQ, clear: "coreQ" },
        { label: "Member State", value: state.coreSt ? stateLabel(state.coreSt) : "", clear: "coreSt" }
      ]) +
      (list.length
        ? '<div class="table-wrap"><table class="data data--stack"><thead><tr>' +
          '<th data-sort="name" aria-sort="' + sortAttr("name") + '">Name<span class="arrow">' + arrow("name") + "</span></th>" +
          '<th data-sort="state" aria-sort="' + sortAttr("state") + '">Member State<span class="arrow">' + arrow("state") + "</span></th>" +
          '<th class="no-sort">Core expertise</th></tr></thead><tbody>' +
          list.map(function (p) {
            return '<tr><td data-label="Name"><b>' + esc(p.name) + "</b>" +
              '<div style="font-size:12px;color:var(--ink-muted)">' + esc(p.level) + "</div></td>" +
              '<td data-label="Member State">' + flagChip(p.state) + "</td>" +
              '<td data-label="Core expertise"><div class="netcard__areas">' +
              (p.areas.length
                ? p.areas.map(function (a) {
                    return '<button type="button" class="tag-chip is-clickable" data-area="' + esc(a) +
                      '" title="Find this area in the expertise map">' + esc(a) + "</button>";
                  }).join("")
                : '<span class="muted">—</span>') +
              "</div></td></tr>";
          }).join("") + "</tbody></table></div>"
        : emptyState("No expert matches these filters."));
  };

  /* --------------------------------------------------------- Experts */
  VIEWS.directory = function () {
    var list = PEOPLE.filter(function (p) {
      if (state.st && p.state !== state.st) return false;
      if (state.track && p.track !== state.track) return false;
      if (state.q) {
        var hay = (p.name + " " + p.state + " " + p.level + " " + p.entity + " " + p.email + " " + p.areas.join(" ")).toLowerCase();
        if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
      }
      return true;
    });

    return head("Experts",
      "A profile for every expert in the network: position, institution, Member State, work email and the areas " +
      "they hold at core expertise level. " + NOMINATED_NOTE) +

      '<div class="toolbar">' +
        '<div class="field field--search"><span class="field__icon" aria-hidden="true">⌕</span>' +
        '<input type="search" id="dirQ" data-view-search placeholder="Search name, institution, email or expertise…  (press /)" ' +
        'aria-label="Search the directory" value="' + esc(state.q) + '"></div>' +
        '<div class="field"><select id="dirState" aria-label="Filter by Member State">' +
        '<option value="">All Member States</option>' +
        STATES.map(function (s) {
          return '<option value="' + esc(s.name) + '"' + (state.st === s.name ? " selected" : "") + ">" + esc(s.label) + "</option>";
        }).join("") + "</select></div>" +
        '<div class="field"><select id="dirTrack" aria-label="Filter by track">' +
        '<option value="">All tracks</option>' +
        ["Managerial", "Professional"].map(function (v) {
          return '<option value="' + v + '"' + (state.track === v ? " selected" : "") + ">" + v + "</option>";
        }).join("") + "</select></div>" +
        '<button type="button" class="btn btn--ghost" id="dirCsv" title="Download the filtered list as CSV">⭳ Export CSV</button>' +
        '<span class="count" role="status">' + list.length + " of " + PEOPLE.length + " experts</span>" +
      "</div>" +
      filterChips([
        { label: "Search", value: state.q, clear: "q" },
        { label: "Member State", value: state.st ? stateLabel(state.st) : "", clear: "st" },
        { label: "Track", value: state.track, clear: "track" }
      ]) +
      (list.length
        ? '<div class="net-grid">' + list.map(function (p) {
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
                return '<button type="button" class="tag-chip is-clickable" data-area="' + esc(a) +
                  '" title="Find this area in the expertise map">' + esc(a) + "</button>";
              }).join("") + "</div>" +
              '<div class="contact__actions">' +
                (p.email
                  ? '<a class="contact__email" href="mailto:' + esc(p.email) + '" title="Send an email">' +
                    '<span aria-hidden="true">✉</span> <span>' + esc(p.email) + "</span></a>" +
                    '<button type="button" class="icon-btn" data-copy="' + esc(p.email) +
                    '" title="Copy email address" aria-label="Copy ' + esc(p.email) + '">⧉</button>'
                  : '<span class="contact__email" style="pointer-events:none">' +
                    '<span aria-hidden="true">✉</span> <span>—</span></span>') +
              "</div>" +
            "</article>";
          }).join("") + "</div>"
        : emptyState("No expert matches these filters."));
  };

  VIEWS.states = function () {
    var rows = COV.filter(function (c) { return !state.domain || c.domain === state.domain; });
    var domains = [];
    COV.forEach(function (c) { if (domains.indexOf(c.domain) === -1) domains.push(c.domain); });

    var thead = "<tr><th>Core expertise area</th>" + STATES.map(function (s) {
      return '<th><span class="heat__state">' +
        '<img class="flag flag--lg" src="' + FLAG_DIR + esc(s.flag) + '" width="30" alt="" />' +
        '<span class="heat__name">' + esc(s.label) + "</span></span></th>";
    }).join("") + "<th>Total</th><th>States</th></tr>";

    var tbody = rows.map(function (c) {
      return '<tr><td class="area">' + esc(c.area) + "</td>" + STATES.map(function (s) {
        var n = c.by[s.name] || 0;
        var h = n === 0 ? "h0" : n === 1 ? "h1" : n === 2 ? "h2" : "h3";
        return '<td class="cell ' + h + '" title="' + esc(s.label) + ": " + n +
          " holder" + (n === 1 ? "" : "s") + '">' + (n || "·") + "</td>";
      }).join("") + '<td class="cell"><b>' + c.total + "</b></td>" +
        '<td class="cell">' + c.states + "</td></tr>";
    }).join("");

    return head("Member States",
      "Which Member State holds each area of core expertise. A darker cell means more holders in that country; " +
      "a row covered by a single state is a regional concentration risk, and an empty row has no holder anywhere " +
      "in the network.") +

      '<div class="toolbar">' +
        '<div class="field"><select id="stDomain" aria-label="Filter by domain">' +
        '<option value="">All domains</option>' +
        domains.map(function (d) {
          return '<option value="' + esc(d) + '"' + (state.domain === d ? " selected" : "") + ">" + esc(d) + "</option>";
        }).join("") + "</select></div>" +
        '<button type="button" class="btn btn--ghost" id="stCsv" title="Download this table as CSV">⭳ Export CSV</button>' +
        '<span class="count" role="status">' + rows.length + " of " + COV.length + " areas</span>" +
      "</div>" +
      filterChips([{ label: "Domain", value: state.domain, clear: "domain" }]) +
      (rows.length
        ? '<div class="card"><div class="scroll-y"><table class="heat"><thead>' + thead +
          "</thead><tbody>" + tbody + "</tbody></table></div></div>"
        : emptyState("No area matches this filter."));
  };
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
    return head("Expertise Mapping",
      "The full GCC network hierarchy as an interactive tree — Network → Domain → Sub-domain → Core expertise → " +
      "Holder, with each holder's Member State shown as a flag. Click a node to expand or collapse its branch; " +
      "drag to pan and scroll to zoom. Clicking a person opens them in Core Expertise.") +
      '<div class="toolbar">' +
      '<div class="field field--search"><span class="field__icon" aria-hidden="true">⌕</span>' +
      '<input type="search" id="mapq" data-view-search placeholder="Search the tree…  (press /)" aria-label="Search mapping tree" value="' + esc(mapState.q) + '"></div>' +
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
    toast("Downloaded " + filename);
  }

  function peopleRows(list) {
    var rows = [["Name", "Position", "Institution", "Member State", "Track", "Email", "Core expertise"]];
    list.forEach(function (p) {
      rows.push([p.name, p.level, p.entity, stateLabel(p.state), p.track, p.email, p.areas.join("; ")]);
    });
    return rows;
  }

  // Clipboard API is unavailable over plain HTTP and in older browsers.
  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (err) { void err; }
    ta.remove();
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
    if (location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
    window.scrollTo({ top: 0, behavior: "auto" });
    announce(name + " loaded");
  }

  // Keep the caret where it was after a re-render triggered by typing.
  function keepFocus(id) {
    setTimeout(function () {
      var n = $(id);
      if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
    }, 0);
  }

  // Handlers are assigned, never added — go() re-renders and addEventListener
  // would stack duplicates on every visit.
  function bind(el, name) {
    if (name === "mapping") { bindMapping(); return; }

    var q = $("#dirQ", el);
    if (q) q.oninput = function () { state.q = q.value; go(current); keepFocus("#dirQ"); };
    var st = $("#dirState", el);
    if (st) st.onchange = function () { state.st = st.value; go(current); };
    var tr = $("#dirTrack", el);
    if (tr) tr.onchange = function () { state.track = tr.value; go(current); };

    var cq = $("#coreQ", el);
    if (cq) cq.oninput = function () { state.coreQ = cq.value; go(current); keepFocus("#coreQ"); };
    var cs = $("#coreState", el);
    if (cs) cs.onchange = function () { state.coreSt = cs.value; go(current); };

    var dm = $("#stDomain", el);
    if (dm) dm.onchange = function () { state.domain = dm.value; go(current); };

    // Ranked bars are role="button", so they must answer Enter and Space too.
    el.onkeydown = function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var row = e.target.closest('.bar-row[data-action]');
      if (!row) return;
      e.preventDefault();
      row.click();
    };

    el.onclick = function (e) {
      // Copy an email address, with a fallback for insecure contexts.
      var copy = e.target.closest("[data-copy]");
      if (copy) {
        var addr = copy.getAttribute("data-copy");
        var ok = function () { toast("Copied " + addr); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(addr).then(ok, function () { legacyCopy(addr); ok(); });
        } else { legacyCopy(addr); ok(); }
        return;
      }

      // KPI tiles and ranked bars carry an action: "view:x", "state:x", "domain:x"
      var act = e.target.closest("[data-action]");
      if (act) {
        var a = act.getAttribute("data-action");
        var kind = a.slice(0, a.indexOf(":"));
        var val = a.slice(a.indexOf(":") + 1);
        if (kind === "view") return jumpTo(val, {});
        if (kind === "state") return jumpTo("directory", { st: val, q: "", track: "" });
        if (kind === "domain") return jumpTo("states", { domain: val });
        return;
      }

      // Removable filter chips
      var clear = e.target.closest("[data-clear]");
      if (clear) {
        var what = clear.getAttribute("data-clear");
        if (what === "all") { state.q = ""; state.st = ""; state.track = ""; state.coreQ = ""; state.coreSt = ""; state.domain = ""; }
        else state[what] = "";
        return go(current);
      }

      // An expertise chip finds that area in the map
      var area = e.target.closest("[data-area]");
      if (area) {
        mapState.q = area.getAttribute("data-area");
        return go("mapping");
      }

      // Sortable table headers
      var th = e.target.closest("th[data-sort]");
      if (th) {
        var key = th.getAttribute("data-sort");
        if (state.sort === key) state.dir = -state.dir;
        else { state.sort = key; state.dir = 1; }
        return go(current);
      }

      if (e.target.closest("#coreCsv")) {
        var coreList = PEOPLE.filter(function (p) {
          if (state.coreSt && p.state !== state.coreSt) return false;
          if (state.coreQ) {
            var hay = (p.name + " " + p.state + " " + p.areas.join(" ")).toLowerCase();
            if (hay.indexOf(state.coreQ.toLowerCase()) === -1) return false;
          }
          return true;
        });
        return downloadCsv("gcc-network-core-expertise.csv", peopleRows(coreList));
      }
      if (e.target.closest("#dirCsv")) {
        var dirList = PEOPLE.filter(function (p) {
          if (state.st && p.state !== state.st) return false;
          if (state.track && p.track !== state.track) return false;
          if (state.q) {
            var hay = (p.name + " " + p.state + " " + p.level + " " + p.entity + " " + p.email + " " + p.areas.join(" ")).toLowerCase();
            if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
          }
          return true;
        });
        return downloadCsv("gcc-network-experts.csv", peopleRows(dirList));
      }
      if (e.target.closest("#stCsv")) {
        var head1 = ["Domain", "Core expertise area"].concat(STATES.map(function (s) { return s.label; }), ["Total", "States covering"]);
        var rows = [head1];
        COV.filter(function (c) { return !state.domain || c.domain === state.domain; }).forEach(function (c) {
          rows.push([c.domain, c.area].concat(STATES.map(function (s) { return c.by[s.name] || 0; }), [c.total, c.states]));
        });
        return downloadCsv("gcc-network-member-state-coverage.csv", rows);
      }
    };
  }

  /* ----------------------------------------------------------------- init */
  $("#tabs").onclick = function (e) {
    var t = e.target.closest(".tab");
    if (t) go(t.getAttribute("data-view"));
  };
  window.addEventListener("hashchange", function () {
    go(location.hash.replace("#", ""));
  });

  var themeToggle = $("#themeToggle");
  if (themeToggle) {
    themeToggle.onclick = function () {
      var root = document.documentElement;
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("gcdc-theme", next); } catch (err) { void err; }
      go(current); // re-render so SVG colours pick up the new tokens
    };
  }
  try {
    var saved = localStorage.getItem("gcdc-theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
      document.documentElement.setAttribute("data-theme", "dark");
  } catch (err) { void err; }

  // "/" focuses the current view's search box; Escape clears it.
  document.addEventListener("keydown", function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || "";
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag);
    if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
      var box = $(".view:not([hidden]) [data-view-search]") || $("#siteSearch");
      if (box) { e.preventDefault(); box.focus(); box.select(); }
      return;
    }
    if (e.key === "Escape" && typing) {
      var cur = document.activeElement;
      if (cur.value) {
        cur.value = "";
        cur.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        cur.blur();
      }
    }
  });

  // Back-to-top button appears once the page is scrolled
  var toTop = document.createElement("button");
  toTop.type = "button";
  toTop.id = "toTop";
  toTop.className = "to-top";
  toTop.title = "Back to top";
  toTop.setAttribute("aria-label", "Back to top");
  toTop.innerHTML = '<span aria-hidden="true">↑</span>';
  toTop.onclick = function () { window.scrollTo({ top: 0, behavior: "smooth" }); };
  document.body.appendChild(toTop);
  var onScroll = function () { toTop.classList.toggle("is-on", window.scrollY > 400); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var form = $("#siteSearchForm");
  if (form) form.addEventListener("submit", function (e) { e.preventDefault(); });
  var siteSearch = $("#siteSearch");
  if (siteSearch) {
    siteSearch.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      state.coreQ = siteSearch.value.trim();
      state.coreSt = "";
      go("core");
    });
  }

  /* ------------------------------------------------------------------ boot */
  go(location.hash.replace("#", "") || "home");
})();
