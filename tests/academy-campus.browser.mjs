import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomInt,randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {Pool} from 'pg';
import {localHttp as fetch} from './local-http.mjs';
assert.equal(process.env.TOWN_DISPOSABLE_TEST_DB,'1');
const dbUrl=new URL(process.env.DATABASE_URL);assert.match(dbUrl.pathname,/^\/town_verify_/);assert.equal(dbUrl.hostname,'127.0.0.1');
const base=process.env.PASSWORD_TEST_URL,{chromium}=createRequire(import.meta.url)(process.env.TOWN_PLAYWRIGHT_MODULE);
const db=new Pool({connectionString:dbUrl.href}),browserServer=await chromium.launchServer({host:'127.0.0.1',executablePath:process.env.TOWN_BROWSER_EXECUTABLE,headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const browser=await chromium.connect(browserServer.wsEndpoint());
let keepPeer=false,peerLoop;
async function until(check,label){for(let i=0;i<120;i++){const value=await check();if(value)return value;await delay(250);}throw Error('Timed out: '+label);}
try{
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 await context.route('https://town-password.test/**',async route=>{const req=route.request(),u=new URL(req.url());await route.fulfill({response:await context.request.fetch(base+u.pathname+u.search,{method:req.method(),headers:{...req.headers(),host:'town-password.test','x-forwarded-host':'town-password.test','x-forwarded-proto':'https','x-real-ip':'127.0.0.81','x-forwarded-for':'127.0.0.81'},data:req.postDataBuffer()??undefined,maxRedirects:0})});});
 const page=await context.newPage(),errors=[],leaves=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('/api/town/presence')&&r.postDataJSON()?.op==='leave')leaves.push(r.postDataJSON());});
 await page.goto('https://town-password.test/districts/learning-campus');await page.getByRole('heading',{name:/注册／登录后进入/}).waitFor();assert.equal(await page.locator('canvas').count(),0);
 await page.goto('https://town-password.test/account');
 const phoneNumber='196'+randomInt(10000000,99999999),password='BrowserScene'+randomUUID()+'42';
 assert.equal(await page.evaluate(async data=>(await fetch('/api/auth/password/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})).status,{name:'测试'+Math.random().toString(36).slice(2,12),phoneNumber,password}),200);
 await page.goto('https://town-password.test/districts/learning-campus');
 const account=await page.evaluate(async()=>(await fetch('/api/account')).json()),id=account.user.id;
 const row=async()=>(await db.query('SELECT * FROM town_presence WHERE user_id=$1',[id])).rows[0];
 await until(async()=>(await row())?.scene==='learning-campus','campus joined');
 await page.getByRole('button',{name:'校园导航',exact:true}).waitFor();
 await until(async()=>await page.getByRole('button',{name:'校园导航',exact:true}).isEnabled(),'campus ready');
 await mkdir('.local/verification',{recursive:true});await page.screenshot({path:'.local/verification/academy-campus-entry.png'});assert.equal((await row()).pose.z,37);const initial=await row();
 const arrivals=[['学校公告牌',-9,35],['AI 图书馆',-15,-4],['AI 讲堂',15,-4],['学生中心',0,32],['学院引导员',-5,31],['教学助理',7,-15],['图书管理员',-14,2],['学习助手',3,18],['校园长椅',-9,-9],['课程导览',-9,-17],['AI 教学楼',0,-18]];
 const navigate=async name=>{const destination=arrivals.find(([label])=>name.test(label));assert.ok(destination,'known navigation arrival');await page.getByRole('button',{name:'校园导航',exact:true}).click();await page.getByRole('navigation',{name:'校园目的地'}).getByRole('button',{name}).first().click();await until(async()=>{const pose=(await row())?.pose;return pose?.x===destination[1]&&pose?.z===destination[2];},'persisted arrival '+destination[0]);};
 await navigate(/学校公告牌/);await page.keyboard.press('e');await page.getByRole('heading',{name:'学校公告牌',exact:true}).waitFor();const publicCourses=await page.evaluate(async()=>(await fetch('/api/academy')).json());if(publicCourses.courses.length)await page.getByRole('dialog').getByRole('heading',{name:publicCourses.courses[0].title,exact:true}).waitFor();else await page.getByText('课程目录正在准备',{exact:true}).waitFor();await page.keyboard.press('Space');
 for(const [label,title] of [[/AI 图书馆/,'AI 图书馆'],[/AI 讲堂/,'AI 讲堂'],[/学生中心/,'学生中心']]){await navigate(label);await page.keyboard.press('e');await page.getByRole('heading',{name:title,exact:true}).waitFor();await page.keyboard.press('Escape');}
 for(const name of ['学院引导员','教学助理','图书管理员','学习助手']){await navigate(new RegExp(name));await page.keyboard.press('e');await page.getByRole('heading',{name,exact:true}).waitFor();const beforeText=await page.locator('.service-prose').innerText();await page.keyboard.press('e');await until(async()=>(await page.locator('.service-prose').innerText())!==beforeText,'NPC E continuation');await page.keyboard.press('Space');}
 await navigate(/校园长椅/);await page.keyboard.press('e');await until(async()=>(await row()).pose.seat!==null,'seated');await page.keyboard.press('e');await until(async()=>(await row()).pose.seat===null,'standing');
 for(const entry of [/课程导览/,/AI 教学楼/]){await navigate(entry);const before=await row();await page.keyboard.press('e');await page.getByRole('heading',{name:'学院课程目录',exact:true}).waitFor();await page.getByRole('heading',{name:'探索 AI 课程',exact:true}).waitFor();assert.equal(new URL(page.url()).pathname,'/districts/learning-campus');await page.keyboard.press('Escape');assert.equal((await row()).scene,'learning-campus');assert.equal((await row()).pose.x,before.pose.x);assert.equal((await row()).pose.z,before.pose.z);assert.equal((await row()).room_instance,initial.room_instance);} await navigate(/学校公告牌/);const canvas=page.locator('canvas');await canvas.focus();const prior=(await row()).pose;await page.keyboard.down('d');await delay(350);await page.keyboard.up('d');await until(async()=>Math.abs((await row()).pose.x-prior.x)>.2,'keyboard movement');
 await canvas.hover();await page.mouse.wheel(0,600);await delay(200);await page.mouse.move(700,450);await page.mouse.down();await page.mouse.move(940,450,{steps:10});await page.mouse.up();
 await mkdir('.local/verification',{recursive:true});await page.screenshot({path:'.local/verification/academy-campus-desktop.png'});
 await page.setViewportSize({width:430,height:932});const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:140,y:400},{x:270,y:400}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:120,y:400},{x:320,y:400}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'.local/verification/academy-campus-mobile.png'});
 assert.equal(leaves.length,0);assert.deepEqual(errors,[]);console.log('PASS campus spawn, real/empty board, fixed E entries, seats, movement, in-place catalog room and position retention, responsive controls');
}catch(error){await mkdir('.local/verification',{recursive:true});for(const c of browser.contexts()){const p=c.pages().at(-1);if(p)await p.screenshot({path:'.local/verification/academy-campus-failure.png'}).catch(()=>{});}throw error;}finally{for(const c of browser.contexts())await c.unrouteAll({behavior:'ignoreErrors'});await browserServer.kill();await db.end();}



