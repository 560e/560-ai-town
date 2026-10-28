import test from 'node:test';
import assert from 'node:assert/strict';
import {permissionExitCode, ensureDatabasePermissions, grantSchemaAccess,canReuseRole} from '../scripts/deploy/permissions.mjs';

test('reinstallation role reuse requires explicit consent and rejects privileged or incomplete role metadata',()=>{
  const role={rolcanlogin:true,rolsuper:false,rolcreatedb:false,rolcreaterole:false,rolreplication:false,rolbypassrls:false};
  assert.equal(canReuseRole(role,true),true);assert.equal(canReuseRole(role,false),false);
  for(const key of ['rolsuper','rolcreatedb','rolcreaterole','rolreplication','rolbypassrls'])assert.equal(canReuseRole({...role,[key]:true},true),false);
  assert.equal(canReuseRole({},true),false);
});

test('permission repair runs only for missing schema privileges and rechecks application credentials',async()=>{
  const events:string[]=[];let checks=0;
  await ensureDatabasePermissions({check:async()=>{events.push('check');if(!checks++)throw Object.assign(Error('permission'),{exitCode:permissionExitCode});},repair:async()=>{events.push('repair');}});
  assert.deepEqual(events,['check','repair','check']);
  await assert.rejects(ensureDatabasePermissions({check:async()=>{throw Object.assign(Error('connection failed'),{exitCode:1});},repair:async()=>{throw Error('must not repair');}}),/connection failed/);
  await assert.rejects(ensureDatabasePermissions({check:async()=>{throw Object.assign(Error('still missing'),{exitCode:permissionExitCode});},repair:async()=>{}}),/still missing/);
});

test('grant connects to exact configured database and TLS using transient administrator credentials',async()=>{
  const queries:{sql:string;values?:unknown[]}[]=[];let config:any;let closed=false;
  const c={databaseUrl:'postgresql://app:p%40ss@127.0.0.1:55460/original?sslmode=disable',adminUser:'db_owner',adminPassword:'secret-admin'};
  await grantSchemaAccess(c,(options:any)=>{config=options;return {
    connect:async()=>{},end:async()=>{closed=true;},query:async(sql:string,values?:unknown[])=>{queries.push({sql,values});return {rows:[{statement:'GRANT USAGE, CREATE ON SCHEMA public TO app'}]};},
  };});
  const url=new URL(config.connectionString);
  assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55460');assert.equal(url.pathname,'/original');assert.equal(url.search,'?sslmode=disable');
  assert.equal(decodeURIComponent(url.username),'db_owner');assert.equal(decodeURIComponent(url.password),'secret-admin');
  assert.deepEqual(queries[0].values,['app']);assert.match(queries[0].sql,/%I/);
  assert.equal(queries[1].sql,'GRANT USAGE, CREATE ON SCHEMA public TO app');assert.equal(closed,true);
  assert.equal(new URL(c.databaseUrl).username,'app');
});

test('administrator connection is closed on failure',async()=>{
  let closed=false;
  await assert.rejects(grantSchemaAccess({databaseUrl:'postgresql://app:pass@localhost/db',adminUser:'postgres',adminPassword:'secret'},()=>({connect:async()=>{throw Error('denied');},end:async()=>{closed=true;},query:async()=>({rows:[]})})),/denied/);
  assert.equal(closed,true);
});
