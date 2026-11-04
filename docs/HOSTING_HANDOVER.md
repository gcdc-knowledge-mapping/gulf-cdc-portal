# Knowledge Mapping Page — hosting handover

| | |
|---|---|
| **To** | GCDC Information Technology |
| **From** | Faris Aldammas — Knowledge Management, Training and Capacity Building |
| **Subject** | Hosting the Knowledge Mapping Page on a Center-managed address |

---

## 1. What we are asking for

Please host this page on Center infrastructure, in whatever way fits your
standards, so that:

1. **Only signed-in GCDC staff can open it.** It currently sits on a public
   address where anyone with the link can read it.
2. **It is reachable at a Center address**, ideally something like
   `knowledge.gulfcdc.org`.
3. **It can be linked or embedded** in the Knowledge Management portal at
   `https://sghorgsa.sharepoint.com/sites/GCDCPortal`.

**The method is entirely yours to choose.** This document deliberately
prescribes none — it only describes what the page is, so you can judge what
suits it. If a worked example for one particular platform would help, say so
and we will prepare it.

---

## 2. What the page actually is

A **static web site**. Plain HTML, CSS and JavaScript files, served as files.

| | |
|---|---|
| Total size | **536 KB**, 17 files |
| Server-side code | **None** |
| Database | **None** |
| API or back end | **None** |
| Secrets, keys, connection strings | **None** |
| Build step or compiler | **None** — the files are served exactly as they are |
| Runtime dependency | **None** — no Node, no PHP, no .NET, no framework |
| External requests at run time | **None** — all CSS, JavaScript, data, fonts and images are self-hosted. The page loads nothing from the internet |

Anything that can serve a folder of files over HTTPS can host it: a web server,
an intranet file share published over HTTP, a SharePoint document library, a
cloud static-hosting service, a container. It also runs correctly opened
straight from disk, which is a useful way to inspect it before deciding.

Because there is no server-side component, the usual server attack surface —
injection, deserialisation, dependency vulnerabilities, credential leakage — does
not apply here. The security questions that remain are **who may open it** and
**which response headers it is served with**.

---

## 3. What it contains

Two sections of the same page:

- **Internal GCDC** — core expertise for 31 staff across 5 departments.
- **GCC Network** — core expertise for 68 Permanent Contact Network members,
  Country Liaison Officers and Working Group members nominated by the six GCC
  Member States.

Both carry names, positions, institutions and **work e-mail addresses**. That is
the reason for requirement 1: this information is appropriate for GCDC staff to
see, and not appropriate to leave on an address open to the public internet and
to address-harvesting crawlers.

---

## 4. Response headers we would like kept

Whatever platform you choose, the page is written to be served with these. They
are not required for it to function, but they are what makes it safe to embed
and prevents it from being framed by third parties.

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'self' https://*.sharepoint.com; base-uri 'self'; form-action 'self'` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Cache-Control` | `no-cache` — the data is updated periodically and should not be served stale |

The `frame-ancestors` entry is what allows the page to be embedded in the
SharePoint portal (requirement 3) while blocking every other site from framing
it. If embedding is not wanted, that part can be dropped.

The page contains **no inline scripts and no inline event handlers**, so the
strict `script-src 'self'` above holds with no exceptions. It has been tested
under exactly these headers.

---

## 5. Where the files are

Repository: `https://github.com/gcdc-knowledge-mapping/gulf-cdc-portal`
(branch `main`). The site is the root `index.html`, `network/`, and `assets/`.

Three ways to take delivery, whichever suits your process:

- **Pull from the repository** — most platforms can deploy from it directly and
  redeploy automatically whenever the content is updated.
- **A copy of the files** — we can send a zip. It is 536 KB and needs no
  processing of any kind.
- **Access to the repository** — we can grant your account access, or transfer
  ownership of it to a Center-owned account entirely.

The page is updated when the underlying analysis changes, perhaps a few times a
year. If the platform you choose deploys from the repository, those updates are
automatic. If you take a copy of the files instead, we will send a new copy and
you replace the folder — there is nothing to migrate or reinstall.

---

## 6. What happens to the current public address

Once the page is live on a Center address, the existing public one
(`https://gcdc-knowledge-mapping.github.io/gulf-cdc-portal/`) will be switched
off and the repository made private. Please tell us when to do this, so there is
no gap in availability for colleagues already using it.

---

## 7. Contact

Faris Aldammas — Knowledge Management, Training and Capacity Building.
Happy to walk through the page, answer anything here, or sit with whoever picks
this up.
