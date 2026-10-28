// Isolated verification against the standard LOCAL cluster. Never uses a configured remote DB.
import {readFileSync,existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {Pool} from 'pg';
import {healthHeaders} from './deploy/config.mjs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {localHttp as fetch} from '../tests/local-http.mjs';
process.chdir(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
if(!existsSync('.next/BUILD_ID'))throw Error('先完成 npm run build');
const settings=JSON.parse(readFileSync('.local/database.json','utf8'));
const owner=new Pool({host:'127.0.0.1',port:55460,database:'postgres',user:'town_local_owner',password:settings.adminPassword,connectionTimeoutMillis:4000});
const name='town_verify_'+randomBytes(6).toString('hex'),port=3318;
let server,created=false;
const env={...process.env,DATABASE_URL:`postgresql://town_app:${encodeURIComponent(settings.appPassword)}@127.0.0.1:55460/${name}`,BETTER_AUTH_SECRET:randomBytes(48).toString('hex'),BETTER_AUTH_URL:'https://town-password.test',TOWN_LOCAL_AUTH:'0',TOWN_LOCAL_TEST_RESIDENT:'0',TOWN_PASSWORD_AUTH:'1',TOWN_TRUST_PROXY:'1',TOWN_DISPOSABLE_TEST_DB:'1',PASSWORD_TEST_URL:`http://127.0.0.1:${port}`,TOWN_MANAGE_ENTRY:'gate-'+randomBytes(16).toString('hex'),TOWN_SYSTEM_ENTRY:'gate-'+randomBytes(16).toString('hex'),NODE_ENV:'production'};
async function run(args){const child=spawn(process.execPath,args,{env,stdio:'inherit',windowsHide:true});const [code]=await once(child,'exit');if(code!==0)throw Error('Verification command failed: '+args.join(' '));}
try{
  // Check the port without taking over any listener.
  const {createServer}=await import('node:net');const probe=createServer();await new Promise((ok,fail)=>{probe.once('error',fail);probe.listen(port,'127.0.0.1',ok);});await new Promise(ok=>probe.close(ok));
  await owner.query(`CREATE DATABASE ${name} OWNER town_app`);created=true;
  await run(['--experimental-strip-types','scripts/database-migrate.ts']);
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env,stdio:['ignore','pipe','pipe'],windowsHide:true});
  let failure='';server.stderr.on('data',chunk=>{failure+=String(chunk).slice(-2000);});server.stdout.resume();
  let ready=false;for(let i=0;i<120;i++){if(server.exitCode!==null)throw Error('Verification server exited');try{const r=await fetch(env.PASSWORD_TEST_URL+'/api/account',{headers:{...healthHeaders({mode:'password',host:'town-password.test'}),'x-real-ip':'127.0.0.4'}});const info=await r.json();if(r.ok&&info.password){ready=true;break;}}catch{}await delay(500);}
  if(!ready)throw Error('Local verification server not ready (server diagnostics retained in process only)');
  await run(['tests/password.integration.mjs']);
  await run(['tests/registration.integration.mjs']);
  await run(['tests/invitations.integration.mjs']);
  if(env.TOWN_ACADEMY_CHECK==='1')await run(['tests/academy.integration.mjs']);
  if(env.TOWN_CROSS_SCENE_CHECK==='1')await run(['tests/scenes.integration.mjs']);
  if(env.TOWN_PLAYWRIGHT_MODULE)await run([env.TOWN_WINDOWS_BROWSER==='1'?'tests/scene-windows.browser.mjs':env.TOWN_INVITATION_BROWSER==='1'?'tests/invitations.browser.mjs':env.TOWN_CAMPUS_BROWSER==='1'?'tests/academy-campus.browser.mjs':env.TOWN_ACADEMY_MANAGER_BROWSER==='1'?'tests/academy-manager.browser.mjs':env.TOWN_ACADEMY_BROWSER==='1'?'tests/academy.browser.mjs':env.TOWN_CROSS_SCENE_BROWSER==='1'?'tests/scenes.browser.mjs':env.TOWN_SCENE_CHECK==='1'?'tests/town-expanded.browser.mjs':'tests/browser-local.mjs']);
  if(env.TOWN_PLAYWRIGHT_MODULE&&env.TOWN_WINDOWS_BROWSER==='1')await run(['tests/hall-windows.browser.mjs']);
  if(env.TOWN_PLAYWRIGHT_MODULE&&env.TOWN_WINDOWS_BROWSER==='1'&&env.TOWN_INVITATION_BROWSER==='1')await run(['tests/invitations.browser.mjs']);
  console.log('PASS: disposable password and registration verification; real resident database unchanged');
}finally{
  if(server&&server.exitCode===null){const ended=once(server,'exit');server.kill();await ended;}
  if(created)await owner.query(`DROP DATABASE ${name} WITH (FORCE)`);
  await owner.end();
}
