const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(process.env.REALMED_PLAYWRIGHT_ROOT||'C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  let fail=true,posts=0,bodies=[],release;await page.route('**/api/**',async route=>{
   assert.ok(route.request().url().endsWith('/public/events/realmed-2026/confirmations'),'Public page does not call authenticated endpoints');assert.equal(route.request().method(),'POST');assert.equal(route.request().headers().authorization,undefined);posts++;bodies.push(route.request().postDataJSON());
   if(fail)return route.fulfill({status:503,json:{error:'Falha de teste. Tente novamente.'}});
   await new Promise(resolve=>{release=resolve});return route.fulfill({status:201,json:{confirmed:true,total:2}});
  });
  await page.goto((process.env.REALMED_UI_TEST_URL||'http://127.0.0.1:5198')+'/confraternizacao');await page.getByRole('heading',{name:'Confirme sua presença',exact:true}).waitFor();assert.ok(!page.url().includes('/login'));assert.equal(await page.evaluate(()=>localStorage.getItem('token')),null);
  await page.getByText('No máximo 1 pessoa, além de você',{exact:true}).waitFor();assert.equal(await page.locator('.companion-note').count(),1);assert.ok(await page.locator('.companion-note').evaluate(el=>el.previousElementSibling.classList.contains('companions-control') && !!(el.compareDocumentPosition(document.querySelector('.confirm-presence')) & Node.DOCUMENT_POSITION_FOLLOWING)));assert.equal(await page.locator('.form-note').textContent(),'Sua confirmação ajuda a preparar esse encontro especial.');
  const out=path.resolve(__dirname,'../../.deployment/event-qa');fs.mkdirSync(out,{recursive:true});
  for(const viewport of [{width:390,height:844},{width:320,height:740},{width:1280,height:900}]){await page.setViewportSize(viewport);await page.evaluate(()=>document.fonts.ready);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,`invitation-${viewport.width}.png`),fullPage:true})}
  await page.setViewportSize({width:390,height:844});assert.equal(await page.getByRole('button',{name:'Remover acompanhante'}).isDisabled(),true);
  await page.getByLabel('Seu nome completo').fill('Pessoa de teste');await page.getByRole('button',{name:'Adicionar acompanhante'}).tap();assert.equal(await page.getByRole('button',{name:'Adicionar acompanhante'}).isDisabled(),true);assert.equal(await page.locator('.companion-fields input').count(),1);
  await page.getByRole('button',{name:'Confirmar minha presença'}).tap();assert.equal(posts,0,'Companion name is required');await page.getByLabel('Nome do acompanhante').fill('Acompanhante Um');
  await page.getByRole('button',{name:'Remover acompanhante'}).tap();assert.equal(await page.getByLabel('Nome do acompanhante').count(),0);assert.equal(await page.getByRole('button',{name:'Remover acompanhante'}).isDisabled(),true);await page.getByRole('button',{name:'Adicionar acompanhante'}).tap();assert.equal(await page.getByLabel('Nome do acompanhante').inputValue(),'Acompanhante Um');assert.equal(await page.getByRole('button',{name:'Adicionar acompanhante'}).isDisabled(),true);
  await page.getByRole('button',{name:'Confirmar minha presença'}).tap();await page.getByText('Falha de teste. Tente novamente.').waitFor();assert.equal(await page.getByLabel('Seu nome completo').inputValue(),'Pessoa de teste');
  fail=false;await page.getByRole('button',{name:'Confirmar minha presença'}).tap();await page.getByRole('button',{name:'Confirmando…'}).waitFor();assert.equal(await page.getByRole('button',{name:'Confirmando…'}).isDisabled(),true);assert.equal(posts,2);release();await page.getByRole('heading',{name:'Presença confirmada!',exact:true}).waitFor();assert.deepEqual(bodies[0],bodies[1]);assert.equal(bodies[1].companions.length,1);await page.getByText('2 presenças confirmadas',{exact:true}).waitFor();await page.screenshot({path:path.join(out,'confirmed-mobile.png'),fullPage:true});assert.deepEqual(errors,[]);
  console.log('PASS public event UI: maximum one companion, payment notice beside companion control, original footer, no login/API auth, mobile 320/390 and desktop, +/- name preserved, required companion name, error/retry and confirmed receipt.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
