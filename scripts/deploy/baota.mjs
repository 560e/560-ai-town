import {healthRequest} from './health.mjs';
// Explicit legacy-layout adoption. Never called automatically by install/upgrade.
// Retains the old runtime, releases, configuration, uploads and system registration backup.
import {readFileSync,writeFileSync,existsSync,realpathSync,mkdirSync,renameSync,symlinkSync,unlinkSync,lstatSync,cpSync,chmodSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createInterface} from 'node:readline/promises';
import {deploymentPaths,projectDirectory,adoptLegacyConfig,unitText,healthHeaders,accountHealthy} from './config.mjs';
const source=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const legacy='/opt/560-town',legacyRuntime='/opt/560-town-runtime';
const unit='/etc/systemd/system/560-town.service';
let paths,c,old,oldUnit,oldHome,backup,stopped=false,switched=false;
const env={...process.env};
for(const key of ['DATABASE_URL','BETTER_AUTH_SECRET','BETTER_AUTH_URL','NODE_ENV','TOWN_PASSWORD_AUTH','TOWN_TRUST_PROXY'])delete env[key];
function run(bin,args,options={}){const r=spawnSync(bin,args,{env,stdio:'inherit',...options});if(r.status!==0)throw new Error(`${bin} 执行失败 (${r.status})`);}
try{
  if(process.platform!=='linux'||process.getuid()!==0||!process.stdin.isTTY)throw new Error('请在 Linux root 交互终端执行；本工具不自动运行。');
  if(process.argv.length!==3)throw new Error('用法：sudo bash migrate-baota.sh 目标项目根（不限宝塔）；须交互确认。');
  const target=projectDirectory(process.argv[2]);
  if(realpathSync(target)!==target||lstatSync(target).isSymbolicLink())throw new Error('目标项目必须存在且不经过符号链接。');
  if(JSON.parse(readFileSync(join(target,'package.json'))).name!=='560-ai-coastal-town')throw new Error('目标必须是本项目源码根。');
  paths=deploymentPaths(target);
  if(existsSync(paths.base))throw new Error('目标 .deployment 已存在，拒绝覆盖。上次失败内容须先人工检查并保留。');
  const oldConfig=readFileSync(`${legacy}/shared/deploy.json`);
  const original=JSON.parse(oldConfig);c=adoptLegacyConfig(original,target);
  old=realpathSync(`${legacy}/current`);oldUnit=readFileSync(unit);
  if(!(old.startsWith(`${legacy}/releases/`)||old===original.appDirectory))throw new Error('旧 current 不属于已知部署。');
  if(!oldUnit.toString().includes(`WorkingDirectory=${original.appDirectory||legacy+'/current'}\n`))throw new Error('旧服务与部署配置不一致。');
  oldHome=readFileSync('/etc/passwd','utf8').split('\n').find(line=>line.startsWith('town560:'))?.split(':')[5];
  if(oldHome!==`${legacy}/shared`)throw new Error('town560 用户 home 与旧部署不一致。');
  if(JSON.parse(readFileSync(join(old,'package.json'))).version!==JSON.parse(readFileSync(join(source,'package.json'))).version)throw new Error('迁移工具与当前服务版本不一致。');
  run('runuser',['-u','town560','--','test','-x',target]);
  console.log(`将把旧运行时、配置、素材、备份和当前版本复制到 ${paths.base}。端口与认证模式保留；数据库实例不搬动，不执行结构迁移。旧目录全部保留，不要自行删除。`);
  const rl=createInterface({input:process.stdin,output:process.stdout});const answer=await rl.question('停止服务并备份后迁移？输入 yes：');rl.close();if(answer!=='yes')process.exit(0);
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  mkdirSync(paths.base,{mode:0o755});chmodSync(paths.base,0o755);
  mkdirSync(paths.backups,{mode:0o700});backup=`${paths.backups}/legacy-${stamp}`;mkdirSync(backup,{mode:0o700});
  writeFileSync(`${backup}/deploy.json`,oldConfig,{mode:0o600});writeFileSync(`${backup}/560-town.service`,oldUnit,{mode:0o600});
  writeFileSync(`${backup}/previous-path.txt`,old+'\n',{mode:0o600});
  run('systemctl',['stop','560-town']);stopped=true;
  run(`${legacyRuntime}/bin/node`,[join(old,'scripts/deploy/database.mjs'),'backup'],{cwd:old,input:JSON.stringify({databaseUrl:c.databaseUrl,file:`${backup}/database.dump`}),stdio:['pipe','inherit','inherit']});
  run('tar',['-czf',`${backup}/assets-and-config.tar.gz`,'-C',`${legacy}/shared`,'local','.env.local','deploy.json']);
  mkdirSync(`${paths.base}/runtime`,{mode:0o755});run('rsync',['-a',`${legacyRuntime}/`,`${paths.base}/runtime/`]);
  mkdirSync(paths.shared,{mode:0o750});run('rsync',['-a','--exclude=backups','--exclude=.npm',`${legacy}/shared/`,`${paths.shared}/`]);
  if(existsSync(`${legacy}/shared/backups`))run('rsync',['-a',`${legacy}/shared/backups/`,`${paths.backups}/legacy-history/`]);
  mkdirSync(paths.releases,{mode:0o755});chmodSync(paths.releases,0o755);
  const release=`${paths.releases}/adopted-${stamp}`;mkdirSync(release,{mode:0o755});chmodSync(release,0o755);
  run('rsync',['-a','--exclude=.next','--exclude=.deployment','--exclude=.env.local','--exclude=.local',`${old}/`,`${release}/`]);
  // Only management tooling is refreshed. This operation is not a business-code upgrade.
  cpSync(join(source,'scripts/deploy'),join(release,'scripts/deploy'),{recursive:true});
  for(const name of ['deploy-linux.sh','manage-linux.sh','deploy-debian.sh','manage-debian.sh','migrate-baota.sh'])cpSync(join(source,name),join(release,name));
  writeFileSync(`${paths.shared}/deploy.json`,JSON.stringify(c,null,2)+'\n',{mode:0o600});chmodSync(`${paths.shared}/deploy.json`,0o600);
  symlinkSync(`${paths.shared}/.env.local`,`${release}/.env.local`);symlinkSync(`${paths.shared}/local`,`${release}/.local`);
  run('chown',['-hR','town560:town560',release]);run('chown',['root:town560',paths.shared]);
  chmodSync(paths.shared,0o750);run('chown',['root:town560',`${paths.shared}/.env.local`]);chmodSync(`${paths.shared}/.env.local`,0o640);
  run('usermod',['--home',paths.shared,'town560']);
  env.PATH=`${paths.runtime}:/usr/sbin:/usr/bin:/sbin:/bin`;env.HOME=paths.shared;
  for(const command of ['typecheck','build'])run('runuser',['-u','town560','--','env',`PATH=${env.PATH}`,`HOME=${paths.shared}`,...(command==='build'?['NODE_ENV=production']:[]),`${paths.runtime}/npm`,'run',command],{cwd:release});
  symlinkSync(release,paths.current);writeFileSync(unit,unitText(c),{mode:0o644});switched=true;
  run('systemctl',['daemon-reload']);run('systemctl',['start','560-town']);
  let healthy=false;
  for(let i=0;i<40;i++){try{const r=await healthRequest(`http://127.0.0.1:${c.port}/`,{headers:healthHeaders(c)});const a=await healthRequest(`http://127.0.0.1:${c.port}/api/account`,{headers:healthHeaders(c)});if(r.ok&&a.ok&&accountHealthy(c.mode,await a.json())){healthy=true;break;}}catch{}await new Promise(ok=>setTimeout(ok,1500));}
  if(!healthy)throw new Error('迁移后本机健康检查失败');
  console.log(`本机迁移检查通过。备份：${backup}。维护：sudo bash ${target}/manage-linux.sh status。旧 /opt 内容未删除；外部代理、浏览器与资产仍须验收。`);
}catch(error){
  console.error(error.message);
  if(stopped){try{
    run('systemctl',['stop','560-town']);
    if(oldUnit)writeFileSync(unit,oldUnit);
    if(oldHome)run('usermod',['--home',oldHome,'town560']);
    run('systemctl',['daemon-reload']);run('systemctl',['start','560-town']);
    console.error('已尝试恢复原服务与用户home。新候选和备份保留，数据库未执行迁移。');
  }catch{console.error('恢复失败，请使用已保存 systemd 备份与旧目录人工恢复。');}}
  process.exitCode=1;
}
