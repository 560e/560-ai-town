import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomInt,randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {Pool} from 'pg';
assert.equal(process.env.TOWN_DISPOSABLE_TEST_DB,'1');
const dbUrl=new URL(process.env.DATABASE_URL);assert.equal(dbUrl.hostname,'127.0.0.1');assert.match(dbUrl.pathname,/^\/town_verify_/);
const base=process.env.PASSWORD_TEST_URL,db=new Pool({connectionString:dbUrl.href}),{chromium}=createRequire(import.meta.url)(process.env.TOWN_PLAYWRIGHT_MODULE);
const browserServer=await chromium.launchServer({host:'127.0.0.1',executablePath:process.env.TOWN_BROWSER_EXECUTABLE,headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}),browser=await chromium.connect(browserServer.wsEndpoint());
async function context(ip){const c=await browser.newContext({viewport:{width:1360,height:960}});await c.route('https://town-password.test/**',async route=>{const req=route.request(),u=new URL(req.url());await route.fulfill({response:await c.request.fetch(base+u.pathname+u.search,{method:req.method(),headers:{...req.headers(),host:'town-password.test','x-forwarded-host':'town-password.test','x-forwarded-proto':'https','x-real-ip':ip,'x-forwarded-for':ip},data:req.postDataBuffer()??undefined,maxRedirects:0})});});return c;}
async function register(page){await page.goto('https://town-password.test/account');assert.equal(await page.evaluate(async data=>(await fetch('/api/auth/password/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})).status,{name:'测试'+Math.random().toString(36).slice(2,12),phoneNumber:'195'+randomInt(10000000,99999999),password:'AcademyBrowser'+randomUUID()+'42'}),200);return (await page.evaluate(async()=>(await fetch('/api/account')).json())).user;}
const errors=[];
try{
 const c=await context('127.0.0.112'),page=await c.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));const learner=await register(page);
 await db.query('UPDATE "user" SET role=\'admin\' WHERE id=$1',[learner.id]);
 assert.equal(await page.evaluate(async()=>{const r=await fetch('/api/manage/academy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'save',course:{title:'外部学习课程',summary:'在课程平台继续学习。',url:'https://example.com/external-course',coverAssetId:null,sort:0,published:true}})});return r.status;}),200);
 await db.query('UPDATE "user" SET role=\'user\' WHERE id=$1',[learner.id]);
 await page.goto('https://town-password.test/districts/learning-campus');await page.getByRole('button',{name:'校园导航',exact:true}).waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='校园导航'&&!b.disabled));
 await page.getByRole('button',{name:'校园导航',exact:true}).click();await page.getByRole('navigation',{name:'校园目的地'}).getByRole('button',{name:/AI 教学楼/}).click();
 let arrived=false;for(let i=0;i<120;i++){const pose=(await db.query('SELECT pose FROM town_presence WHERE user_id=$1',[learner.id])).rows[0]?.pose;if(pose?.x===0&&pose?.z===-18){arrived=true;break;}await delay(250);}assert.ok(arrived,'teaching arrival persisted before position baseline');const before=(await db.query('SELECT room,room_instance,scene,pose FROM town_presence WHERE user_id=$1',[learner.id])).rows[0];
 await page.keyboard.press('e');const dialog=page.getByRole('dialog');await dialog.getByRole('heading',{name:'外部学习课程',exact:true}).waitFor();assert.equal(new URL(page.url()).pathname,'/districts/learning-campus');
 const link=dialog.getByRole('link',{name:/前往网校学习/}).first();assert.equal(await link.getAttribute('target'),'_blank');assert.match(await link.getAttribute('rel'),/noopener/);assert.equal(await link.getAttribute('href'),'https://example.com/external-course');
 await c.route('https://example.com/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<h1>外部课程测试页面</h1>'}));const popupEvent=c.waitForEvent('page');await link.click();const popup=await popupEvent;await popup.getByRole('heading',{name:'外部课程测试页面'}).waitFor();assert.equal(await popup.evaluate(()=>window.opener===null),true);await popup.close();
 await mkdir('.local/verification',{recursive:true});await page.screenshot({path:'.local/verification/academy-external-modal.png'});await page.setViewportSize({width:430,height:932});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'.local/verification/academy-external-modal-mobile.png'});await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 const after=(await db.query('SELECT room,room_instance,scene,pose FROM town_presence WHERE user_id=$1',[learner.id])).rows[0];assert.equal(after.room,before.room);assert.equal(after.room_instance,before.room_instance);assert.equal(after.scene,'learning-campus');assert.equal(after.pose.x,before.pose.x);assert.equal(after.pose.z,before.pose.z);
 await page.getByRole('button',{name:'公开课程',exact:true}).click();await page.getByRole('dialog').getByRole('heading',{name:'外部学习课程',exact:true}).waitFor();await page.getByRole('button',{name:'关闭学院课程目录',exact:true}).click();assert.equal(new URL(page.url()).pathname,'/districts/learning-campus');
 await page.goto('https://town-password.test/academy');await page.getByRole('heading',{name:'外部学习课程',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:/加入课程|确认完成|保存草稿|提交审核/}).count(),0);assert.equal(await page.locator('video').count(),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.goto('https://town-password.test/academy?view=course&id='+randomUUID());await page.getByRole('heading',{name:'外部学习课程',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:/加入课程|确认完成/}).count(),0);
 assert.deepEqual(errors,[]);console.log('PASS external catalog modal, safe new-tab launch, same campus room/pose, mobile and legacy route fallback');
}catch(error){await mkdir('.local/verification',{recursive:true});for(const [i,c] of browser.contexts().entries()){const p=c.pages().at(-1);if(p)await p.screenshot({path:'.local/verification/academy-external-failure-'+i+'.png',fullPage:true}).catch(()=>{});}throw error;}finally{for(const c of browser.contexts())await c.unrouteAll({behavior:'ignoreErrors'});await browserServer.kill();await db.end();}



