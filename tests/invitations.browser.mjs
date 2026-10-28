import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomInt,randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {Pool} from 'pg';
assert.equal(process.env.TOWN_DISPOSABLE_TEST_DB,'1');
const url=new URL(process.env.DATABASE_URL);assert.equal(url.hostname,'127.0.0.1');assert.match(url.pathname,/^\/town_verify_/);
const db=new Pool({connectionString:url.href}),base=process.env.PASSWORD_TEST_URL;
const {chromium}=createRequire(import.meta.url)(process.env.TOWN_PLAYWRIGHT_MODULE);
const server=await chromium.launchServer({host:'127.0.0.1',executablePath:process.env.TOWN_BROWSER_EXECUTABLE,headless:true}),browser=await chromium.connect(server.wsEndpoint());
const errors=[];
async function context(ip){const c=await browser.newContext({viewport:{width:1360,height:960}});await c.route('https://town-password.test/**',async route=>{const r=route.request(),u=new URL(r.url());await route.fulfill({response:await c.request.fetch(base+u.pathname+u.search,{method:r.method(),headers:{...r.headers(),host:'town-password.test','x-forwarded-host':'town-password.test','x-forwarded-proto':'https','x-real-ip':ip},data:r.postDataBuffer()??undefined,maxRedirects:0})});});return c;}
try{
  await mkdir('.local/verification',{recursive:true});
  const admin=await context('127.0.2.1'),page=await admin.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
  await page.goto('https://town-password.test/account');
  await db.query('DELETE FROM "rateLimit"');
  const info=await page.evaluate(async data=>{await fetch('/api/auth/password/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return(await fetch('/api/account')).json();},{name:'测试'+Math.random().toString(36).slice(2,12),phoneNumber:'196'+randomInt(10000000,99999999),password:'InvitationBrowser'+randomUUID()+'42'});
  await db.query("UPDATE \"user\" SET role='super_admin' WHERE id=$1",[info.user.id]);
  await page.goto('https://town-password.test/'+process.env.TOWN_SYSTEM_ENTRY+'?section=registration');
  // Use navigation link to avoid assuming the private entry's query convention.
  if(!await page.getByRole('heading',{name:'账号与注册设置'}).count())await page.getByRole('link',{name:'账号与注册',exact:false}).first().click();
  await page.getByRole('heading',{name:'账号与注册设置'}).waitFor();
  await page.getByLabel('邀请码生成数量').fill('3');await page.getByRole('button',{name:'生成邀请码',exact:true}).click();
  await page.locator('#generated-invites').waitFor();const codes=(await page.locator('#generated-invites').inputValue()).split('\n');assert.equal(codes.length,3);
  await page.getByRole('switch',{name:'注册时要求邀请码',exact:true}).check();await page.getByRole('button',{name:'保存注册设置',exact:true}).click();await page.getByText('注册设置已保存，新的注册请求立即使用此规则。已有账号和登录方式不变。').waitFor();
  await page.getByRole('heading',{name:'邀请码管理',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:'.local/verification/invitation-admin-desktop.png',fullPage:true});
  const resident=await context('127.0.2.2'),signup=await resident.newPage();signup.on('pageerror',e=>errors.push(e.message));await signup.setViewportSize({width:430,height:932});
  await signup.goto('https://town-password.test/account');await signup.getByRole('button',{name:'注册居民',exact:true}).click();await signup.locator('#registration-invite').waitFor();
  assert.ok(await signup.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await signup.screenshot({path:'.local/verification/invitation-register-mobile.png',fullPage:true});
  await signup.locator('#registration-name').fill('界面测试'+randomInt(100000,999999));await signup.locator('#password-phone').fill('196'+randomInt(10000000,99999999));await signup.locator('#login-password').fill('InvitationBrowser12345');await signup.locator('#confirm-password').fill('InvitationBrowser12345');await signup.locator('#registration-invite').fill(codes[0]);
  await db.query('DELETE FROM "rateLimit"');
  await signup.getByRole('button',{name:'注册并进入小镇',exact:true}).click();await signup.locator('#registration-invite').waitFor({state:'detached'});
  assert.ok((await signup.evaluate(async()=>(await(await fetch('/api/account')).json()).user)).id);
  await signup.goto('https://town-password.test/account?section=settings');
  await signup.locator('#resident-name').waitFor();
  for(const viewport of [{width:1280,height:600},{width:390,height:700},{width:390,height:360}]){
    await signup.setViewportSize(viewport);
    const changedName='资料测试'+randomInt(100000,999999);
    await signup.locator('#resident-name').fill(changedName);
    const save=signup.getByRole('button',{name:'保存资料',exact:true});
    await save.scrollIntoViewIfNeeded();
    const box=await save.boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=viewport.height,'save reachable in short/mobile viewport');
    await save.click();await signup.getByText('居民资料已保存',{exact:true}).waitFor();
    assert.equal((await signup.evaluate(async()=>(await(await fetch('/api/account')).json()).user)).name,changedName);
    assert.ok(await signup.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await signup.screenshot({path:'.local/verification/account-profile-mobile.png'});
  await page.getByRole('button',{name:'刷新记录',exact:true}).click();await page.getByRole('cell',{name:'已使用',exact:true}).first().waitFor();
  await page.setViewportSize({width:430,height:932});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'.local/verification/invitation-admin-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS invitation admin generation/settings/use state and mobile resident registration UI');
}finally{for(const c of browser.contexts())await c.unrouteAll({behavior:'ignoreErrors'});await server.kill();await db.end();}
