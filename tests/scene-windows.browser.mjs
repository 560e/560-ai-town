import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomInt,randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {Pool} from 'pg';
assert.equal(process.env.TOWN_DISPOSABLE_TEST_DB,'1');
const dbUrl=new URL(process.env.DATABASE_URL);assert.equal(dbUrl.hostname,'127.0.0.1');assert.match(dbUrl.pathname,/^\/town_verify_/);
const db=new Pool({connectionString:dbUrl.href}),base=process.env.PASSWORD_TEST_URL;
const {chromium}=createRequire(import.meta.url)(process.env.TOWN_PLAYWRIGHT_MODULE);
const server=await chromium.launchServer({host:'127.0.0.1',executablePath:process.env.TOWN_BROWSER_EXECUTABLE,headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}),browser=await chromium.connect(server.wsEndpoint());
const errors=[];
async function context(ip){const ctx=await browser.newContext({viewport:{width:1280,height:800}});await ctx.route('https://town-password.test/**',async route=>{const r=route.request(),u=new URL(r.url());await route.fulfill({response:await ctx.request.fetch(base+u.pathname+u.search,{method:r.method(),headers:{...r.headers(),host:'town-password.test','x-forwarded-host':'town-password.test','x-forwarded-proto':'https','x-real-ip':ip},data:r.postDataBuffer()??undefined,maxRedirects:0})});});return ctx;}
async function until(check,label){for(let i=0;i<120;i++){const v=await check();if(v)return v;await delay(250);}throw Error('Timed out: '+label);}
const states=['AI创业园','AI商业街','AI社区','五六零AI广场','任务广场'];
try{
 await mkdir('.local/verification',{recursive:true});
 const ctx=await context('127.0.3.1'),page=await ctx.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://town-password.test/account');await db.query('DELETE FROM "rateLimit"');
 const registered=await page.evaluate(async data=>{const r=await fetch('/api/auth/password/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return r.status;},{name:'窗口测试'+randomInt(100000,999999),phoneNumber:'196'+randomInt(10000000,99999999),password:'Windows'+randomUUID()+'42'});assert.equal(registered,200);
 const id=await page.evaluate(async()=>(await(await fetch('/api/account')).json()).user.id);
 await page.goto('https://town-password.test/');await page.getByRole('button',{name:'游览小镇',exact:true}).click();await page.getByRole('button',{name:'街区导航',exact:true}).waitFor();
 await page.locator('canvas').first().waitFor();await page.evaluate(()=>{window.__originalTownCanvas=document.querySelector('canvas');});
 const row=async()=>(await db.query('SELECT room,room_instance,pose,scene,online FROM town_presence WHERE user_id=$1',[id])).rows[0];await until(async()=>(await row())?.online,'town membership');const original=await row();
 for(const [index,title] of states.entries()){
  await page.getByRole('button',{name:'街区导航',exact:true}).click();await page.getByRole('navigation',{name:'街区子页面'}).getByRole('button',{name:new RegExp(title)}).click();
  const panel=page.getByRole('dialog',{name:title,exact:true});await panel.waitFor();assert.ok(await panel.getByText('功能筹备中 · 当前开放版块介绍',{exact:true}).isVisible());
  assert.equal(new URL(page.url()).pathname,'/');assert.equal(await page.evaluate(()=>window.__originalTownCanvas===document.querySelector('canvas')),true);
  await page.keyboard.press('Tab');assert.equal(await panel.evaluate(el=>el.contains(document.activeElement)),true);await page.keyboard.press('Shift+Tab');assert.equal(await panel.evaluate(el=>el.contains(document.activeElement)),true);
  await page.keyboard.press('w');await delay(750);const current=await row();assert.equal(current.scene,'town');assert.equal(current.room,original.room);assert.equal(current.room_instance,original.room_instance);assert.equal(current.pose.x,original.pose.x);assert.equal(current.pose.z,original.pose.z);
  if(index%2)await panel.getByRole('button',{name:'关闭'+title,exact:true}).click();else await page.keyboard.press('Escape');await panel.waitFor({state:'detached'});
 }
 await page.setViewportSize({width:390,height:600});await page.getByRole('button',{name:'街区导航',exact:true}).click();await page.getByRole('navigation',{name:'街区子页面'}).getByRole('button',{name:/AI商业街/}).click();
 const mobile=page.getByRole('dialog',{name:'AI商业街',exact:true});await mobile.waitFor();await mobile.getByRole('button',{name:'继续游览',exact:true}).scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'.local/verification/scene-window-mobile.png'});await mobile.getByRole('button',{name:'关闭AI商业街',exact:true}).click();
 await page.setViewportSize({width:1280,height:800});await page.getByRole('button',{name:'进入小镇',exact:true}).click();await page.getByRole('button',{name:'前往街区',exact:true}).click();await page.getByRole('navigation',{name:'步行起点'}).getByRole('button',{name:/商业街/}).click();
 await page.getByRole('button',{name:/进入AI商业街/}).waitFor();await page.keyboard.press('e');await page.getByRole('dialog',{name:'AI商业街',exact:true}).waitFor();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.__originalTownCanvas===document.querySelector('canvas')),true);
 console.log('PASS five district windows preserve canvas, room, pose; keyboard close/focus, mobile scroll and walking E');
 // Old bookmarked URLs become one-shot intents; visitors must not see resident content.
 const guest=await context('127.0.3.2'),guestPage=await guest.newPage();guestPage.setDefaultTimeout(60000);guestPage.on('pageerror',e=>errors.push(e.message));const legacy=await guest.request.get(base+'/districts/creative-street',{headers:{host:'town-password.test','x-forwarded-host':'town-password.test','x-forwarded-proto':'https'},maxRedirects:0});assert.equal(legacy.status(),307);assert.equal(legacy.headers().location,'/?district=creative-street');await guestPage.goto(new URL(legacy.headers().location,'https://town-password.test').href);const gate=guestPage.getByRole('dialog',{name:/注册／登录后进入AI商业街/});await gate.waitFor();assert.equal(await guestPage.locator('.district-window').count(),0);await gate.getByRole('button',{name:'继续游览小镇',exact:true}).click();await gate.waitFor({state:'detached'});assert.equal(new URL(guestPage.url()).pathname,'/');assert.equal(new URL(guestPage.url()).search,'');assert.equal(await guestPage.getByRole('button',{name:'游览小镇',exact:true}).count(),0);await guestPage.getByRole('button',{name:'前往街区',exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log('PASS legacy district visitor login gate cancels to town without homepage or protected content');
}finally{for(const c of browser.contexts())await c.unrouteAll({behavior:'ignoreErrors'});await server.kill();await db.end();}
