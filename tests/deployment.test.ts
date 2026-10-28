import test from 'node:test';
import assert from 'node:assert/strict';
import {dbUrl,newConfig,migratedConfig,envText,testEnvironment,unitText,nginxText,port,hostName,databaseName,accountHealthy,appDirectory,townSystemUserPlan} from '../scripts/deploy/config.mjs';
import {permitted} from '../scripts/package-release.mjs';
import {createServer} from 'node:net';
import {choosePort,freePort,recheckPort} from '../scripts/deploy/ports.mjs';
import {attachRuntimeState} from '../scripts/deploy/release-state.mjs';

test('occupied TCP port prompts again, keeps the other service alive and releases probe sockets',async()=>{
  const occupied=createServer(),spare=createServer();
  await new Promise<void>(ok=>occupied.listen(0,'127.0.0.1',ok));
  await new Promise<void>(ok=>spare.listen(0,'127.0.0.1',ok));
  const used=(occupied.address() as {port:number}).port,available=(spare.address() as {port:number}).port;
  await new Promise<void>(ok=>spare.close(()=>ok()));
  try{
    const answers=[String(used),String(available)],messages:string[]=[],defaults:string[]=[];
    const selected=await choosePort({initial:used,prompt:async(value:string)=>{defaults.push(value);return answers.shift()!;},notify:(message:string)=>messages.push(message)});
    assert.equal(selected,available);assert.equal(defaults.length,2);assert.equal(messages.length,1);assert.ok(occupied.listening);
    await freePort(available);
    assert.equal(await recheckPort({current:used,prompt:async()=>String(available),notify:()=>{}}),available);
    assert.equal(await recheckPort({current:available,prompt:async()=>{throw Error('must not prompt for free port');}}),available);
    const c=newConfig({projectRoot:'/srv/town',mode:'test',appPort:selected,databaseUrl:'postgresql://example'});
    assert.ok(envText(c).includes(`http://localhost:${selected}`));assert.ok(unitText(c).includes(`--port ${selected}`));
    assert.ok(nginxText({...c,mode:'preview',host:'test.560e.com'}).includes(`127.0.0.1:${selected}`));
  }finally{await new Promise<void>(ok=>occupied.close(()=>ok()));}
});
test('port detection does not misreport permissions or other socket failures as occupied ports',async()=>{
  const error=Object.assign(new Error('permission failure'),{code:'EACCES'});
  await assert.rejects(choosePort({prompt:async()=>'3000',check:async()=>{throw error;},notify:()=>{throw Error('must not reprompt');}}),error);
});

test('deployment encodes password punctuation without dotenv, URI or shell interpretation',()=>{
  const password='A #$`"\\: /@?&=%中文123';
  const connection=dbUrl({host:'db.example.com',dbPort:5432,name:'town560',user:'town560',password,ssl:'verify-full'});
  const parsed=new URL(connection);assert.equal(decodeURIComponent(parsed.password),password);assert.equal(parsed.searchParams.get('sslmode'),'verify-full');
  assert.equal(connection.includes('#'),false);assert.equal(connection.includes('`'),false);assert.equal(connection.includes(' '),false);
});
test('Baota binding uses the requested directory without opening local account authentication',()=>{
  const target='/www/wwwroot/opc.560e.com/560-ai-town-v0.0.1';
  const c={...newConfig({projectRoot:'/srv/town',mode:'test',appPort:56043,databaseUrl:'postgresql://example'}),appDirectory:target,previewHost:'opc.560e.com'};
  assert.equal(appDirectory(target),target);
  assert.ok(unitText(c).includes(`WorkingDirectory=/srv/town/.deployment/current\n`));
  assert.ok(unitText(c).includes('Environment=TOWN_DEV_ORIGINS=opc.560e.com\n'));
  assert.ok(unitText(c).includes('--hostname 127.0.0.1 --port 56043'));
  assert.ok(envText(c).includes('BETTER_AUTH_URL=http://localhost:56043'));
  for(const path of ['/www/wwwroot','/www/wwwroot/a/..','/www/wwwroot/a/../b','/etc/systemd/system/x','/www/wwwroot/a/x\nEnvironment=BAD','/www/wwwroot/a/a b'])assert.throws(()=>appDirectory(path));
});
test('test deployments remain loopback-only, have separate random secrets and disable fixed OTP',()=>{
  const c=newConfig({projectRoot:'/srv/town',mode:'test',appPort:3300,databaseUrl:'postgresql://example'}),other=newConfig({projectRoot:'/srv/town',mode:'test',appPort:3300,databaseUrl:'postgresql://example'});
  assert.notEqual(c.secret,other.secret);assert.notEqual(c.manage,c.system);
  assert.match(envText(c),/BETTER_AUTH_URL=http:\/\/localhost:3300/);assert.match(envText(c),/TOWN_LOCAL_TEST_RESIDENT=0/);
  assert.match(unitText(c),/NODE_ENV=development/);assert.match(unitText(c),/--hostname 127\.0\.0\.1 --port 3300/);
  assert.throws(()=>nginxText(c));assert.ok(accountHealthy('test',{enabled:true,local:true}));assert.equal(accountHealthy('test',{enabled:false,local:false}),false);
});
test('visitor production proxy keeps actual origin headers and disables local login',()=>{
  const c=newConfig({projectRoot:'/srv/town',mode:'preview',host:'test.560e.com',appPort:3301,databaseUrl:'postgresql://example'});
  assert.match(unitText(c),/NODE_ENV=production/);assert.match(envText(c),/TOWN_LOCAL_AUTH=0/);
  assert.match(nginxText(c),/server_name test\.560e\.com;/);assert.match(nginxText(c),/X-Forwarded-For \$proxy_add_x_forwarded_for/);
  assert.ok(accountHealthy('preview',{enabled:false,local:false}));assert.equal(accountHealthy('preview',{enabled:true,local:true}),false);
});
test('deployment rejects unsafe identifiers, hosts and out-of-range ports',()=>{
  for(const value of ['80','65536','3000;id','-1','abc'])assert.throws(()=>port(value));
  for(const value of ['x;id','$(id)','a\nb','https://560e.com','example.com/evil'])assert.throws(()=>hostName(value));
  for(const value of ['x;drop','a b','../a',"a'b"])assert.throws(()=>databaseName(value));
});
test('release allowlist excludes credentials, database, artifacts and temporary QA commands',()=>{
  for(const path of ['.env.local','.env.production','.local/db/data','node_modules/a','artifacts/shot.png','tests/.chat-visual-command.json','scripts/private.dump','docs/.private/password','dev.log'])assert.equal(permitted(path),false,path);
  for(const path of ['.env.example','app/layout.tsx','public/sky.png','scripts/deploy/wizard.mjs','tests/deployment.test.ts','deploy-debian.sh'])assert.equal(permitted(path),true,path);
});

test('service description follows the released package version',async()=>{
 const {readFileSync}=await import('node:fs');
 const version=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
 const c=newConfig({projectRoot:'/srv/town',mode:'password',appPort:56043,host:'town.test',databaseUrl:'postgresql://example'});
 assert.ok(unitText(c).includes(`Description=560 AI Town V${version} (password)`));
});

test('fresh installation safely rehomes only a legacy dedicated town account',()=>{
  assert.equal(townSystemUserPlan('town560:x:998:998::/opt/560-town/shared:/usr/sbin/nologin','/www/wwwroot/opc.560e.com/560-ai-town/.deployment/shared'),'rehome');
  assert.equal(townSystemUserPlan('town560:x:998:998::/www/wwwroot/opc.560e.com/560-ai-town/.deployment/shared:/usr/sbin/nologin','/www/wwwroot/opc.560e.com/560-ai-town/.deployment/shared'),'reuse');
  assert.equal(townSystemUserPlan('town560:x:0:0::/root:/bin/bash','/www/wwwroot/opc.560e.com/560-ai-town/.deployment/shared'),'reject');
});
test('candidate regression tests use a clean non-production environment',()=>{
  assert.deepEqual(testEnvironment(),{NODE_ENV:'test',NEXT_TELEMETRY_DISABLED:'1'});
});
test('installer always reads the BaoTa menu from its controlling terminal',async()=>{
  const {readFileSync}=await import('node:fs');
  const script=readFileSync(new URL('../deploy-linux.sh',import.meta.url),'utf8');
  assert.match(script,/: <\/dev\/tty/);
  assert.match(script,/exec 0<\/dev\/tty 1>\/dev\/tty 2>\/dev\/tty/);
  assert.match(script,/未读取到菜单选择，部署向导未启动/);
  assert.match(script,/sudo bash deploy-linux\.sh --check/);
  assert.ok(script.indexOf('exec 0</dev/tty 1>/dev/tty 2>/dev/tty')<script.indexOf('source "$TASK_SOURCE/scripts/deploy/paths.sh"'));
  assert.doesNotMatch(script,/WorkingDirectory=.*\| head -n1/);
  assert.match(script,/\/etc\/systemd\/system\/560-town\.service 2>\/dev\/null \|\| true/);
});
test('root migration retains deployment identity while rebinding only its root',()=>{
  const old=newConfig({projectRoot:'/www/wwwroot/opc.560e.com/560-ai-town-v0.0.1',mode:'password',host:'opc.560e.com',appPort:56043,databaseUrl:'postgresql://town'});
  const moved=migratedConfig(old,'/www/wwwroot/opc.560e.com/560-ai-town');
  assert.equal(moved.projectRoot,'/www/wwwroot/opc.560e.com/560-ai-town');
  assert.equal(moved.databaseUrl,old.databaseUrl);assert.equal(moved.secret,old.secret);assert.equal(moved.manage,old.manage);assert.equal(moved.system,old.system);
  assert.throws(()=>migratedConfig({...old,format:1},'/www/wwwroot/opc.560e.com/560-ai-town'));
});

test('candidate only receives shared local state after its build boundary',()=>{
  const linked:string[][]=[];
  attachRuntimeState({release:'/candidate',shared:'/shared',link:(target,path)=>{linked.push([String(target),String(path)]);}});
  assert.deepEqual(linked,[['/shared/.env.local','/candidate/.env.local'],['/shared/local','/candidate/.local']]);
});
