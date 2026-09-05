"""Generate a complete, JavaScript-free reading copy and portable research exports."""
from pathlib import Path
import csv
import hashlib
import html
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'
DATA = json.loads((SITE / 'data.json').read_text())
esc = html.escape

def rich(text):
    return re.sub(r'\[(S\d{2})\]', lambda m: f'<a class="citation" href="#{m[1]}">{m[1]}</a>', esc(str(text)))

def refs(ids):
    return '<p class="fine">Sources: ' + ' '.join(f'<a class="citation" href="#{id}">{id}</a>' for id in ids) + '</p>'

def page(title, body):
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#172f37"><title>{esc(title)} — The Moscow Deposit</title><link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="style.css"><script src="print.js" defer></script></head><body><main class="report-body"><nav class="report-nav" aria-label="Report navigation"><a href="index.html">← Interactive case file</a><a href="report.html">Complete dossier</a><a href="research-log.html">Research log</a><a href="case-file.md" download>Download text ↓</a><button data-print>Print / save PDF</button></nav>{body}<footer class="footer">Original research synthesis · Evidence cutoff 5 September 2026 · No recovery claimed.</footer></main></body></html>'''

sections = []
md = ['# The Moscow Deposit', '', 'Romanian Treasure — evidence-linked case file', '', 'Research cutoff: 5 September 2026. No treasure has been located or recovered.', '', DATA['meta']['scope'], '']
sections.append('<p class="eyebrow">ROMANIAN TREASURE · COMPLETE DOSSIER</p><h1>The Moscow Deposit</h1><p class="section-intro">Follow the gold. Keep the receipts.</p><p class="note-strip"><strong>Research finding:</strong> No authenticated present holding of the missing BNR reserve was located. Published evidence favors early-1920s absorption or dispersal; decisive original inventories and transfer annexes still require independent audit.</p>')
sections.append('<p>Research edition 1.0 · Evidence cutoff: 5 September 2026. '+esc(DATA['meta']['scope'])+'</p>')
sections.append('<h2>Inside the dossier</h2><ol>'+''.join(f'<li><a href="#chapter-{i}">{esc(chapter["title"])}</a></li>' for i,chapter in enumerate(DATA['chapters'],1))+'</ol><p><a href="#all-exhibits">Evidence exhibits</a> · <a href="#all-events">Complete chronology</a> · <a href="#all-hypotheses">Hypothesis tests</a> · <a href="#all-leads">Research requests</a> · <a href="#all-sources">Source register</a></p>')
for i, chapter in enumerate(DATA['chapters'],1):
    sections.append(f'<section class="report-section" id="chapter-{i}"><p class="eyebrow">CHAPTER {i:02}</p><h2>{esc(chapter["title"])}</h2>'+''.join(f'<p>{rich(p)}</p>' for p in chapter['paragraphs'])+'</section>')
    md += ['## '+chapter['title'], '', '\n\n'.join(chapter['paragraphs']), '']

sections.append('<section class="report-section" id="all-exhibits"><h2>Evidence exhibits</h2>')
md += ['## Evidence exhibits','']
for item in DATA['exhibits']:
    sections.append(f'<article id="{item["id"]}"><p class="eyebrow">{item["id"]} · {esc(item["status"])}</p><h3>{esc(item["title"])}</h3><p><em>{esc(item["question"])}</em></p><p><strong>{esc(item["finding"])}</strong></p><p>{esc(item["detail"])}</p><p class="test-box"><strong>Next proof:</strong> {esc(item["next"])}</p>{refs(item["sources"])}</article>')
    md += [f'### {item["id"]}: {item["title"]}', '', item['status'], '', item['finding'], '', item['detail'], '', 'Next proof: '+item['next'], '', 'Sources: '+', '.join(item['sources']), '']
sections.append('</section>')

sections.append('<section class="report-section" id="all-events"><h2>Complete chronology</h2>')
md += ['## Complete chronology','']
for item in DATA['timeline']:
    sections.append(f'<article id="{item["id"]}"><p class="eyebrow">{item["id"]} · {esc(item["date"])}</p><h3>{esc(item["title"])}</h3><p class="fine">{esc(item["track"])} · {esc(item["status"])}</p><p>{esc(item["body"])}</p><p class="limitations"><strong>Limit:</strong> {esc(item["limits"])}</p>{refs(item["sources"])}</article>')
    md += [f'### {item["id"]}: {item["date"]} — {item["title"]}', '', f'{item["track"]} / {item["status"]}', '', item['body'], '', 'Limit: '+item['limits'], '', 'Sources: '+', '.join(item['sources']), '']
sections.append('</section>')

sections.append('<section class="report-section" id="all-hypotheses"><h2>Hypothesis tests</h2>')
md += ['## Hypothesis tests','']
for item in DATA['hypotheses']:
    sections.append(f'<article id="{item["id"]}"><h3>{item["id"]} · {esc(item["title"])}</h3><p><strong>{esc(item["assessment"])}</strong></p><p><strong>Supports:</strong> {esc(item["pro"])}</p><p><strong>Against / limits:</strong> {esc(item["against"])}</p><p class="test-box"><strong>Test:</strong> {esc(item["test"])}</p>{refs(item["sources"])}</article>')
    md += [f'### {item["id"]}: {item["title"]}', '', item['assessment'], '', 'Supports: '+item['pro'], '', 'Against / limits: '+item['against'], '', 'Test: '+item['test'], '', 'Sources: '+', '.join(item['sources']), '']
sections.append('</section>')

sections.append('<section class="report-section" id="all-leads"><h2>Next moves: concrete research requests</h2><p class="note-strip">Drafts only. None has been sent; no acquisition or fieldwork has been undertaken.</p>')
md += ['## Research requests — drafts, not sent','']
for item in DATA['leads']:
    sections.append(f'<article id="{item["id"]}"><p class="eyebrow">{item["priority"]}</p><h3>{item["id"]} · {esc(item["title"])}</h3><p>{esc(item["goal"])}</p><p><strong>Basis:</strong> {esc(item["basis"])}</p><div class="request-text">{esc(item["request"])}</div><p><strong>Success:</strong> {esc(item["success"])}</p><p><strong>Stop / downgrade:</strong> {esc(item["stop"])}</p><p class="limitations"><strong>Access:</strong> {esc(item["access"])}</p>{refs(item["sources"])}</article>')
    md += [f'### {item["id"]}: {item["title"]}', '', item['priority'], '', item['goal'], '', 'Basis: '+item['basis'], '', 'Draft request:\n\n'+item['request'], '', 'Success: '+item['success'], '', 'Stop / downgrade: '+item['stop'], '', 'Access: '+item['access'], '', 'Sources: '+', '.join(item['sources']), '']
sections.append('</section>')

sections.append('<section class="report-section" id="all-sources"><h2>Source register</h2><p>Reading depth and shared evidence families are explicit. Source links open external material; a catalogue link does not imply that the underlying file was read.</p>')
md += ['## Source register','']
for item in DATA['sources']:
    sections.append(f'<article class="source-card" id="{item["id"]}"><p class="eyebrow">{item["id"]} · {esc(item["language"])}</p><h3>{esc(item["title"])}</h3><p>{esc(item["author"])} · {esc(item["date"])}</p><p><strong>Access:</strong> {esc(item["access"])}</p><p class="source-locator">{esc(item["locator"])}</p><p><strong>Contribution:</strong> {esc(item["finding"])}</p><p class="limitations"><strong>Limit:</strong> {esc(item["caution"])}</p><p><a class="source-link" href="{esc(item["url"])}">Open source</a></p><p class="source-family">Evidence family: {esc(item["family"])}</p></article>')
    md += [f'### {item["id"]}: {item["title"]}', '', f'{item["author"]} · {item["date"]} · {item["language"]}', '', 'Access: '+item['access'], '', 'Locator: '+item['locator'], '', item['finding'], '', 'Limit: '+item['caution'], '', 'Evidence family: '+item['family'], '', item['url'], '']
sections.append('</section>')
(SITE/'report.html').write_text(page('Complete dossier','\n'.join(sections)))
(SITE/'case-file.md').write_text('\n'.join(md).rstrip()+'\n')

for filename, rows in [('sources.csv',DATA['sources']),('timeline.csv',DATA['timeline']),('research-leads.csv',DATA['leads']),('first-shipment-table.csv',DATA['coins'])]:
    with (SITE/filename).open('w',newline='') as handle:
        writer=csv.DictWriter(handle,fieldnames=list(rows[0].keys()),lineterminator='\n')
        writer.writeheader()
        for row in rows:
            writer.writerow({key: '; '.join(value) if isinstance(value,list) else value for key,value in row.items()})

raw = ROOT/'research'/'raw'
geo = raw/'natural-earth-countries.geojson'
if geo.exists():
    countries = json.loads(geo.read_text())
    paths = []
    def project(coordinate):
        return 50+(coordinate[0]-15)*13, (64-coordinate[1])*18
    for feature in countries['features']:
        geometry=feature['geometry']
        polygons=geometry['coordinates'] if geometry['type']=='MultiPolygon' else [geometry['coordinates']]
        for polygon in polygons:
            ring=polygon[0]
            if not any(14 < xy[0] < 88 and 38 < xy[1] < 66 for xy in ring):
                continue
            d='M'+' L'.join(f'{project(xy)[0]:.1f},{project(xy)[1]:.1f}' for xy in ring)+' Z'
            paths.append(f'<path d="{d}" fill="#d9dfd3" stroke="#bcc8bd" stroke-width=".8"/>')
    grid=[]
    for lon in range(20,90,10):
        x=50+(lon-15)*13
        grid.append(f'<path d="M{x} 0 V455" stroke="#c9d0c3" stroke-width=".5" stroke-dasharray="3 5"/><text x="{x+4}" y="19" font-size="9" fill="#67776f" font-family="monospace">{lon}°E</text>')
    for lat in range(40,65,5):
        y=(64-lat)*18
        grid.append(f'<path d="M0 {y} H960" stroke="#c9d0c3" stroke-width=".5" stroke-dasharray="3 5"/><text x="8" y="{y-6}" font-size="9" fill="#67776f" font-family="monospace">{lat}°N</text>')
    (SITE/'map-base.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 455"><title>Modern geographic orientation, Natural Earth public-domain data</title><rect width="960" height="455" fill="#e9ede5"/>'+''.join(paths)+''.join(grid)+'</svg>')
elif not (SITE/'map-base.svg').exists():
    raise SystemExit('map-base.svg missing; use the committed generated map or obtain the Natural Earth source.')

if raw.exists():
    manifest=[]
    for path in sorted(raw.iterdir()):
        if path.is_file() and path.suffix.lower() in ('.pdf','.xml','.jpg'):
            content=path.read_bytes()
            manifest.append(dict(file=path.name,bytes=len(content),sha256=hashlib.sha256(content).hexdigest(),note='Local research copy; not redistributed. A full file does not imply every page was read.'))
    (SITE/'research-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')

log = '''<p class="eyebrow">METHODS / RETRIEVAL / LIMITS</p><h1>What was actually inspected.</h1>
<p class="section-intro">A transparent desk investigation, not an archive visit or a claimed recovery.</p>
<h2>Scope and reading depth</h2><p>Evidence cutoff: 5 September 2026. The investigation used Romanian, Russian, English and French material. Danish expressions are prospective search terms, not Danish primary records read. Full texts obtained include Pokivaylova’s 268-page monograph, Lapedatu’s published memoir and Moscow diary, Moisuc’s article, Swain’s article, and a French diplomatic-archive finding aid. Relevant passages were read; these are not claims to have read every page of each volume.</p>
<p>The Oscar Print files obtained are 16-page previews, not complete books. Schipor’s decisive document 121 and the original May 1921 inventory were not independently inspected. Published US diplomatic documents were read in the Office of the Historian edition, including machine-readable volume text. No physical original was examined.</p>
<h2>Source independence</h2><p>Each of the source records states its access level and evidence family. BNR material repeated by a newspaper remains BNR-derived evidence. Schipor’s book summary, interviews and articles are one research family; Moisuc’s quotation of his document is another publication layer, not an independent archival discovery by this investigation. Different authors can also depend on the same underlying record.</p>
<h2>Access limitations and negative results</h2><ul>
<li>BNR’s announced document portal was located, but automated retrieval produced navigation rather than the substantive scans.</li>
<li>Schipor’s full book, the complete Păunescu volume, Mosyakin’s three volumes and Romașcanu’s 1934 compilation were not obtained in full.</li>
<li>The original Glasul Bucovinei issue of 10 July 1920 was not inspected. LIBRARIA and Arcanum collections were located.</li>
<li>A Le Temps OCR result for 20 February 1935 did not yield a verified treasure passage in the inspected extract. It is not counted as supporting evidence.</li>
<li>Some direct newspaper retrieval attempts returned access errors. A Mosyakin publisher-preview download timed out. Those restrictions were not bypassed.</li>
<li>MNIR’s 2008 accession files, 1956 return registers, and the original French, Russian and Boyle archive files remain unread. Shelfmarks taken from scholarship are labeled as such.</li>
<li>Published Soviet accounting entries for February 1922 were inspected through their catalogue and web transcriptions. They did not identify a Romanian component; general Soviet totals were not substituted for Romanian balances.</li>
<li>Embedded interview videos were not treated as watched or transcribed. Abstracts and catalogue descriptions were not upgraded to full-text access.</li>
</ul>
<h2>Translation and numerical controls</h2><p>Translations are working research translations, not certified. Julian/Gregorian conversion is only applied when the source calendar is identified. Asset classes, value, gross weight and fine-gold content are kept distinct. The report exposes the 25,000-gold-leu component/total discrepancy, ten-bag discrepancy, two-object discrepancy, competing 1922 balances and ambiguous 1924 numerical expression.</p>
<h2>Maps</h2><p>The map connects observed or reported endpoints; it does not reconstruct exact railway track or establish a present vault. The 1919 route is explicitly retrospective and unverified against transport receipts. The 1924 view is an institutional flow diagram, not a geographic map. Modern country outlines are orientation aids, not historical boundary claims. Basemap: <a href="https://www.naturalearthdata.com/about/terms-of-use/">Natural Earth, public domain</a>, 1:110m admin-0 geography, obtained through the project’s public GitHub data mirror.</p>
<h2>Rights and handling</h2><p>The public site distributes original summaries, research structure and small factual transcriptions. Third-party books, periodical scans, archive photographs and extracted full texts are not republished. The Lapedatu download was offered for personal reading; the site links to its institutional host. Locally retained research-copy checksums are available in the manifest, without the files themselves.</p>
<h2>Portable outputs</h2><ul><li><a href="report.html">Complete static, printable dossier</a></li><li><a href="case-file.md" download>Research text (Markdown)</a></li><li><a href="data.json" download>Complete structured research dataset</a></li><li><a href="sources.csv" download>Source register (CSV)</a></li><li><a href="timeline.csv" download>Chronology (CSV)</a></li><li><a href="research-leads.csv" download>Research leads (CSV)</a></li><li><a href="first-shipment-table.csv" download>Transcribed modern shipment table (CSV)</a></li><li><a href="research-manifest.json">Local research-copy checksums</a></li></ul>
<h2>What was not done</h2><p>No paid acquisition, archive request, contact with an intermediary, claim filing, physical search or recovery was undertaken. No current holding of the missing BNR reserve was authenticated. The research requests are drafts for a subsequent phase. The browser notebook is device-local; exports are user-controlled and no note is sent to a server.</p>'''
(SITE/'research-log.html').write_text(page('Research log', log))
(SITE/'404.html').write_text(page('Record not found','<p class="eyebrow">404 / NOT IN THIS FILE</p><h1>This page is not in the dossier.</h1><p><a href="/">Return to the interactive case file</a> or <a href="/report.html">open the complete report</a>.</p>'))
print('Generated static report, research log, exports and map. Report words:', len(' '.join(md).split()))
