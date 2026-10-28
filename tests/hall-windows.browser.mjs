import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomInt,randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {Pool} from 'pg';
assert.equal(process.env.TOWN_DISPOSABLE_TEST_DB,'1');
const dbUrl=new URL(process.env.DATABASE_URL);assert.match(dbUrl.pathname,/^\/town_verify_/);assert.equal(dbUrl.hostname,'127.0.0.1');
const base=process.env.PASSWORD_TEST_URL,{chromium}=createRequire(import.meta.url)(process.env.TOWN_PLAYWRIGHT_MODULE);
const db=new Pool({connectionString:dbUrl.href}),server=await chromium.launchServer({host:'127.0.0.1',executablePath:process.env.TOWN_BROWSER_EXECUTABLE,headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}),browser=await chromium.connect(server.wsEndpoint());
async function until(check,label){for(let i=0;i<120;i++){if(await check())return;await delay(250);}throw Error('Timed out: '+label);}
try{
 const context=await browser.newContext({viewport:{width:1280,height:780}});
 await context.route('https://town-password.test/**',async route=>{const req=route.request(),u=new URL(req.url());await route.fulfill({response:await context.request.fetch(base+u.pathname+u.search,{method:req.method(),headers:{...req.headers(),host:'town-password.test','x-forwarded-host':'town-password.test','x-forwarded-proto':'https','x-real-ip':'127.0.0.87'},data:req.postDataBuffer()??undefined,maxRedirects:0})});});
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 await db.query('UPDATE town_registration_settings SET invite_required=false');await db.query('DELETE FROM "rateLimit"');
 await page.goto('https://town-password.test/account');
 assert.equal(await page.evaluate(async data=>(await fetch('/api/auth/password/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})).status,{name:'大厅测试'+randomInt(100000,999999),phoneNumber:'196'+randomInt(10000000,99999999),password:'SceneWindow'+randomUUID()+'42'}),200);
 const account=await page.evaluate(async()=>(await fetch('/api/account')).json()),id=account.user.id,row=async()=>(await db.query('SELECT * FROM town_presence WHERE user_id=$1',[id])).rows[0];
 // UI-only published-title fixture; no live title or grant is created/changed.
 const title={id:randomUUID(),version:1,benefits:[],config:{name:'窗口交互测试身份',kind:'honor',badge:'star',color:'blue',summary:'临时界面测试资料',description:'仅隔离浏览器测试使用',district:'civic-hall',visible:true,accepting:true,archived:false,featured:false,order:0,days:0,conditions:'',npc:'',fields:[{id:'f_reason',label:'申请说明',kind:'long',required:false,help:'',options:[]}],permissions:[]}};
 const content={intro:'服务中心',welcome:'欢迎办理',faq:'按实际身份权限办理'};
 await page.route('**/api/service',route=>route.fulfill({json:{titles:[title],content,guides:[],filters:{categories:[],districts:[{id:'civic-hall',name:'AI服务中心'}]}}}));
 await page.route('**/api/service/titles/'+title.id,route=>route.fulfill({json:{titles:[title]}}));
 await page.goto('https://town-password.test/service');await until(async()=>(await row())?.scene==='service','hall online');
 await until(()=>page.getByRole('button',{name:'大厅导航',exact:true}).isEnabled(),'hall rendered');
 const hallCanvas=await page.locator('.hall-scene canvas').elementHandle();const before=await row();
 await page.getByRole('button',{name:'身份与服务',exact:true}).click();await page.getByRole('link',{name:'了解并申请 ↗',exact:true}).click();
 await page.getByLabel('申请说明').fill('正在填写，不应被关闭丢失');await page.getByRole('button',{name:'返回上一级',exact:true}).click();
 await page.getByText('申请资料还没有保存。要先留下继续填写，还是放弃修改？').waitFor();await page.getByRole('button',{name:'继续填写',exact:true}).click();assert.equal(await page.getByLabel('申请说明').inputValue(),'正在填写，不应被关闭丢失');
 await page.setViewportSize({width:390,height:660});await page.getByRole('button',{name:'保存草稿',exact:true}).scrollIntoViewIfNeeded();const save=await page.getByRole('button',{name:'保存草稿',exact:true}).boundingBox();assert.ok(save.y>=0&&save.y+save.height<=660);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await mkdir('.local/verification',{recursive:true});await page.screenshot({path:'.local/verification/service-window-mobile.png'});
 await page.getByRole('button',{name:'关闭称号与申请',exact:true}).click();await page.getByRole('button',{name:'放弃修改并离开',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 assert.equal(await hallCanvas.evaluate(el=>el.isConnected),true);assert.equal(new URL(page.url()).pathname,'/service');const after=await row();assert.equal(after.room,before.room);assert.equal(after.scene,before.scene);assert.equal(after.pose.x,before.pose.x);assert.equal(after.pose.z,before.pose.z);
 console.log('PASS service modal nested navigation, dirty confirmation, mobile save reachability and same scene/canvas/pose');
 await page.setViewportSize({width:1280,height:780});await page.goto('https://town-password.test/districts/learning-campus');await until(async()=>(await row())?.scene==='learning-campus','campus online');await until(()=>page.getByRole('button',{name:'校园导航',exact:true}).isEnabled(),'campus ready');
 const campusCanvas=await page.locator('.hall-scene canvas').elementHandle();
 await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('button',{name:'学院引导员',exact:false}).click();await page.getByRole('heading',{name:'学院引导员',exact:true}).waitFor();
 const line=await page.locator('.service-prose').innerText();await page.keyboard.press('e');await until(async()=>(await page.locator('.service-prose').innerText())!==line,'NPC E continues');
 await page.getByRole('button',{name:'浏览课程目录 ↗',exact:true}).click();await page.getByRole('heading',{name:'学院课程目录',exact:true}).waitFor();await page.getByRole('button',{name:'返回上一级',exact:true}).click();await page.getByRole('heading',{name:'学院引导员',exact:true}).waitFor();await page.keyboard.press('Space');await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await campusCanvas.evaluate(el=>el.isConnected),true);assert.equal(new URL(page.url()).pathname,'/districts/learning-campus');
 assert.deepEqual(errors,[]);console.log('PASS campus NPC E/Space, catalog Back and retained canvas');
 await context.close();
}finally{await browser.close();await server.close();await db.end();}
