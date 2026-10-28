// Runs after npm ci, with configuration through stdin, never password arguments.
import pg from 'pg';
import {spawnSync} from 'node:child_process';
import {permissionExitCode,grantSchemaAccess,canReuseRole} from './permissions.mjs';
let input='';for await(const chunk of process.stdin)input+=chunk;
const c=JSON.parse(input),action=process.argv[2];
let client;
try {
  if(action==='create') {
    client=new pg.Client({host:'/var/run/postgresql',user:'postgres',database:'postgres'});await client.connect();
    const db=await client.query('SELECT 1 FROM pg_database WHERE datname=$1',[c.name]);
    if(db.rowCount)throw new Error('数据库已存在；请选择连接已有数据库，不会覆盖数据。');
    const role=await client.query('SELECT rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=$1',[c.user]);
    if(role.rowCount){
      const r=role.rows[0];
      if(!canReuseRole(r,c.reuseRole))throw new Error('数据库账号已存在且未批准复用，或账号有管理权限。请使用新的普通账号，或连接已有数据库。');
    }
    const sql=await client.query("SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L', $1::text, $2::text) AS role, format('CREATE DATABASE %I OWNER %I', $3::text, $1::text) AS db",[c.user,c.password,c.name]);
    if(!role.rowCount)await client.query(sql.rows[0].role);
    await client.query(sql.rows[0].db);
  } else if(action==='check') {
    client=new pg.Client({connectionString:c.databaseUrl,connectionTimeoutMillis:8000});await client.connect();
    const result=await client.query("SELECT current_setting('server_version_num')::int AS version, has_schema_privilege(current_user,'public','CREATE') AND has_schema_privilege(current_user,'public','USAGE') AS writable");
    if(result.rows[0].version<150000)throw new Error(`需要 PostgreSQL 15+，当前服务端版本号为 ${result.rows[0].version}。`);
    if(!result.rows[0].writable)throw Object.assign(new Error('数据库连接成功，但应用账号缺少 public schema 的 USAGE 或 CREATE 权限。'),{exitCode:permissionExitCode});
    await client.query('BEGIN');await client.query('CREATE TABLE public.town_deploy_permission_probe(id integer)');await client.query('ROLLBACK');
  } else if(action==='grant-schema') {
    await grantSchemaAccess(c,options=>new pg.Client(options));
  } else if(action==='backup') {
    const u=new URL(c.databaseUrl);
    const result=spawnSync('pg_dump',['--format=custom','--no-owner','--file',c.file],{env:{...process.env,PGHOST:u.hostname,PGPORT:u.port||'5432',PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password),PGDATABASE:decodeURIComponent(u.pathname.slice(1)),PGSSLMODE:u.searchParams.get('sslmode')||'disable'},encoding:'utf8'});
    if(result.status!==0)throw new Error('数据库备份失败；请检查连接及 pg_dump 主版本是否不低于数据库版本。');
  } else throw new Error('未知数据库操作。');
  console.log(`数据库 ${action} 完成。`);
} catch(error) {
  // PostgreSQL errors may contain connection details or SQL; never print them.
  console.error(error.message?.startsWith('数据库')||error.message?.startsWith('需要 PostgreSQL')?error.message:'数据库操作失败；请检查服务、账号权限、密码、端口及 TLS 配置。未输出连接串或密码。');
  process.exitCode=error.exitCode===permissionExitCode?permissionExitCode:1;
} finally {if(client)await client.end();}
