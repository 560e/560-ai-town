import {existsSync,realpathSync,readdirSync,readFileSync,statSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {grantSchemaAccess} from './permissions.mjs';
import {ask} from './prompt.mjs';
import {healthRequest} from './health.mjs';
import {healthHeaders,accountHealthy,port} from './config.mjs';

/** @param {{realpathSync:(path:string)=>string,statSync:(path:string)=>{isFile:()=>boolean}}} fs */
export function validRelease(base,candidate,fs={realpathSync,statSync}) {
  try {
    const releases=fs.realpathSync(join(base,'releases')),target=fs.realpathSync(candidate);
    return target.startsWith(releases+sep)&&
      fs.statSync(join(target,'.next/BUILD_ID')).isFile()&&
      fs.statSync(join(target,'node_modules/next/dist/bin/next')).isFile()&&
      fs.realpathSync(join(target,'.env.local'))===fs.realpathSync(join(base,'shared/.env.local'));
  }catch{return false;}
}
async function main(){
  const [action,base,candidate]=process.argv.slice(2);
  if(action==='valid'){if(!validRelease(base,candidate))throw Error('运行目录缺少构建、依赖或对应配置，拒绝恢复');return;}
  if(action==='list'){
    if(existsSync(join(base,'releases')))for(const name of readdirSync(join(base,'releases')).sort().reverse()){
      if(validRelease(base,join(base,'releases',name)))console.log(name);
    }return;
  }
  const c=JSON.parse(readFileSync(join(base,'shared/deploy.json'),'utf8'));
  if(c.format!==2||resolve(c.projectRoot,'.deployment')!==resolve(base)||!['test','password','preview'].includes(c.mode))throw Error('部署配置与项目目录不匹配');
  port(c.port);
  if(action==='config'){console.log(`部署模式 ${c.mode}；内部端口 ${c.port}`);return;}
  if(action==='database'||action==='database-repair'){
    const release=realpathSync(join(base,'current'));
    if(!validRelease(base,release))throw Error('当前运行版本不完整');
    const pg=createRequire(join(release,'package.json'))('pg');
    const client=new pg.Client({connectionString:c.databaseUrl,connectionTimeoutMillis:8000});
    let writable=false;
    try{
      await client.connect();
      const r=await client.query("SELECT current_setting('server_version_num')::int AS version, has_schema_privilege(current_user,'public','USAGE') AND has_schema_privilege(current_user,'public','CREATE') AS writable");
      if(r.rows[0].version<150000)throw Error('version');
      writable=r.rows[0].writable;
    }catch{throw Error('数据库连接/版本检查失败，请核对保存的数据库连接；不会输出密码。');}
    finally{await client.end();}
    if(writable){console.log('数据库连接、版本和public权限检查通过。');return;}
    if(action!=='database-repair')throw Error('数据库缺少public的USAGE/CREATE，请运行 --repair');
    if(await ask('只授予public的USAGE/CREATE，是否输入数据库管理员凭证授权？yes/no','no')!=='yes')throw Error('已取消授权');
    const adminUser=await ask('PostgreSQL管理员用户名','postgres');
    let adminPassword=await ask('数据库管理员密码（隐藏，不保存）','',v=>{if(!v)throw Error('密码不能为空');return v;},{secret:true});
    try{await grantSchemaAccess({databaseUrl:c.databaseUrl,adminUser,adminPassword},o=>new pg.Client(o));}
    catch{throw Error('数据库授权失败，请核对管理员账号及密码。');}
    finally{adminPassword='';}
    // Verify the grant with the original application's login, not the administrator.
    const check=new pg.Client({connectionString:c.databaseUrl,connectionTimeoutMillis:8000});
    try{await check.connect();const r=await check.query("SELECT has_schema_privilege(current_user,'public','USAGE') AND has_schema_privilege(current_user,'public','CREATE') AS ok");if(!r.rows[0].ok)throw Error('missing');}
    catch{throw Error('授权后应用账号复查失败');}finally{await check.end();}
    console.log('数据库权限修复并复查通过。');return;
  }
  if(action!=='health')throw Error('未知检查操作');
  for(const path of ['/','/api/account']){
    const r=await healthRequest(`http://127.0.0.1:${c.port}${path}`,{headers:healthHeaders(c)});
    console.log(`${path} HTTP ${r.status}`);
    if(!r.ok)throw Error('HTTP检查未通过');
    if(path==='/api/account'&&!accountHealthy(c.mode,await r.json()))throw Error('账号模式不匹配');
  }
  console.log('本机健康检查通过；公网HTTPS及真实注册需另外验收。');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{
  // Do not print JSON/URL/credentials or raw database errors.
  console.error('检查未通过：',e instanceof SyntaxError?'配置格式错误':(e.code||e.message));process.exitCode=1;
});
