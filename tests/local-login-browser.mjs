// Read the local login UI; optional explicitly selected existing account verifies OTP recovery.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.TOWN_PLAYWRIGHT_MODULE);
const base=process.env.TOWN_LOCAL_LOGIN_URL||'http://localhost:3000';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const browser=await chromium.launch({headless:true,executablePath:process.env.TOWN_BROWSER_EXECUTABLE});
try{
 const page=await browser.newPage();
 await page.goto(base+'/account');
 const info=await page.evaluate(async()=>await(await fetch('/api/account')).json());
 assert.ok(info.local&&info.password,'Both local OTP and password capabilities required');
 await page.getByRole('button',{name:'本地验证码登录',exact:true}).click({timeout:10000});
 await page.getByRole('button',{name:'获取验证码',exact:true}).waitFor();
 console.log('PASS local OTP login stays available alongside password login');
 if(process.env.TOWN_LOCAL_RECOVERY_PHONE){
  await page.getByLabel('手机号',{exact:true}).fill(process.env.TOWN_LOCAL_RECOVERY_PHONE);
  const sent=page.waitForResponse(r=>r.url().endsWith('/api/auth/phone-number/send-otp'));
  await page.getByRole('button',{name:'获取验证码',exact:true}).click();
  const response=await sent;assert.equal(response.status(),200,'OTP request must succeed; respect the existing 60-second cooldown between runs');
  await page.getByRole('button',{name:'填入验证码',exact:true}).click();
  await page.getByRole('button',{name:'登录／注册',exact:true}).click();
  await page.locator('.wb-content').waitFor();
  const me=await page.evaluate(async()=>await(await fetch('/api/account')).json());
  assert.equal(me.user.role,'super_admin');assert.equal(me.user.hasPassword,false);
  await page.goto(base+'/account?section=settings');
  await page.getByRole('heading',{name:'设置登录密码',exact:true}).waitFor();
  assert.equal(await page.getByLabel('新密码',{exact:true}).isVisible(),true);
  console.log('PASS existing passwordless administrator can log in and reach password setup');
  await page.evaluate(async()=>await fetch('/api/auth/sign-out',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}));
 }
 await page.goto(base+'/account');
 await page.getByRole('button',{name:'手机号密码登录',exact:true}).click();
 await page.getByLabel('密码',{exact:true}).waitFor();
 console.log('PASS password login remains available');
}finally{await browser.close();}
