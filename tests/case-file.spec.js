const {test, expect} = require('@playwright/test');
const fs = require('node:fs/promises');

async function ready(page, hash='') {
  await page.goto('./'+hash);
  await expect(page.locator('html')).toHaveAttribute('data-ready','true');
}

test('route views preserve evidence boundaries and timeline filters work', async ({page}) => {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await ready(page);
  await page.locator('[data-nav="trail"]').click();
  await expect(page.locator('#trail')).toBeVisible();
  await expect(page.locator('#route-description')).toContainText('diary');
  await page.getByRole('button',{name:'1919 · reported moves'}).click();
  await expect(page.locator('#route-description')).toContainText('ambiguous');
  await expect(page.getByRole('button',{name:'1919 · reported moves'})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'1924 · financial trail'}).click();
  await expect(page.locator('#route-description')).toContainText('not a geographic map');
  await expect(page.locator('#route-map')).toContainText('Foreign recipients: not yet identified');
  await page.getByRole('button',{name:'1935 · return route'}).click();
  await expect(page.locator('#route-description')).toContainText('not the BNR gold reserve');
  await page.locator('#timeline-track').selectOption('gold');
  await page.locator('#timeline-period').selectOption('1919-1925');
  await expect(page.locator('#T16')).toBeVisible();
  await expect(page.locator('#T07')).toHaveCount(0);
  await expect(page.locator('#T28')).toHaveCount(0);
  await page.getByRole('button',{name:'Reset filters'}).click();
  await expect(page.locator('#T07')).toBeVisible();
  await expect(page.locator('#T28')).toBeVisible();
  expect(errors).toEqual([]);
});

test('cross-language source search and deep-linked citations show the right record', async ({page}) => {
  await ready(page);
  await page.getByRole('searchbox',{name:'Search the entire case'}).fill('871.51/251');
  await expect(page.locator('#search-results')).toContainText('Romanian memorandum');
  await page.getByRole('link',{name:'Romanian memorandum alleging gold reaching the United States',exact:true}).click();
  await expect(page.locator('#S17')).toBeVisible();
  await expect(page.locator('#S17')).toContainText('not authentication of a shipment');
  await expect(page.locator('#S17 .source-link')).toHaveAttribute('href','https://history.state.gov/historicaldocuments/frus1921v02/d733');
  await page.locator('#source-language').selectOption('Russian');
  await page.locator('#source-kind').selectOption('book');
  await expect(page.locator('#S10')).toBeVisible();
  await expect(page.locator('#S32')).toBeVisible();
  await expect(page.locator('#S01')).toHaveCount(0);
  await page.locator('#source-search').fill('Судьба');
  await expect(page.locator('.source-card')).toHaveCount(1);
  await expect(page.locator('#S10')).toBeVisible();
  await page.goto('./#E02');
  await expect(page.locator('#E02')).toBeVisible();
  await page.locator('#E02').getByRole('link',{name:'S11',exact:true}).click();
  await expect(page.locator('#S11')).toBeVisible();
  await expect(page.locator('#S11')).toContainText('Published transcription');
  await page.goBack();
  await expect(page.locator('#E02')).toBeVisible();
});

test('notebook survives reload, exports and merges without losing existing notes', async ({page}) => {
  await ready(page,'#E07');
  await page.locator('#E07').getByRole('button',{name:'Pin E07',exact:true}).click();
  await expect(page.locator('#pin-count')).toHaveText('1');
  await page.locator('[data-nav="notebook"]').click();
  await expect(page.locator('#notebook')).toBeVisible();
  await page.getByLabel('Your working theory / questions').fill('Check the original American enclosure.');
  await page.getByLabel('Your notes on E07').fill('The allegation is not a shipment identification.');
  await expect(page.locator('#notebook-status')).toHaveText('Saved in this browser');
  await page.reload();
  await expect(page.getByLabel('Your working theory / questions')).toHaveValue('Check the original American enclosure.');
  await expect(page.getByLabel('Your notes on E07')).toHaveValue('The allegation is not a shipment identification.');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button',{name:'Export notebook ↓'}).click();
  const download = await downloadPromise;
  const buffer = await fs.readFile(await download.path());
  const exported = JSON.parse(buffer.toString());
  expect(exported.pins).toEqual(['E07']);
  expect(exported.notes.E07).toContain('not a shipment');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  await expect(page.locator('#notebook-items')).toContainText('Nothing pinned');
  await page.getByLabel('Your working theory / questions').fill('Existing local thought.');
  await page.locator('#import-notebook').setInputFiles({name:'backup.json',mimeType:'application/json',buffer});
  await expect(page.locator('#notebook-status')).toContainText('Existing notes preserved');
  await expect(page.getByLabel('Your working theory / questions')).toHaveValue(/Existing local thought\.[\s\S]*Check the original American enclosure\./);
  await expect(page.getByLabel('Your notes on E07')).toHaveValue('The allegation is not a shipment identification.');
  await page.getByRole('button',{name:'Unpin E07',exact:true}).click();
  await expect(page.locator('#notebook-items')).toContainText('Nothing pinned');
  await page.goto('./#E07');
  await page.locator('#E07').getByRole('button',{name:'Pin E07',exact:true}).click();
  await page.locator('[data-nav="notebook"]').click();
  await expect(page.getByLabel('Your notes on E07')).toHaveValue('The allegation is not a shipment identification.');
});

test('invalid imports preserve notes, and imported HTML is only text', async ({page}) => {
  await ready(page,'#notebook');
  await page.getByLabel('Your working theory / questions').fill('Keep this note.');
  await page.locator('#import-notebook').setInputFiles({name:'wrong.json',mimeType:'application/json',buffer:Buffer.from('{"wrong":true}')});
  await expect(page.locator('#notebook-status')).toContainText('Existing notes were not changed');
  await expect(page.getByLabel('Your working theory / questions')).toHaveValue('Keep this note.');
  const hostile={schema:'moscow-deposit-notebook-v1',general:'',pins:['E07','FAKE'],notes:{E07:'</textarea><img src=x onerror="window.__unexpected=true">'}};
  await page.locator('#import-notebook').setInputFiles({name:'notes.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(hostile))});
  await expect(page.getByLabel('Your notes on E07')).toHaveValue(hostile.notes.E07);
  await expect(page.locator('#pin-count')).toHaveText('1');
  expect(await page.evaluate(()=>window.__unexpected)).toBeUndefined();
  await expect(page.locator('#notebook-items img')).toHaveCount(0);
});

test('storage denial is explained and notes can still be exported', async ({page}) => {
  await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Storage disabled','SecurityError');};});
  await ready(page,'#notebook');
  await expect(page.locator('#storage-message')).toContainText('this tab only');
  await page.getByLabel('Your working theory / questions').fill('Temporary note to export.');
  await expect(page.locator('#notebook-status')).toContainText('Not saved');
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export notebook ↓'}).click();
  const download=await downloadPromise;
  const exported=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  expect(exported.general).toBe('Temporary note to export.');
});

test('mobile navigation and the long records do not overflow the page', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await ready(page);
  for (const view of ['overview','trail','evidence','hypotheses','leads','library','notebook']) {
    await page.locator(`[data-nav="${view}"]`).click();
    await expect(page.locator(`[data-view="${view}"]`)).toBeVisible();
    const overflow = await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth+1);
    expect(overflow, `${view} overflows the viewport`).toBe(false);
  }
  await page.goto('./#E03');
  await expect(page.locator('#E03')).toBeVisible();
  await page.locator('.ledger summary').click();
  await expect(page.locator('#coin-table')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
});

test('the complete report works without JavaScript and sources remain navigable', async ({browser, baseURL}) => {
  const context=await browser.newContext({javaScriptEnabled:false,baseURL});
  const page=await context.newPage();
  await page.goto('./report.html');
  await expect(page.getByRole('heading',{name:'The Moscow Deposit',exact:true})).toBeVisible();
  await page.locator('#chapter-6').getByRole('link',{name:'S17',exact:true}).first().click();
  await expect(page.locator('#S17')).toBeInViewport();
  await expect(page.locator('#S17')).toContainText('Authentic evidence of an allegation');
  await expect(page.locator('#all-leads')).toContainText('None has been sent');
  await context.close();
});

test('a failed data load offers the complete static dossier', async ({page}) => {
  await page.route('**/data.json',route=>route.abort());
  await page.goto('./');
  await expect(page.locator('#load-error')).toBeVisible();
  await page.locator('#load-error').getByRole('link',{name:'read the complete static report'}).click();
  await expect(page.getByRole('heading',{name:'The Moscow Deposit',exact:true})).toBeVisible();
  await expect(page.locator('#all-sources')).toContainText('Reading depth');
});
