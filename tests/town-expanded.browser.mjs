import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {randomInt,randomUUID} from 'node:crypto';
const {chromium}=createRequire(import.meta.url)(process.env.TOWN_PLAYWRIGHT_MODULE);
assert.equal(process.env.TOWN_DISPOSABLE_TEST_DB,'1');
const base=process.env.PASSWORD_TEST_URL;assert.equal(new URL(base).hostname,'127.0.0.1');
const browser=await chromium.launch({executablePath:process.env.TOWN_BROWSER_EXECUTABLE,headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.route('https://town-password.test/**',async route=>{const req=route.request(),u=new URL(req.url());await route.fulfill({response:await context.request.fetch(base+u.pathname+u.search,{method:req.method(),headers:{...req.headers(),host:'town-password.test','x-forwarded-host':'town-password.test','x-forwarded-proto':'https','x-real-ip':'127.0.0.6'},data:req.postDataBuffer()??undefined,maxRedirects:0})});});
 const errors=[];
 if(process.env.TOWN_NPC_ONLY!=='1'){
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 await mkdir('.local/verification',{recursive:true});
 const shot=async name=>{await page.waitForTimeout(1000);await page.screenshot({path:'.local/verification/'+name+'.png'});};
 await page.goto('https://town-password.test/');
 await page.getByRole('button',{name:'游览小镇',exact:true}).click();
 await page.getByRole('button',{name:'进入小镇',exact:true}).waitFor();
 await shot('expanded-overview-desktop');
 await page.getByRole('button',{name:'进入小镇',exact:true}).click();
 await page.waitForTimeout(1000);await page.keyboard.down('w');await page.waitForTimeout(700);await page.keyboard.up('w');
 await page.getByRole('link',{name:'登录／注册',exact:true}).click();
 const pose=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('560-town-account-return-v1')));
 assert.equal(pose.layoutVersion,2);assert.equal(pose.mode,'walking');assert.ok(pose.player.z<81&&pose.player.z>58,'movement starts at expanded entry and advances inward');
 console.log('PASS expanded entry and walking return snapshot: '+pose.player.z.toFixed(2));
 const phoneNumber='196'+randomInt(10000000,99999999),password='Scene'+randomUUID()+'42';
 const status=await page.evaluate(async data=>(await fetch('/api/auth/password/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})).status,{name:'测试'+Math.random().toString(36).slice(2,12),phoneNumber,password});assert.equal(status,200);
 await page.reload(); await page.getByRole('link',{name:'游览小镇',exact:true}).click();
 await page.getByRole('button',{name:'前往街区',exact:true}).click();
 await page.getByRole('navigation',{name:'步行起点'}).getByRole('button',{name:/服务中心/}).click();
 await page.getByRole('button',{name:/进入AI服务中心/}).waitFor();
 await shot('expanded-service-door');
 await page.keyboard.press('e');
 await page.waitForURL('**/service');
 await page.getByRole('button',{name:'大厅导航',exact:true}).waitFor();
 await page.locator('canvas').waitFor();await page.waitForTimeout(1500);
 await shot('hall-interior-desktop');
 await page.setViewportSize({width:430,height:932});await shot('hall-interior-mobile');
 await page.setViewportSize({width:1440,height:1000});
 await page.mouse.move(450,450);await page.mouse.down();await page.mouse.move(1150,450,{steps:20});await page.mouse.up();
 await page.mouse.wheel(0,10000);await shot('hall-interior-rotated');
 await page.mouse.move(1150,450);await page.mouse.down();await page.mouse.move(450,450,{steps:20});await page.mouse.up();
 await page.locator('canvas').focus();await page.keyboard.down('w');
 try{await page.getByRole('button',{name:/与小零交谈/}).waitFor();}finally{await page.keyboard.up('w');}
 console.log('PASS service doorway E entry and hall walking reaches reception');
 await page.getByRole('link',{name:'返回小镇',exact:true}).click();
 await page.getByRole('button',{name:/进入AI服务中心/}).waitFor();
 await page.getByRole('button',{name:'返回全景',exact:true}).click();
 await page.setViewportSize({width:430,height:932});await shot('expanded-overview-mobile');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);
 console.log('PASS service return, mobile overview and no browser runtime errors');
 await page.close();
 }
 // NPC interaction is local; do not let the previous account's authoritative presence
 // restore a different position over this deliberately seeded guest scene.
 await context.clearCookies();
 const npcPage=await context.newPage();npcPage.setDefaultTimeout(60000);npcPage.on('pageerror',e=>errors.push(e.message));
 await npcPage.addInitScript(()=>sessionStorage.setItem('560-town-pending-arrival-v1',JSON.stringify({version:1,layoutVersion:2,mode:'walking',player:{x:-6,z:81,yaw:Math.PI,lookYaw:0,pitch:.15,view:'third',exists:true,seat:null},zoom:{third:7,first:60},overview:null})));
 await npcPage.goto('https://town-password.test/');
 await npcPage.getByRole('button',{name:/与附近居民聊聊/}).click();console.log('PASS NPC dialog opens');
 const dialog=npcPage.getByRole('dialog',{name:/小镇居民/}),line=dialog.locator('p[aria-live]');
 const first=await line.innerText();assert.equal(await dialog.getByRole('button',{name:/下次见/}).evaluate(el=>el===document.activeElement),true);
 await npcPage.keyboard.press('e');await npcPage.waitForFunction(text=>document.querySelector('.npc-dialog p[aria-live]')?.textContent!==text,first);
 const second=await line.innerText();assert.notEqual(first,second);
 await dialog.getByRole('button',{name:/再聊一句/}).focus();await npcPage.keyboard.press('E');
 await npcPage.waitForFunction(text=>document.querySelector('.npc-dialog p[aria-live]')?.textContent!==text,second);
 await npcPage.keyboard.press('Space');await dialog.waitFor({state:'hidden'});
 console.log('PASS NPC E twice and Space close');
 await npcPage.getByRole('button',{name:/与附近居民聊聊/}).click();await npcPage.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 assert.deepEqual(errors,[]);console.log('PASS NPC E continues with close/continue buttons focused; Space and Escape close');
}finally{await browser.close();}
