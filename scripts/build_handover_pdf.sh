#!/bin/bash
# Rebuild the handover PDF from the Markdown source.
set -e
SP="${1:-$(mktemp -d)}"; SRC="${2:-docs/HOSTING_HANDOVER.md}"
OUT="${3:-Knowledge-Mapping-Hosting-Handover.pdf}"
TITLE="${4:-Knowledge Mapping Page — hosting handover}"
cp scripts/handover.css "$SP/doc.css"; cp scripts/html_to_pdf.js "$SP/topdf.js"
pandoc "$SRC" -f gfm -t html5 --wrap=none -o "$SP/body.html"
python3 -I - "$SP" "$TITLE" <<'PY'
import base64, sys
sp, title = sys.argv[1], sys.argv[2]
body = open(f"{sp}/body.html", encoding="utf-8").read()
css  = open(f"{sp}/doc.css", encoding="utf-8").read()
logo = base64.b64encode(open("assets/img/gcdc-logo-lockup.png","rb").read()).decode()
open(f"{sp}/doc.html","w",encoding="utf-8").write(f"""<!doctype html><html lang="en"><head>
<meta charset="utf-8"><title>{title}</title><style>{css}</style></head><body>
<div class="masthead"><img src="data:image/png;base64,{logo}" alt="">
<div class="org"><b>Gulf Center for Disease Prevention and Control</b>
Knowledge Management · Training and Capacity Building</div></div>
{body}</body></html>""")
PY
node "$SP/topdf.js" "$SP/doc.html" "$OUT" "$TITLE"
