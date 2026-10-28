// Disposable database/role on the existing local test cluster only. Never reads DATABASE_URL.
import {readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import pg from 'pg';
const settings=JSON.parse(readFileSync('.local/database.json','utf8'));
const name='town_permission_'+randomBytes(6).toString('hex'),password=randomBytes(24).toString('hex');
const admin=new pg.Client({host:'127.0.0.1',port:55460,database:'postgres',user:'town_local_owner',password:settings.adminPassword,connectionTimeoutMillis:4000});
let role=false,db=false;
const databaseUrl=`postgresql://${name}:${password}@127.0.0.1:55460/${name}?sslmode=disable`;
function command(action,extra={}){
  const result=spawnSync(process.execPath,['scripts/deploy/database.mjs',action],{input:JSON.stringify({databaseUrl,...extra}),encoding:'utf8',windowsHide:true});
  for(const secret of [password,settings.adminPassword,databaseUrl])assert.ok(!(result.stdout+result.stderr).includes(secret));
  return result.status;
}
try{
  await admin.connect();
  const sql=await admin.query("SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', $1::text,$2::text) AS statement",[name,password]);
  await admin.query(sql.rows[0].statement);role=true;
  await admin.query(`CREATE DATABASE ${name}`);db=true;
  assert.equal(command('check'),42);
  assert.equal(command('grant-schema',{adminUser:'town_local_owner',adminPassword:'wrong-password'}),1);
  assert.equal(command('check'),42);
  assert.equal(command('grant-schema',{adminUser:'town_local_owner',adminPassword:settings.adminPassword}),0);
  assert.equal(command('check'),0);
  // Idempotent grant, no privilege escalation beyond the requested schema.
  assert.equal(command('grant-schema',{adminUser:'town_local_owner',adminPassword:settings.adminPassword}),0);
  const r=await admin.query('SELECT rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=$1',[name]);
  assert.deepEqual(r.rows[0],{rolsuper:false,rolcreatedb:false,rolcreaterole:false});
  console.log('PASS: missing permission, wrong admin password, grant, application recheck, idempotence, least privilege and credential redaction');
}finally{
  if(db)await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
  if(role)await admin.query(`DROP ROLE ${name}`);
  await admin.end();
}
