"""Check provenance links, numerical transcriptions, and self-contained exports."""
from pathlib import Path
from decimal import Decimal
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT/'site'
data = json.loads((SITE/'data.json').read_text())
records = [r for key in ('sources','timeline','exhibits','hypotheses','leads') for r in data[key]]
ids = [r['id'] for r in records]
assert len(ids) == len(set(ids)), 'Duplicate evidence identifier'
source_ids = {r['id'] for r in data['sources']}
for r in records:
    if 'sources' in r:
        assert r['sources'] and set(r['sources']) <= source_ids, r['id']
for chapter in data['chapters']:
    for ref in re.findall(r'\[(S\d+)\]', ' '.join(chapter['paragraphs'])):
        assert ref in source_ids, (chapter['title'], ref)
for source in data['sources']:
    assert source['access'] and source['caution'] and source['family'], source['id']
    assert urlsplit(source['url']).scheme == 'https', source['id']
assert sum(Decimal(str(row['goldLei'])) for row in data['coins']) == Decimal('314580456.84')
assert sum(row['cases'] for row in data['coins']) == 1738
assert sum(row['bags'] or 0 for row in data['coins']) == 13823
assert sum(Decimal(str(row['share'])) for row in data['coins']) == Decimal('100.02')

class Links(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.ids=set(); self.links=[]; self.duplicate=[]; self.feed(text)
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if 'id' in a:
            if a['id'] in self.ids:self.duplicate.append(a['id'])
            self.ids.add(a['id'])
        for key in ('href','src'):
            if key in a:self.links.append(a[key])

pages={p.name:Links(p.read_text()) for p in SITE.glob('*.html')}
dynamic_ids=set(ids)|{f'G{i+1}' for i in range(len(data['glossary']))}
for filename,page in pages.items():
    assert not page.duplicate, (filename,page.duplicate)
    for link in page.links:
        u=urlsplit(link)
        if u.scheme or u.netloc:continue
        target=unquote(u.path).lstrip('/') or filename
        if target in ('','/'):target='index.html'
        assert (SITE/target).exists(), (filename,link)
        if u.fragment:
            targets=pages.get(target)
            assert targets and (u.fragment in targets.ids or (target=='index.html' and u.fragment in dynamic_ids)),(filename,link)
assert not list(SITE.glob('*.pdf')), 'Do not redistribute research PDFs'
assert not (SITE/'raw').exists(), 'Raw research is not a public asset'
print(f'OK: {len(records)} unique records; all citations and local links resolve; numerical transcription reconciled with disclosed discrepancies.')
