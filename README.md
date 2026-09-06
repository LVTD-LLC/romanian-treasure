# The Moscow Deposit

An evidence-linked investigation of the Romanian Treasure evacuated to Moscow in 1916–1917.

**Working finding:** the missing bank reserve has not been located. Published archival research favors early-1920s absorption or dispersal; the decisive original inventories and transfer annexes still need independent audit. Cultural objects require a separate, item-level provenance investigation.

## Read the investigation

- [Interactive review site](https://lvtd-llc.github.io/romanian-treasure/) — temporary GitHub Pages preview, published by the main-branch workflow.
- [Complete printable dossier](https://lvtd-llc.github.io/romanian-treasure/report.html).
- [Portable research text](site/case-file.md).
- [Structured dataset](site/data.json), [source register](site/sources.csv), [chronology](site/timeline.csv) and [research leads](site/research-leads.csv).

The current edition includes a roughly 14,000-word dossier, 43 source records, 35 timeline events, 12 exhibits, eight competing explanations and 12 actionable research leads. Every source states what was actually read, what remains inaccessible, and which evidence family it belongs to.

## Cloudflare hosting

The requested Cloudflare destination is prepared in [wrangler.jsonc](wrangler.jsonc), using **Workers Static Assets**. No API, database, runtime backend or browser-side credentials are needed. Cloudflare deployment has **not** been completed in this revision because account access was unavailable; the GitHub Pages link is a review preview, not a Cloudflare URL.

[Deploy through Cloudflare’s own account setup](https://deploy.workers.cloudflare.com/?url=https://github.com/LVTD-LLC/romanian-treasure)

Alternatively, connect this repository in Cloudflare Workers & Pages and deploy its existing `site/` directory with the included Wrangler configuration. The generated static files are committed; a build is optional. To regenerate them, use `npm run build`. Authenticate only through Cloudflare-owned setup or a protected credential store, never a chat message or a committed configuration file.

The deploy link is an external setup flow, not an embedded site or a verified deployment. Account selection and any Cloudflare-side authorization remain with the account owner.

## Local review

Only Python 3 is needed to serve the existing static site:

```sh
python3 tests/serve.py
```

Open `http://127.0.0.1:8765`. The complete `site/report.html` also works without JavaScript. For interactive review, serve the directory over HTTP instead of opening `index.html` with a `file:` URL, so the browser can load the research JSON.

## Development and verification

```sh
npm ci --include=dev
npm run build
npm run check:data
npx playwright install --with-deps chromium
npm test
npm test -- --repeat-each 10
npx wrangler deploy --dry-run
```

Tests exercise source discovery, evidence boundaries, route switches, timeline filtering, mobile overflow, deep-link navigation, notebook persistence, import/export, invalid imports, unavailable storage, no-JavaScript reading, failed-data fallback and automated WCAG A/AA checks. Automated accessibility results are not a claim of complete manual conformance.

## Research structure

- `research/build_data.py`: original source register, chronology, exhibits, hypotheses and leads.
- `research/report_chapters.json`: original narrative synthesis.
- `research/build_site.py`: portable reports, CSVs and static map generation.
- `site/`: the complete deployable artifact; no build service required at runtime.
- `tests/`: browser checks, local static server and data-integrity checks.

The generated Natural Earth map is committed so a clean checkout builds without the local research downloads. The original map data is public domain; modern borders are used only for orientation. Routes are schematic and individually qualified by evidence level.

## Reading depth and rights

Full research copies of some books and articles were obtained, with relevant passages inspected; this does not mean every page was read. Other books are previews or bibliographic leads. Published diplomatic allegations are not treated as proven shipments. Archive catalogue descriptions are not treated as inspected file contents.

Third-party books, scans, full-text extractions and research download folders are excluded from the repository and public assets. The site publishes original summaries, limited factual transcriptions and links to the source hosts. The public [research log](site/research-log.html) and [local-copy checksum manifest](site/research-manifest.json) disclose the approach and limits.

## Notebook privacy

Notes and pins are saved only in the current browser’s local storage. No account, analytics or external note service is used. Exports provide portable backups. Imports merge with existing notes; unpinning retains a note for later re-pinning. Moving from the preview domain to Cloudflare requires exporting and importing the notebook because browser storage is origin-specific.

## Scope

Research cutoff: **5 September 2026**. No paid acquisition, archive outreach, intermediary contact, legal claim or physical search has been undertaken. No current cache or physical recovery is claimed. Draft multilingual archive requests are included for the next phase.
