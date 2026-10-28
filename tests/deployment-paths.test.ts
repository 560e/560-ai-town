import test from 'node:test';
import assert from 'node:assert/strict';
import {newConfig,unitText,envText} from '../scripts/deploy/config.mjs';
import * as config from '../scripts/deploy/config.mjs';

test('project root determines every service runtime path and cannot be injected',()=>{
  for(const projectRoot of ['/srv/town','/www/wwwroot/example.org/app']){
    const c=newConfig({mode:'password',appPort:56043,host:'example.org',databaseUrl:'postgresql://example',projectRoot});
    assert.equal(c.projectRoot,projectRoot);
    const unit=unitText(c);
    assert.ok(unit.includes(`WorkingDirectory=${projectRoot}/.deployment/current\n`));
    assert.ok(unit.includes(`ExecStart=${projectRoot}/.deployment/runtime/bin/node `));
    assert.ok(unit.includes(`Environment=HOME=${projectRoot}/.deployment/shared\n`));
    assert.ok(!unit.includes('/opt/560-town'));
    assert.match(envText(c),/BETTER_AUTH_URL=https:\/\/example.org/);
  }
  for(const projectRoot of ['/','relative','/srv/a b','/srv/a/../b','/srv/a\nExecStart=bad','/srv/a%h','/srv/a/.deployment/current']){
    assert.throws(()=>newConfig({mode:'test',appPort:3300,databaseUrl:'x',projectRoot}));
  }
});

test('supported Linux distributions and architectures are explicit',()=>{
  assert.equal(typeof config.linuxPlatform,'function');
  for(const [id,version] of [['debian','12'],['debian','13'],['ubuntu','22.04'],['ubuntu','24.04']]){
    assert.equal(config.linuxPlatform(id,version,'x86_64'),'x64');
    assert.equal(config.linuxPlatform(id,version,'aarch64'),'arm64');
  }
  for(const args of [['debian','11','x86_64'],['ubuntu','25.04','x86_64'],['fedora','42','x86_64'],['debian','12','i686']])assert.throws(()=>config.linuxPlatform(...args));
});

import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
const bash=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash';
const pathsScript=resolve('scripts/deploy/paths.sh').replaceAll('\\','/');
test('shell path resolver follows release/current to the existing root and rejects unknown candidate roots',()=>{
  assert.ok(existsSync(pathsScript),'shared shell path resolver exists');
  const result=spawnSync(bash,['-c',`set -eu
source "$1"
task_tmp=$(mktemp -d)
trap 'rm -rf "$task_tmp"' EXIT
mkdir -p "$task_tmp/site/.deployment/releases/v1" "$task_tmp/site/.deployment/shared" "$task_tmp/candidate"
printf '{}' > "$task_tmp/site/.deployment/shared/deploy.json"
[[ $(town_project_root "$task_tmp/site/.deployment/releases/v1") == "$task_tmp/site" ]]
[[ $(town_project_root "$task_tmp/candidate") == "$task_tmp/candidate" ]]
if town_project_root "$task_tmp/candidate" "$task_tmp/missing"; then exit 8; fi
mkdir -p "$task_tmp/site/.deployment/shared"
printf '{}' > "$task_tmp/site/.deployment/shared/deploy.json"
[[ $(town_project_root "$task_tmp/candidate" "$task_tmp/site") == "$task_tmp/site" ]]
`, 'test',pathsScript],{encoding:'utf8'});
  assert.equal(result.status,0,result.stdout+result.stderr);
});

test('legacy adoption preserves credentials and mode while rebinding all runtime paths',()=>{
  assert.equal(typeof config.adoptLegacyConfig,'function');
  const legacy={format:1,mode:'test',port:56043,host:'localhost',databaseUrl:'postgresql://secret',secret:'keep',manage:'manage-keep',system:'system-keep',appDirectory:'/www/wwwroot/example.org/old',previewHost:'example.org'};
  const adopted=config.adoptLegacyConfig(legacy,'/srv/town');
  assert.equal(adopted.format,2);assert.equal(adopted.projectRoot,'/srv/town');
  for(const key of ['databaseUrl','secret','manage','system','mode','port','previewHost'] as const)assert.equal(adopted[key],legacy[key]);
  assert.equal(adopted.appDirectory,undefined);
  assert.match(unitText(adopted),/WorkingDirectory=\/srv\/town\/\.deployment\/current/);
  assert.throws(()=>config.adoptLegacyConfig(adopted,'/srv/other'));
});

test('reverse proxy binds saved port and protects private deployment paths',()=>{
  assert.equal(typeof config.proxyLocationText,'function');
  const c=newConfig({projectRoot:'/srv/town',mode:'password',appPort:48123,host:'town.example',databaseUrl:'x'});
  const text=config.proxyLocationText(c);
  assert.match(text,/proxy_pass http:\/\/127\.0\.0\.1:48123;/);
  assert.match(text,/X-Forwarded-Proto \$scheme/);
  assert.match(text,/location ~ \(\^\|\/\)\\\. \{ return 404; \}/);
  assert.ok(!text.includes('location ^~ /'));
});

import * as provisioning from '../scripts/deploy/config.mjs';
test('failed new database provisioning remains retryable without treating partial objects as safe to overwrite',async()=>{
  assert.equal(typeof provisioning.finishLocalProvision,'function');
  const c={pendingLocalDatabase:true};let creates=0,saves=0,ready=false;
  const io={check:async()=>{if(!ready)throw Error('not ready');},create:async()=>{creates++;if(creates===1)throw Error('server unavailable');ready=true;},save:async()=>{saves++;}};
  await assert.rejects(provisioning.finishLocalProvision(c,io),/server unavailable/);
  assert.equal(c.pendingLocalDatabase,true);assert.equal(saves,0);
  await provisioning.finishLocalProvision(c,io);
  assert.equal(creates,2);assert.equal(c.pendingLocalDatabase,false);assert.equal(saves,2);
  const partial={pendingLocalDatabase:true};
  await assert.rejects(provisioning.finishLocalProvision(partial,{check:async()=>{throw Error('cannot authenticate');},create:async()=>{throw Error('existing objects refused');},save:async()=>{throw Error('must not save success');}}),/existing objects refused/);
  assert.equal(partial.pendingLocalDatabase,true);
});
test('retry recognizes a successfully created database and does not create it again',async()=>{
  assert.equal(typeof provisioning.finishLocalProvision,'function');
  const c={pendingLocalDatabase:true,localDatabaseCreated:true};let saves=0;
  await provisioning.finishLocalProvision(c,{check:async()=>{},create:async()=>{throw Error('must not create again');},save:async()=>{saves++;}});
  assert.equal(c.pendingLocalDatabase,false);assert.equal(saves,1);
});
