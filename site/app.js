'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const fold = value => String(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const KEY = 'moscow-deposit-notebook-v1';
let D, records, recordMap, searchIndex, currentView = 'overview';
let notebook = {general: '', pins: [], notes: {}};
let storageAvailable = true, toastTimer;
const views = ['overview','trail','evidence','hypotheses','leads','library','notebook'];

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { element.hidden = true; }, 3200);
}
function citations(ids) {
  return `<div class="citations"><span class="citations-label">SOURCES</span>${ids.map(id => `<a class="citation" href="#${id}" title="${escapeHTML(recordMap.get(id)?.title || id)}">${id}</a>`).join('')}</div>`;
}
function rich(text) {
  return escapeHTML(text).replace(/\[(S\d{2})\]/g, (_, id) => `<a class="citation" href="#${id}">${id}</a>`);
}
function pin(id) {
  const selected = notebook.pins.includes(id);
  return `<button class="pin" data-pin="${id}" aria-pressed="${selected}" aria-label="${selected ? 'Unpin' : 'Pin'} ${id}">${selected ? '✓ Pinned' : '+ Pin'}</button>`;
}
function cardTop(item) { return `<div class="card-top"><span class="ref">${item.id}</span>${pin(item.id)}</div>`; }
function empty(message) { return `<div class="empty-state">${escapeHTML(message)}</div>`; }
function evidenceCard(item, featured = false) {
  return `<article class="evidence-card" ${featured ? '' : `id="${item.id}"`}>${cardTop(item)}<span class="badge">${escapeHTML(item.status)}</span><h3>${escapeHTML(item.title)}</h3><p class="question">${escapeHTML(item.question)}</p><p>${escapeHTML(item.finding)}</p>${featured ? `<a class="text-link" href="#${item.id}">Inspect exhibit →</a>` : `<details><summary>Inspect the reasoning and its limits</summary><p>${escapeHTML(item.detail)}</p><p class="test-box"><strong>Next proof to seek:</strong> ${escapeHTML(item.next)}</p></details>${citations(item.sources)}`}</article>`;
}
function renderTimeline() {
  const track = $('#timeline-track').value;
  const period = $('#timeline-period').value;
  const bounds = period === 'all' ? [-Infinity, Infinity] : period.split('-').map(Number);
  const items = D.timeline.filter(item => (track === 'all' || item.track === track) && item.year >= bounds[0] && item.year <= bounds[1]);
  $('#timeline-count').textContent = `${items.length} of ${D.timeline.length} events`;
  $('#timeline-items').innerHTML = items.map(item => `<article class="timeline-event" id="${item.id}" data-track="${item.track}"><div class="card-top"><span class="event-date">${escapeHTML(item.date)}</span>${pin(item.id)}</div><div class="event-meta"><span class="ref">${item.id}</span><span class="badge">${escapeHTML(item.status)}</span></div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.body)}</p><p class="limitations"><strong>Boundary of the evidence:</strong> ${escapeHTML(item.limits)}</p>${citations(item.sources)}</article>`).join('') || empty('No events match these filters.');
}
function renderHypotheses() {
  $('#hypothesis-items').innerHTML = D.hypotheses.map(item => `<article class="hypothesis-card" id="${item.id}">${cardTop(item)}<span class="badge">${escapeHTML(item.assessment)}</span><h2>${escapeHTML(item.title)}</h2><div class="hypothesis-columns"><div><h3>WHAT SUPPORTS IT</h3><p>${escapeHTML(item.pro)}</p></div><div><h3>WHAT HOLDS IT BACK</h3><p>${escapeHTML(item.against)}</p></div></div><p class="test-box"><strong>The test:</strong> ${escapeHTML(item.test)}</p>${citations(item.sources)}</article>`).join('');
}
function renderLeads() {
  const priority = $('#lead-priority').value;
  const items = D.leads.filter(item => priority === 'all' || item.priority.startsWith(priority));
  $('#lead-count').textContent = `${items.length} of ${D.leads.length} leads`;
  $('#lead-items').innerHTML = items.map(item => `<article class="lead-card" id="${item.id}">${cardTop(item)}<span class="badge">${escapeHTML(item.priority)}</span><h2>${escapeHTML(item.title)}</h2><p>${escapeHTML(item.goal)}</p><p class="limitations"><strong>Why this lead exists:</strong> ${escapeHTML(item.basis)}</p><details><summary>Open the document request and investigation test</summary><h3>DRAFT REQUEST / RESEARCH INSTRUCTION</h3><div class="request-text">${escapeHTML(item.request)}</div><button class="copy-request" data-copy="${item.id}">Copy request</button><div class="hypothesis-columns"><div><h3>WHAT WOULD COUNT AS PROGRESS</h3><p>${escapeHTML(item.success)}</p></div><div><h3>WHEN TO STOP OR DOWNGRADE</h3><p>${escapeHTML(item.stop)}</p></div></div><p class="limitations"><strong>Access status:</strong> ${escapeHTML(item.access)}</p></details>${citations(item.sources)}</article>`).join('');
}
function sourceCategory(item) {
  if (/book|diary/i.test(item.kind)) return 'book';
  if (/archive|catalogue/i.test(item.kind)) return 'archive';
  if (/record/i.test(item.kind)) return 'record';
  return 'article';
}
function renderSources() {
  const language = $('#source-language').value;
  const kind = $('#source-kind').value;
  const query = fold($('#source-search').value.trim());
  const items = D.sources.filter(item => (language === 'all' || item.language.includes(language)) && (kind === 'all' || sourceCategory(item) === kind) && (!query || fold(Object.values(item).join(' ')).includes(query)));
  $('#source-result-count').textContent = `${items.length} of ${D.sources.length} source records. Shared evidence families are identified below.`;
  $('#source-items').innerHTML = items.map(item => `<article class="source-card" id="${item.id}">${cardTop(item)}<span class="badge">${escapeHTML(item.access)}</span><h2>${escapeHTML(item.title)}</h2><p class="source-byline">${escapeHTML(item.author)} · ${escapeHTML(item.date)}<br>${escapeHTML(item.language)} · ${escapeHTML(item.kind)}</p><p class="source-locator">${escapeHTML(item.locator)}</p><p><strong>What it contributes:</strong> ${escapeHTML(item.finding)}</p><p class="limitations"><strong>Do not overread it:</strong> ${escapeHTML(item.caution)}</p><a class="source-link" href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer">Open source at ${escapeHTML(new URL(item.url).hostname)} ↗</a><p class="source-family">EVIDENCE FAMILY: ${escapeHTML(item.family)}</p></article>`).join('') || empty('No sources match these filters. Reset or broaden the search.');
}
function renderCoins() {
  $('#coin-bars').innerHTML = D.coins.slice(0,6).map(item => `<div class="coin-row"><span>${escapeHTML(item.label)}</span><svg class="coin-track" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="10" fill="#d3d6c7"/><rect width="${item.share}" height="10" fill="#226b70"/></svg><b>${item.share.toFixed(2)}%</b></div>`).join('');
  $('#coin-table').innerHTML = `<table><caption>First shipment, official transcription [S42]; scan check [S41]</caption><thead><tr><th scope="col">Group</th><th scope="col">Cases</th><th scope="col">Bags</th><th scope="col">Gold-lei value</th><th scope="col">Share</th></tr></thead><tbody>${D.coins.map(item => `<tr><th scope="row">${escapeHTML(item.label)}</th><td>${item.cases.toLocaleString('en')}</td><td>${item.bags === null ? '—' : item.bags.toLocaleString('en')}</td><td>${item.goldLei.toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td>${item.share.toFixed(2)}%</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row">Calculated total</th><td>1,738</td><td>13,823</td><td>314,580,456.84</td><td>100.02%*</td></tr></tfoot></table><p class="fine">*Sum of individually rounded published percentages. Austrian bags: 4,387 in BNR’s scan and transcription; 4,397 in the modern reprint [S31]. Rows labelled n, v and iron chest are preserved as printed rather than reinterpreted.</p>`;
  $('#numeric-audit').innerHTML = `<h3>Numerical audit: resolved and open</h3><ul><li><strong>Two shipment values:</strong> 314,580,456.84 + 574,523.57 = 315,154,980.41 gold lei. The BNR history page and its reprint state a total 25,000 lei higher. Both round to approximately 91.5 tonnes at the historical monetary parity. <a href="#S03">[S03]</a> <a href="#S43">[S43]</a></li><li><strong>Bag count resolved:</strong> the original annex gives 4,387 Austrian bags, not the reprint’s 4,397. Official rows sum to 13,823. A separate Romanian-coin value cell differs from the official transcription and still needs checking. <a href="#S41">[S41]</a> <a href="#S42">[S42]</a></li><li><strong>1956 objects:</strong> published category figures add to 39,322, versus a headline total of 39,320. These are objects, not gold-reserve cases. <a href="#S03">[S03]</a></li><li><strong>1922 balances and the 1924 translation:</strong> conflicting rouble totals and an ambiguous expression require original documents. They are not averaged or silently repaired. <a href="#S10">[S10]</a> <a href="#S09">[S09]</a></li></ul><p><a href="report.html#chapter-12">Read the complete numerical audit ↗</a></p>`;
}

const places = {
  iasi:[27.59,47.16,'Iași',-26,21], chisinau:[28.86,47.01,'Chișinău',13,33], bender:[29.48,46.83,'Bender',14,14], cherkasy:[32.06,49.44,'Cherkasy',14,5], pryluky:[32.39,50.59,'Pryluky',14,-3], bryansk:[34.37,53.24,'Bryansk',14,4], moscow:[37.62,55.75,'Moscow',14,-7], perm:[56.25,58.01,'Perm',14,-5], samara:[50.15,53.20,'Samara',14,4], tashkent:[69.24,41.30,'Tashkent',-75,-14], odesa:[30.73,46.48,'Odesa',14,6], constanta:[28.63,44.17,'Constanța',15,9], bucharest:[26.10,44.43,'Bucharest',-83,-13]
};
const point = key => { const p = places[key]; return [50+(p[0]-15)*13, (64-p[1])*18]; };
function mapPath(keys, cls = '') { return `<polyline class="map-line ${cls}" points="${keys.map(key => point(key).map(n => n.toFixed(1)).join(',')).join(' ')}"/>`; }
function mapPoints(keys, cls = '') { return keys.map(key => { const p = places[key], xy = point(key); return `<circle class="map-point ${cls}" cx="${xy[0]}" cy="${xy[1]}" r="4"/><text class="map-label" x="${xy[0]+p[3]}" y="${xy[1]+p[4]}">${p[2]}</text>`; }).join(''); }
function renderMap(route) {
  $$('[data-route]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.route === route)));
  let shapes = '', title = '', explanation = '', sources = [];
  if (route === 'diary') {
    const keys = ['iasi','chisinau','bender','cherkasy','pryluky','bryansk','moscow'];
    shapes = mapPath(keys) + mapPoints(keys);
    title = 'Lapedatu’s observed journey · 28 July–3 August 1917 OS';
    explanation = 'The diary places the cultural escort at these locations. Solid lines connect observed places; they are not surveyed railway tracks. His earlier planned route is deliberately not plotted as the actual route. Gold and cultural cases had distinct custody after arrival.';
    sources = ['S11'];
  } else if (route === 'evacuation') {
    shapes = mapPath(['moscow','perm'],'reported') + mapPath(['moscow','samara','tashkent'],'reported') + mapPoints(['moscow','perm','samara','tashkent'],'reported');
    title = 'Reported partial evacuation · autumn 1919';
    explanation = 'Dashed lines show destinations described retrospectively in a translated 1924 report. “Samara–Tashkent” is an ambiguous route or destination label; neither a precise itinerary nor a surviving vault is established. Some currencies reportedly stayed in Moscow. These routes have not been independently verified against transport receipts.';
    sources = ['S09','S05'];
  } else if (route === 'return') {
    shapes = mapPath(['moscow','odesa','constanta','bucharest'],'return') + mapPoints(['moscow','odesa','constanta','bucharest']);
    title = 'A documented return route · 1935';
    explanation = 'Moscow → Odesa by train; Odesa → Constanța aboard the Principesa Maria; then inland to Bucharest. These were returned archives and other assets, not the BNR gold reserve. Lines connect the reported transport endpoints, not exact track or shipping geometry.';
    sources = ['S03','S04'];
  } else {
    title = 'The 1924 report’s financial trail · not a geographic map';
    explanation = 'The translated report splits the trail: French francs, British pounds and German marks went almost entirely abroad under Narkomfin; Austrian crowns went to the State Bank’s Issue Section. Foreign destinations and recipients are not named in the inspected passage. Dashed arrows mean a published archival account whose original vouchers remain to be checked.';
    sources = ['S09','S10'];
    shapes = `<path class="diagram-line" d="M270 235 H370 V125 H545 M370 235 V340 H545"/><rect class="diagram-box" x="45" y="176" width="225" height="115" rx="3"/><text class="diagram-label" x="65" y="210">Moscow treasury</text><text class="diagram-small" x="65" y="240">Separately identified deposit</text><text class="diagram-small" x="65" y="261">→ later financial control</text><rect class="diagram-box" x="545" y="60" width="350" height="135" rx="3"/><text class="diagram-label" x="567" y="93">Foreign recipients: not yet identified</text><text class="diagram-small" x="567" y="122">French francs · British pounds · German marks</text><text class="diagram-small" x="567" y="147">Trace Narkomfin dispatch and payment vouchers.</text><text class="diagram-small" x="567" y="172">Do not substitute a guessed country or bank.</text><rect class="diagram-box" x="545" y="283" width="350" height="115" rx="3"/><text class="diagram-label" x="567" y="317">State Bank · Issue Section</text><text class="diagram-small" x="567" y="345">Austrian crowns</text><text class="diagram-small" x="567" y="373">Trace receiving and subsequent disposal records.</text>`;
  }
  $('#route-map').innerHTML = `<svg class="route-map" viewBox="0 0 960 455" role="img" aria-labelledby="map-title map-description"><title id="map-title">${escapeHTML(title)}</title><desc id="map-description">${escapeHTML(explanation)}</desc>${route === 'disposal' ? '' : '<image href="map-base.svg" width="960" height="455"/>'}${shapes}</svg>`;
  $('#route-description').innerHTML = `<p><strong>${escapeHTML(title)}</strong></p><p>${escapeHTML(explanation)}</p>${citations(sources)}<p class="fine">${route === 'disposal' ? 'Institutional flow diagram; no coordinates implied.' : 'Orientation only. Modern Natural Earth geography; no claim about historical boundaries. Text above provides the route and its evidentiary limits.'}</p>`;
}

function buildSearch() {
  records = [
    ...D.timeline.map(item => ({...item, view:'trail', kind:'Timeline event', summary:item.body})),
    ...D.exhibits.map(item => ({...item, view:'evidence', kind:'Evidence exhibit', summary:item.finding})),
    ...D.hypotheses.map(item => ({...item, view:'hypotheses', kind:'Hypothesis', summary:item.assessment + '. ' + item.pro})),
    ...D.leads.map(item => ({...item, view:'leads', kind:'Research lead', summary:item.goal + ' ' + item.basis})),
    ...D.sources.map(item => ({...item, view:'library', kind:'Source record', summary:item.finding}))
  ];
  recordMap = new Map(records.map(item => [item.id, item]));
  searchIndex = [...records, ...D.chapters.map((item, index) => ({id:`R${index+1}`,title:item.title,kind:'Report chapter',summary:item.paragraphs.join(' '),href:`report.html#chapter-${index+1}`})), ...D.glossary.map((item,index) => ({id:`G${index+1}`,title:item.term,kind:'Glossary',summary:item.text,view:'library'}))].map(item => ({...item, searchText:fold(Object.values(item).flat().join(' '))}));
}
function searchCase() {
  const query = fold($('#global-search').value.trim());
  $('#clear-search').hidden = !query;
  $('#search-panel').hidden = !query;
  $('#case-views').hidden = Boolean(query);
  if (!query) return;
  const words = query.split(/\s+/).filter(Boolean);
  const matches = searchIndex.filter(item => words.every(word => item.searchText.includes(word))).sort((a,b) => Number(fold(b.title).includes(query))-Number(fold(a.title).includes(query)));
  $('#search-count').textContent = `${matches.length} results${matches.length > 50 ? ' · showing the first 50; add a more specific term to narrow the search' : ''}`;
  $('#search-results').innerHTML = matches.slice(0,50).map(item => {
    const text = item.summary || '';
    const offset = Math.max(0, fold(text).indexOf(words[0])-70);
    const snippet = (offset > 0 ? '…' : '') + text.slice(offset,offset+270) + (text.length > offset+270 ? '…' : '');
    return `<article class="search-result"><span class="ref">${item.id} · ${escapeHTML(item.kind)}</span><h2><a href="${item.href || '#'+item.id}">${escapeHTML(item.title)}</a></h2><p>${escapeHTML(snippet)}</p></article>`;
  }).join('') || empty('No matching records. Try a name variant, an archive reference, or fewer words.');
}

function validateNotebook(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.pins) || typeof value.general !== 'string' || !value.notes || typeof value.notes !== 'object' || Array.isArray(value.notes)) throw new Error('This is not a valid case-file notebook.');
  if (value.general.length > 100000 || value.pins.length > 500 || Object.keys(value.notes).length > 500) throw new Error('This notebook exceeds the supported size.');
  const clean = {general:value.general, pins:[...new Set(value.pins.filter(id => typeof id === 'string' && recordMap.has(id)))], notes:{}};
  for (const [id,note] of Object.entries(value.notes)) {
    if (recordMap.has(id) && typeof note === 'string') {
      if (note.length > 50000) throw new Error('An imported note is too large.');
      clean.notes[id] = note;
    }
  }
  return clean;
}
function readNotebook() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) notebook = validateNotebook(JSON.parse(raw));
    localStorage.setItem(KEY, JSON.stringify(notebook));
  } catch {
    storageAvailable = false;
    $('#storage-message').textContent = 'Browser storage is unavailable or contains unreadable saved data. Current notes stay in this tab only; export them before leaving. Existing saved data has not been overwritten.';
  }
  $('#general-notes').value = notebook.general;
  syncPins();
}
function persistNotebook() {
  if (storageAvailable) {
    try { localStorage.setItem(KEY, JSON.stringify(notebook)); }
    catch { storageAvailable = false; $('#storage-message').textContent = 'Browser storage could not save these changes. Export your notebook before leaving this tab.'; }
  }
  const text = storageAvailable ? 'Saved in this browser' : 'Not saved to browser storage — export a backup';
  if ($('#notebook-status').textContent !== text) $('#notebook-status').textContent = text;
}
function syncPins() {
  $('#pin-count').textContent = notebook.pins.length;
  $$('[data-pin]').forEach(button => {
    const selected = notebook.pins.includes(button.dataset.pin);
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-label', `${selected ? 'Unpin' : 'Pin'} ${button.dataset.pin}`);
    button.textContent = selected ? '✓ Pinned' : '+ Pin';
  });
}
function togglePin(id) {
  if (!recordMap.has(id)) return;
  const selected = notebook.pins.includes(id);
  notebook.pins = selected ? notebook.pins.filter(value => value !== id) : [...notebook.pins,id];
  persistNotebook();
  syncPins();
  if (currentView === 'notebook') renderNotebook();
  toast(selected ? `${id} unpinned. Any notes are kept for re-pinning.` : `${id} pinned to your notebook.`);
}
function renderNotebook() {
  $('#general-notes').value = notebook.general;
  $('#notebook-items').innerHTML = notebook.pins.map(id => {
    const item = recordMap.get(id);
    return `<article class="notebook-card">${cardTop(item)}<h3><a href="#${id}">${escapeHTML(item.title)}</a></h3><p class="fine">${escapeHTML(item.kind)} · <a href="#${id}">Return to the published record →</a></p><label class="notebook-label" for="note-${id}">Your notes on ${id}</label><textarea id="note-${id}" data-note="${id}" rows="4" maxlength="50000" placeholder="Observation, question, or next check…">${escapeHTML(notebook.notes[id] || '')}</textarea></article>`;
  }).join('') || empty('Nothing pinned yet. Use “+ Pin” on an exhibit, source, timeline event or lead.');
}
function downloadJSON(filename, value) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'], {type:'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url),10000);
}
async function importNotebook(file) {
  if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error('Use a notebook smaller than 2 MB.');
    const raw = JSON.parse(await file.text());
    if (raw.schema !== 'moscow-deposit-notebook-v1') throw new Error('This file is not a Moscow Deposit notebook export.');
    const incoming = validateNotebook(raw);
    const merged = {general:notebook.general,pins:[...new Set([...notebook.pins,...incoming.pins])],notes:{...notebook.notes}};
    if (incoming.general && incoming.general !== merged.general) merged.general = merged.general ? `${merged.general}\n\n— Imported notes —\n${incoming.general}` : incoming.general;
    for (const [id,note] of Object.entries(incoming.notes)) if (note && note !== merged.notes[id]) merged.notes[id] = merged.notes[id] ? `${merged.notes[id]}\n\n— Imported note —\n${note}` : note;
    notebook = validateNotebook(merged);
    persistNotebook(); renderNotebook(); syncPins();
    $('#notebook-status').textContent = `Notebook merged; ${notebook.pins.length} pinned records. Existing notes preserved.`;
    toast('Notebook imported and merged.');
  } catch (error) {
    $('#notebook-status').textContent = error instanceof SyntaxError ? 'The file is not valid JSON. Existing notes were not changed.' : `${error.message} Existing notes were not changed.`;
  } finally { $('#import-notebook').value = ''; }
}

function navigate() {
  let hash;
  try { hash = decodeURIComponent(location.hash.slice(1)) || 'overview'; } catch { hash = 'overview'; }
  const item = recordMap.get(hash) || searchIndex.find(entry => entry.id === hash && entry.view);
  const view = item?.view || (views.includes(hash) ? hash : 'overview');
  currentView = view;
  $('#global-search').value = ''; searchCase();
  $$('[data-view]').forEach(section => { section.hidden = section.dataset.view !== view; });
  $$('[data-nav]').forEach(link => { if(link.dataset.nav === view) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current'); });
  if (item?.view === 'trail') { $('#timeline-track').value = 'all'; $('#timeline-period').value = 'all'; renderTimeline(); }
  if (item?.view === 'library') { $('#source-language').value = 'all'; $('#source-kind').value = 'all'; $('#source-search').value = ''; renderSources(); }
  if (item?.view === 'leads') { $('#lead-priority').value = 'all'; renderLeads(); }
  if (view === 'notebook') renderNotebook();
  const label = $(`[data-nav="${view}"]`).textContent.replace(/^\s*\d+\s*/, '').trim();
  document.title = `${item?.title || label} — The Moscow Deposit`;
  requestAnimationFrame(() => {
    if (item) {
      const element = document.getElementById(hash);
      if (element) { element.tabIndex = -1; element.focus({preventScroll:true}); element.scrollIntoView({block:'start'}); element.classList.remove('target-flash'); void element.offsetWidth; element.classList.add('target-flash'); }
    } else { window.scrollTo({top:0,behavior:'instant'}); }
  });
}

async function init() {
  const response = await fetch('data.json');
  if (!response.ok) throw new Error('Unable to load case data');
  D = await response.json();
  buildSearch(); readNotebook();
  $('#source-count').textContent = D.sources.length;
  $('#featured-evidence').innerHTML = ['E02','E05','E07','E10'].map(id => evidenceCard(D.exhibits.find(item => item.id === id),true)).join('');
  $('#chapter-list').innerHTML = D.chapters.map((chapter,index) => `<li><a href="report.html#chapter-${index+1}">${escapeHTML(chapter.title)}</a></li>`).join('');
  $('#method-summary').innerHTML = `<p>${escapeHTML(D.meta.scope)}</p><p>${escapeHTML(D.meta.language)}</p><p>Access and reading depth are disclosed for every source. This edition has ${D.sources.length} source records, ${D.timeline.length} timeline events, ${D.exhibits.length} exhibits, ${D.hypotheses.length} hypotheses and ${D.leads.length} next-step leads.</p>`;
  $('#evidence-items').innerHTML = D.exhibits.map(item => evidenceCard(item)).join('');
  $('#glossary-items').innerHTML = D.glossary.map((item,index) => `<article class="glossary-card" id="G${index+1}"><h3>${escapeHTML(item.term)}</h3><p>${escapeHTML(item.text)}</p></article>`).join('');
  renderTimeline(); renderHypotheses(); renderLeads(); renderSources(); renderCoins(); renderMap('diary');
  $('#global-search').addEventListener('input', searchCase);
  $('#clear-search').addEventListener('click', () => { $('#global-search').value = ''; searchCase(); $('#global-search').focus(); });
  ['timeline-track','timeline-period'].forEach(id => document.getElementById(id).addEventListener('change',renderTimeline));
  $('#timeline-reset').addEventListener('click', () => { $('#timeline-track').value = 'all'; $('#timeline-period').value = 'all'; renderTimeline(); });
  $('#lead-priority').addEventListener('change',renderLeads);
  ['source-language','source-kind'].forEach(id => document.getElementById(id).addEventListener('change',renderSources));
  $('#source-search').addEventListener('input',renderSources);
  $('#source-reset').addEventListener('click', () => { $('#source-language').value = 'all'; $('#source-kind').value = 'all'; $('#source-search').value = ''; renderSources(); });
  $('#general-notes').maxLength = 100000;
  $('#general-notes').addEventListener('input', event => { notebook.general = event.target.value; persistNotebook(); });
  $('#notebook-items').addEventListener('input', event => { const id = event.target.dataset.note; if(id && recordMap.has(id)) { notebook.notes[id] = event.target.value; persistNotebook(); } });
  $('#export-notebook').addEventListener('click', () => { downloadJSON(`moscow-deposit-notebook-${new Date().toISOString().slice(0,10)}.json`, {schema:'moscow-deposit-notebook-v1',exportedAt:new Date().toISOString(),...notebook}); $('#notebook-status').textContent = 'Notebook export prepared. Keep the downloaded file as your backup.'; });
  $('#import-notebook').addEventListener('change', event => importNotebook(event.target.files[0]));
  document.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.pin) togglePin(button.dataset.pin);
    if (button.dataset.route) renderMap(button.dataset.route);
    if (button.dataset.copy) {
      try { await navigator.clipboard.writeText(recordMap.get(button.dataset.copy).request); toast('Request copied. Nothing has been sent.'); }
      catch { toast('Clipboard unavailable. Select and copy the visible request text.'); }
    }
  });
  window.addEventListener('hashchange',navigate);
  navigate();
  document.documentElement.dataset.ready = 'true';
}
init().catch(error => { console.error('Case file could not initialize:', error.message); $('#load-error').hidden = false; });
