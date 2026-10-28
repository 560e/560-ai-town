import {existsSync,mkdirSync,readFileSync,writeFileSync,unlinkSync,openSync,closeSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {Pool} from 'pg';
import {root} from './account-env.mjs';
import {ensureManagementEntries} from './management-entry.mjs';

const local=join(root,'.local'),cluster=join(local,'postgres'),settingsFile=join(local,'database.json');
const port=55460;
function pg(name){
  const suffix=process.platform==='win32'?'.exe':'';
  const bins=[process.env.PG_BIN,process.platform==='win32'?'C:/Program Files/PostgreSQL/17/bin':null,...[18,17,16,15].map(v=>`/usr/lib/postgresql/${v}/bin`)].filter(Boolean);
  return bins.map(dir=>join(dir,name+suffix)).find(path=>existsSync(path))||name;
}
function run(executable,args){
  // PostgreSQL background children must not inherit a pipe that keeps spawnSync waiting on Windows.
  const logPath=join(local,'setup.log'),fd=openSync(logPath,'a');
  let result;try{result=spawnSync(executable,args,{cwd:root,stdio:['ignore',fd,fd],windowsHide:true});}finally{closeSync(fd);}
  if(result.status!==0)throw new Error(`${executable} 执行失败，请检查 .local/setup.log：${result.error?.message||result.status}`);
  return '数据库操作完成';
}
const action=process.argv[2]||'start';
if(!['start','stop','status'].includes(action))throw new Error('只支持 start / stop / status');
if(action==='stop'||action==='status'){
  if(!existsSync(cluster))throw new Error('尚未初始化小镇本地数据库');
  console.log(run(pg('pg_ctl'),['-D',cluster,...(action==='stop'?['stop','-m','fast']:['status'])]));
}else{
  mkdirSync(local,{recursive:true});
  if(existsSync('.env.local')&&!existsSync(settingsFile)){
    console.log('检测到已有 .env.local，不覆盖配置；请自行启动 DATABASE_URL 指向的数据库。');
  }else{
    let settings;
    if(existsSync(settingsFile))settings=JSON.parse(readFileSync(settingsFile,'utf8'));
    else{settings={adminPassword:randomBytes(24).toString('hex'),appPassword:randomBytes(24).toString('hex')};writeFileSync(settingsFile,JSON.stringify(settings),{mode:0o600});}
    if(!existsSync(join(cluster,'PG_VERSION'))){
      const passwordFile=join(local,'init-password');writeFileSync(passwordFile,settings.adminPassword,{mode:0o600});
      try{run(pg('initdb'),['-D',cluster,'-U','town_local_owner','-A','scram-sha-256','--encoding=UTF8','--locale=C',`--pwfile=${passwordFile}`]);}finally{unlinkSync(passwordFile);}
    }
    const status=spawnSync(pg('pg_ctl'),['-D',cluster,'status'],{encoding:'utf8',windowsHide:true});
    if(status.status!==0)run(pg('pg_ctl'),['-D',cluster,'-l',join(local,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port}`,'start','-w']);
    const owner=new Pool({host:'127.0.0.1',port,database:'postgres',user:'town_local_owner',password:settings.adminPassword});
    try{
      const role=await owner.query("SELECT 1 FROM pg_roles WHERE rolname='town_app'");
      // Password is generated hexadecimal text, never user-supplied SQL.
      if(!role.rowCount)await owner.query(`CREATE ROLE town_app LOGIN PASSWORD '${settings.appPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE`);
      const db=await owner.query("SELECT 1 FROM pg_database WHERE datname='town_local'");
      if(!db.rowCount)await owner.query('CREATE DATABASE town_local OWNER town_app');
    }finally{await owner.end();}
    if(!existsSync('.env.local'))writeFileSync('.env.local',`# 本地开发专用。勿用于生产，也勿提交版本控制。\nDATABASE_URL=postgresql://town_app:${settings.appPassword}@127.0.0.1:${port}/town_local\nBETTER_AUTH_SECRET=${randomBytes(48).toString('hex')}\nBETTER_AUTH_URL=http://localhost:3000\nTOWN_LOCAL_AUTH=1\nTOWN_PASSWORD_AUTH=1\n`,{mode:0o600});
    ensureManagementEntries(root);
    console.log(`小镇本地 PostgreSQL 已启动（仅本机，端口 ${port}）；账户配置已保存到 .env.local。`);
  }
}
