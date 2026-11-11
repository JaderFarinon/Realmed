const {chromium}=require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const assert=require('node:assert/strict')
const {prepare,records}=require('./verify-screen-pattern.cjs')
const catalog=require('../../backend/services/guideDashboard').stages
;(async()=>{
  const browser=await chromium.launch({executablePath:process.env.REALMED_BROWSER_EXECUTABLE||undefined})
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    await prepare(page)
    let values=[6,4,3,2,1,2,1,5,7,2,3], fail=false
    const listRequests=[]
    await page.route('**/api/dashboard',r=>r.fulfill(fail?{status:500,json:{error:'Falha simulada'}}:{json:{stages:catalog.map((stage,i)=>({...stage,value:values[i]}))}}))
    await page.route('**/api/guide-processes?*',r=>{
      const url=new URL(r.request().url()),stage=url.searchParams.get('process_stage'),total=stage?values[catalog.findIndex(row=>row.key===stage)]:records.length
      listRequests.push(stage)
      return r.fulfill({json:{data:records.slice(0,Math.min(Number(url.searchParams.get('pageSize')||20),total)),pagination:{page:1,pageSize:20,total,pages:Math.ceil(total/20)}}})
    })
    const origin=process.env.REALMED_UI_TEST_URL||'http://127.0.0.1:5186',url=origin+'/central-de-guias/dashboard'
    await page.goto(url)
    const chart=page.locator('figure[aria-labelledby="process-stage-chart-title"]')
    await chart.waitFor()
    assert.equal(await chart.locator('[data-stage]').count(),catalog.length)
    assert.equal(await chart.locator('[data-stage]').last().getAttribute('data-stage'),'billing')
    for(let i=0;i<catalog.length;i++) {
      const row=chart.locator(`[data-stage="${catalog[i].key}"]`)
      assert.ok((await row.innerText()).includes(catalog[i].label))
      assert.equal(await row.locator('b').innerText(),String(values[i]))
      assert.equal(await page.locator(`[data-stage-card="${catalog[i].key}"] strong`).innerText(),String(values[i]))
    }
    await page.screenshot({path:'.deployment/guide-dashboard-desktop.png',fullPage:true})
    for (const stage of catalog) {
      for (const selector of [`[data-stage="${stage.key}"]`, `[data-stage-card="${stage.key}"]`]) {
        await page.goto(url)
        await page.locator(selector).click()
        await page.waitForURL(u=>u.searchParams.get('queue')==='ALL'&&u.searchParams.get('process_stage')===stage.key)
        await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent?.trim().startsWith('Todos')&&b.getAttribute('aria-pressed')==='true'))
      }
    }
    await page.goto(url)
    await chart.locator('[data-stage="billing"]').click()
    await page.waitForURL(u=>u.pathname==='/central-de-guias/tratamentos'&&u.searchParams.get('process_stage')==='billing')
    await page.getByRole('button',{name:'Estágio: Faturar ×',exact:true}).waitFor()
    assert.ok(listRequests.includes('billing'))
    await page.getByRole('button',{name:'Estágio: Faturar ×',exact:true}).click()
    await page.waitForURL(u=>!u.searchParams.has('process_stage'))
    assert.equal(new URL(page.url()).searchParams.get('queue'),'ALL')
    await page.reload()
    await page.locator('nav[aria-label="Filas da Central de Guias"] button[aria-pressed="true"]').filter({hasText:'Todos'}).waitFor()
    await page.locator('nav[aria-label="Filas da Central de Guias"] button').filter({hasText:/^\s*Faturar\s*\(/}).click()
    await page.waitForURL(u=>u.searchParams.get('queue')==='BILLING'&&u.searchParams.get('process_stage')==='billing')
    await page.goto(url)
    await chart.waitFor()
    assert.equal(await chart.locator('[data-stage="billing"] b').innerText(),'3')
    values[catalog.length-1]=5
    await page.getByRole('button',{name:'Atualizar indicadores',exact:true}).click()
    await page.waitForFunction(()=>document.querySelector('[data-stage="billing"] b')?.textContent==='5')
    fail=true
    await page.getByRole('button',{name:'Atualizar indicadores',exact:true}).click()
    await page.getByRole('alert').filter({hasText:'Não foi possível carregar'}).waitFor()
    assert.equal(await chart.locator('[data-stage="billing"] b').innerText(),'5')
    await page.reload()
    await page.getByRole('alert').waitFor()
    assert.equal(await chart.count(),0,'Initial failure must not display fake zero indicators')
    fail=false; values=values.map(()=>0)
    await page.getByRole('button',{name:'Atualizar indicadores',exact:true}).click()
    await chart.getByText('Nenhum processo nas etapas do gráfico.',{exact:true}).waitFor()
    assert.equal(await chart.locator('[data-stage]').count(),catalog.length)
    values=[6,4,3,2,1,2,1,5,7,2,3]
    await page.setViewportSize({width:390,height:844})
    await page.getByRole('button',{name:'Atualizar indicadores',exact:true}).click()
    await page.waitForFunction(()=>document.querySelector('[data-stage="billing"] b')?.textContent==='3'&&document.documentElement.scrollWidth<=innerWidth+2)
    await page.screenshot({path:'.deployment/guide-dashboard-mobile.png',fullPage:true})
    assert.deepEqual(errors,[])
    console.log('PASS: all labeled bars/cards, final Faturar stage, exact queue link/filter clearing, refresh, failure recovery, zero dataset and mobile layout.')
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
