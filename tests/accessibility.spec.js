const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;

test('the principal reading and interaction views pass automated WCAG A/AA checks', async ({page})=>{
  test.setTimeout(60000);
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-ready','true');
  for(const view of ['overview','trail','evidence','hypotheses','leads','library','notebook']){
    await page.locator(`[data-nav="${view}"]`).click();
    await expect(page.locator(`[data-view="${view}"]`)).toBeVisible();
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(result.violations, `${view}: ${JSON.stringify(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})))}`).toEqual([]);
  }
});
