const { chromium } = require("playwright");
const path = process.argv[2], out = process.argv[3], title = process.argv[4];
(async () => {
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.goto("file://" + path, { waitUntil: "networkidle" });
  await p.pdf({
    path: out, format: "A4", printBackground: true,
    margin: { top: "18mm", bottom: "16mm", left: "18mm", right: "18mm" },
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:7pt;color:#8a97a3;width:100%;padding:0 18mm;
      font-family:Segoe UI,Arial,sans-serif;">${title}</div>`,
    footerTemplate: `<div style="font-size:7.5pt;color:#8a97a3;width:100%;padding:0 18mm;
      font-family:Segoe UI,Arial,sans-serif;display:flex;justify-content:space-between;">
      <span>Gulf CDC · Knowledge Management</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
  });
  await b.close();
  console.log("written:", out);
})();
