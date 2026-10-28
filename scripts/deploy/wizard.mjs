import {healthRequest} from './health.mjs';
import {ask} from './prompt.mjs';
import {spawn} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,mkdirSync,chmodSync,symlinkSync,renameSync,unlinkSync,lstatSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {choosePort,recheckPort} from './ports.mjs';
import {ensureDatabasePermissions} from './permissions.mjs';
import {attachRuntimeState} from './release-state.mjs';
import {deploymentPaths,service,port,databaseName,hostName,dbUrl,newConfig,migratedConfig,envText,appEnvironment,testEnvironment,unitText,nginxText,healthHeaders,accountHealthy,proxyLocationText,finishLocalProvision,townSystemUserPlan} from './config.mjs';

const source=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const {projectRoot,base,runtime,shared,backups}=deploymentPaths(process.env.TOWN_DEPLOY_ROOT);
const saved=`${shared}/deploy.json`,unit=`/etc/systemd/system/${service}.service`;
const nginxFile=`/etc/nginx/sites-available/${service}`,nginxLink=`/etc/nginx/sites-enabled/${service}`;
let previous, migration, switched=false, stopped=false, installedUnit=false, addedNginx=false, oldUnit;
const env={...process.env,PATH:`${runtime}:/usr/sbin:/usr/bin:/sbin:/bin`,NEXT_TELEMETRY_DISABLED:'1'};
for(const key of ['DATABASE_URL','BETTER_AUTH_SECRET','BETTER_AUTH_URL','TOWN_LOCAL_AUTH','TOWN_LOCAL_TEST_RESIDENT','TOWN_MANAGE_ENTRY','TOWN_SYSTEM_ENTRY','TOWN_PASSWORD_AUTH','TOWN_TRUST_PROXY','NODE_ENV'])delete env[key];

function run(command,args=[],{input,quiet=false,...options}={}) {
  return new Promise((ok,fail)=>{
    const child=spawn(command,args,{env,stdio:[input===undefined?'inherit':'pipe',quiet?'ignore':'inherit',quiet?'ignore':'inherit'],...options});
    if(input!==undefined)child.stdin.end(typeof input==='string'?input:JSON.stringify(input));
    child.on('error',()=>fail(new Error(`${command} 无法启动。`)));
    child.on('exit',code=>code===0?ok():fail(Object.assign(new Error(`${command} 执行失败（${code}），部署已中止。`),{exitCode:code})));
  });
}
const choice=allowed=>value=>{if(!allowed.includes(value))throw new Error(`请选择 ${allowed.join(' / ')}`);return value;};
const promptPort=initial=>ask('应用内部端口',initial,port);
function atomicLink(target,link){const temp=`${link}.deploy-next`;if(existsSync(temp))throw new Error(`存在未完成的链接 ${temp}，请管理员检查。`);symlinkSync(target,temp);renameSync(temp,link);}
function privateWrite(path,data,mode=0o600){writeFileSync(path,data,{mode});chmodSync(path,mode);}
async function asApp(release,args,options={}){
  return run('runuser',['-u','town560','--','env',`PATH=${env.PATH}`,`HOME=${shared}`,...args],{cwd:release,...options});
}
async function database(release,action,data,user='town560',quiet=false){
  return run('runuser',['-u',user,'--',`${runtime}/node`,join(release,'scripts/deploy/database.mjs'),action],{cwd:'/tmp',input:data,quiet});
}
async function healthy(c) {
  let diagnostic="尚未收到响应";
  for(let i=0;i<60;i++){
    try{
      const root=await healthRequest(`http://127.0.0.1:${c.port}/`,{headers:healthHeaders(c)});
      diagnostic=`首页 HTTP ${root.status}`;
      if(root.ok){
        const account=await healthRequest(`http://127.0.0.1:${c.port}/api/account`,{headers:healthHeaders(c)});
        diagnostic+=`；账号 HTTP ${account.status}`;
        if(account.ok){if(accountHealthy(c.mode,await account.json()))return;diagnostic+="；账号模式不匹配";}
      }
    }catch(error){diagnostic=`请求异常 ${error.code||error.name||"unknown"}`;}
    await new Promise(ok=>setTimeout(ok,2000));
  }
  throw new Error(`启动健康检查未通过：${diagnostic}。请使用 journalctl -u 560-town 排查。`);
}

async function main(){
  if(process.platform!=='linux'||process.getuid()!==0||!process.stdin.isTTY)throw new Error('请在支持的 Linux 交互终端中使用 sudo bash deploy-linux.sh。');
  const version=JSON.parse(readFileSync(join(source,'package.json'),'utf8')).version;
  console.log(`\n五六零人工智能AI小镇 V${version} · Linux 部署\n`);
  console.log(`源码包：${source}；项目根：${projectRoot}。`);
  console.log(`部署状态目录：${base}；实际运行版本：${base}/current。`);
  const migrationRoot=process.env.TOWN_MIGRATE_FROM;
  if(existsSync('/opt/560-town/shared/deploy.json')&&!existsSync(saved)&&!migrationRoot)throw new Error('检测到旧布局，请先明确迁移和备份；不会新建第二实例。');
  if(existsSync(unit))oldUnit=readFileSync(unit);
  if(migrationRoot){
    const old=deploymentPaths(migrationRoot),configFile=`${old.shared}/deploy.json`;
    if(existsSync(saved))throw new Error('新项目根已有部署配置，不能再次迁移。');
    if(!existsSync(configFile)||!existsSync(`${old.base}/current`))throw new Error('旧项目根缺少完整部署配置或运行链接。');
    if(!oldUnit||!oldUnit.toString().includes('WorkingDirectory='+old.base+'/current\n'))throw new Error('当前服务不属于指定旧项目根，拒绝迁移。');
    const original=JSON.parse(readFileSync(configFile,'utf8'));
    const c=migratedConfig(original,projectRoot);
    migration={old,oldShared:old.shared,oldHome:old.shared,config:c,oldRelease:resolve(`${old.base}/current`,'..',(await import('node:fs')).readlinkSync(`${old.base}/current`))};
    console.log(`发现旧部署：${old.projectRoot} → ${projectRoot}。将保留数据库、密钥、入口与上传素材；候选验证完成前旧服务继续运行。`);
  }else {
    if(oldUnit&&!oldUnit.toString().includes('WorkingDirectory='+base+'/current\n'))throw new Error('已有服务与安装根不一致，拒绝覆盖。');
    if(existsSync(unit)&&!existsSync(saved))throw new Error('存在未被此脚本管理的同名 systemd 服务，拒绝覆盖。');
  }
  if(existsSync(`${base}/current`)){
    if(!lstatSync(`${base}/current`).isSymbolicLink())throw new Error('current 不是部署链接，拒绝覆盖。');
    previous=resolve(`${base}/current`, '..', (await import('node:fs')).readlinkSync(`${base}/current`));
    if(!previous.startsWith(`${base}/releases/`))throw new Error('旧版本路径不在受管理的 releases 目录。');
  }
  let c,connection;
  if(migration){
    c=migration.config;
    const answer=await ask('是否迁移旧项目到新根？输入 yes 继续','',choice(['yes','no']));if(answer==='no')return;
  }else if(existsSync(saved)){
    c=JSON.parse(readFileSync(saved,'utf8'));
    if(c.format!==2||c.projectRoot!==projectRoot||!['test','preview','password'].includes(c.mode))throw new Error('保存的部署配置不兼容。');
    port(c.port);hostName(c.host);
    console.log(`发现原部署：${c.mode==='test'?'SSH 完整测试':c.mode==='password'?'HTTPS 密码账号':'公网游客预览'}，内部端口 ${c.port}。保留数据库、密钥、入口及上传素材。`);
    const answer=await ask('是否用当前发布包更新/重试？输入 yes 继续','',choice(['yes','no']));if(answer==='no')return;
    // An installed running town legitimately owns its port; do not flag it as a conflict.
    if(!previous)c.port=await recheckPort({prompt:promptPort,current:c.port});
  } else {
    console.log('1. 完整功能测试：只监听本机，经 SSH 隧道访问，支持现有测试验证码。');
    console.log('2. 公网游客预览：生产构建 + Nginx HTTP；当前版本不开放注册、多人或后台登录。');
    console.log('3. 公网密码账号：手机号+密码注册登录；必须由可信反向代理提供 HTTPS，关闭所有测试验证码；本批无真实短信。');
    const mode={1:'test',2:'preview',3:'password'}[await ask('部署模式','3',choice(['1','2','3']))];
    const appPort=await choosePort({prompt:promptPort});
    const host=mode!=='test'?await ask('访问域名或服务器 IPv4（不含 http://）','',hostName):'localhost';
    if(mode==='preview'&&(existsSync(nginxFile)||existsSync(nginxLink)))throw new Error('已有同名 Nginx 配置，拒绝覆盖。');
    if(mode==='password'){
      console.log('应用仅监听127.0.0.1；反代须传递Host、X-Forwarded-Host和X-Forwarded-Proto，公网仅开放HTTPS。安装不会自动签发证书或覆盖现有网站。');
      await ask('确认将为此域名配置可信 HTTPS 反代，输入 yes','',choice(['yes']));
    }
    // Ubuntu 22.04 ships PostgreSQL 14; do not silently provision an unsupported DB.
    const ubuntu22=/^ID=ubuntu$/m.test(readFileSync('/etc/os-release','utf8'))&&/^VERSION_ID="?22\.04"?$/m.test(readFileSync('/etc/os-release','utf8'));
    if(ubuntu22)console.log('Ubuntu22.04系统仓库PostgreSQL14低于项目要求。请先准备PostgreSQL15+，此向导连接已有实例，不添加外部软件仓库。');
    const kind=ubuntu22?'2':await ask('数据库：1=自动新建本机 PostgreSQL15+；2=已有 PostgreSQL15+','1',choice(['1','2']));
    const dbHost=kind==='1'?'127.0.0.1':await ask('数据库地址（IPv4或域名）','127.0.0.1',hostName);
    const dbPort=kind==='1'?5432:await ask('数据库端口','5432',v=>{if(!/^\d+$/.test(v)||+v<1||+v>65535)throw new Error('端口范围 1–65535');return +v;});
    const name=await ask('数据库名称','town560',databaseName),user=await ask('数据库应用用户名','town560',databaseName);
    const password=await ask('数据库应用密码（隐藏输入）','',v=>{if(v.length<12||/[\r\n\0]/.test(v))throw new Error('请使用至少12个字符且不含换行的密码。');return v;},{secret:true});
    if(kind==='1')await ask('再次输入数据库密码','',v=>{if(v!==password)throw new Error('两次输入不一致。');return v;},{secret:true});
    const ssl=kind==='1'?'disable':(await ask('数据库 TLS：1=验证证书；2=不使用（仅可信内网）','1',choice(['1','2'])))==='1'?'verify-full':'disable';
    connection={host:dbHost,dbPort,name,user,password,ssl,create:kind==='1'};
    c=newConfig({projectRoot,mode,appPort,host,databaseUrl:dbUrl(connection)});
    if(connection.create){
      c.pendingLocalDatabase=true;
      c.reuseLocalRole=(await ask('若同名普通数据库账号已存在，是否复用？yes需填写其原密码，不修改账号密码','no',choice(['yes','no'])))==='yes';
    }
    console.log(`\n即将使用项目根 ${projectRoot}；部署状态目录 ${base}。`);
    console.log(`模式 ${mode}，端口 ${appPort}，本次数据库 ${dbHost}:${dbPort}/${name}。`);
    if(await ask('输入 yes 开始安装（不会打印密码）','',choice(['yes','no']))==='no')return;
  }
  mkdirSync(`${base}/releases`,{recursive:true,mode:0o755});chmodSync(base,0o755);chmodSync(`${base}/releases`,0o755);
  if(!existsSync(shared)){mkdirSync(shared,{mode:0o755});}
  // Reuse only an account previously created for this dedicated application.
  let userExists=false;try{await run('id',['town560'],{quiet:true});userExists=true;}catch{}
  if(userExists){
    const entry=readFileSync('/etc/passwd','utf8').split('\n').find(line=>line.startsWith('town560:'));
    const expectedHome=migration?migration.oldHome:shared;
    const userPlan=townSystemUserPlan(entry,expectedHome);
    if(userPlan==='reject')throw new Error('已有 town560 系统用户不是可安全复用的小镇专用受限账户，拒绝修改。请先由管理员核对该账户用途。');
    if(userPlan==='rehome'){
      if(migration)throw new Error('迁移所需的 town560 账户 Home 与旧部署不一致，拒绝继续。');
      console.log(`检测到旧版小镇专用账户 town560；将把其 Home 从旧目录切换到 ${shared}。旧目录文件不会删除。`);
      await run('usermod',['--home',shared,'town560']);
    }
  }else await run('useradd',['--system','--user-group','--home-dir',shared,'--shell','/usr/sbin/nologin','town560']);
  try{await run('runuser',['-u','town560','--','test','-x',projectRoot],{quiet:true});}catch{throw new Error('应用账号无法穿过项目父目录；请为 town560 配置目录遍历权限或改用可访问项目目录。不会自动放宽父目录权限。');}
  await run('chown',['root:town560',shared]);chmodSync(shared,0o750);
  for(const dir of ['local','.npm']){mkdirSync(`${shared}/${dir}`,{recursive:true,mode:0o700});await run('chown',['town560:town560',`${shared}/${dir}`]);}
  mkdirSync(backups,{recursive:true,mode:0o700});chmodSync(backups,0o700);
  const stamp=new Date().toISOString().replace(/[:.]/g,'-'),release=`${base}/releases/v${version}-${stamp}`;
  mkdirSync(release,{mode:0o755});chmodSync(release,0o755);
  console.log('\n[1/6] 复制干净源码并安装锁定版本依赖…');
  const entries=['app','components','data','docs','lib','public','scripts','tests','types','package.json','package-lock.json','next.config.ts','next-env.d.ts','tsconfig.json','README.md','CHANGELOG.md','VERSION','deploy-linux.sh','manage-linux.sh','deploy-debian.sh','manage-debian.sh','start-linux.sh','start-windows.bat','.env.example'];
  await run('rsync',['-a','--chmod=D755,F644','--exclude=.deployment','--exclude=.*','--exclude=*.log','--exclude=node_modules','--exclude=artifacts','--exclude=backups','--exclude=*.dump','--exclude=*.bak',...entries.filter(name=>existsSync(join(source,name))).map(name=>join(source,name)),`${release}/`]);
  await run('chown',['-R','town560:town560',release]);
  await asApp(release,[`${runtime}/npm`,'ci','--include=dev','--no-audit','--no-fund']);
  // Normalize Windows archive modes and allow postgres to load the provisioning helper.
  // Private configuration/upload symlinks are attached only after this permission pass.
  await run('chmod',['-R','u=rwX,go=rX',release]);
  privateWrite(saved,JSON.stringify(c,null,2)+'\n');
  if(c.pendingLocalDatabase){
    await run('apt-get',['install','-y','postgresql']);await run('systemctl',['enable','--now','postgresql']);
    const url=new URL(c.databaseUrl);
    console.log('继续专用本机数据库初始化；同名对象不会覆盖。若上次仅创建部分对象，请先由数据库管理员核对。');
    await finishLocalProvision(c,{
      create:()=>database(release,'create',{user:databaseName(decodeURIComponent(url.username)),name:databaseName(decodeURIComponent(url.pathname.slice(1))),password:decodeURIComponent(url.password),reuseRole:c.reuseLocalRole===true},'postgres'),
      check:()=>database(release,'check',{databaseUrl:c.databaseUrl}),
      save:()=>privateWrite(saved,JSON.stringify(c,null,2)+'\n'),
    });
  }
  console.log('[2/6] 验证数据库连接和建表权限…');
  await ensureDatabasePermissions({
    check:()=>database(release,'check',{databaseUrl:c.databaseUrl}),
    repair:async()=>{
      console.log('Linux root 不等于数据库管理员。可用数据库管理员连接同一主机/端口/数据库，仅授予应用账号 public 的 USAGE、CREATE；不会授予超级管理员权限。');
      if(await ask('是否现在输入数据库管理员凭证并授权？yes=授权；no=退出后手动处理','no',choice(['yes','no']))!=='yes')throw new Error('未执行数据库授权；请手动授予权限后重新运行部署。');
      const adminUser=await ask('PostgreSQL 管理员用户名','postgres',v=>{if(!v.trim()||/[\r\n\0]/.test(v))throw new Error('请输入有效账号。');return v;});
      let adminPassword=await ask('数据库管理员密码（隐藏输入，仅本次使用，不保存）','',v=>{if(!v||/[\r\n\0]/.test(v))throw new Error('请输入有效密码。');return v;},{secret:true});
      try{await database(release,'grant-schema',{databaseUrl:c.databaseUrl,adminUser,adminPassword},'root');}
      finally{adminPassword='';}
    },
  });
  privateWrite(saved,JSON.stringify(c,null,2)+'\n');
  privateWrite(`${shared}/.env.local`,envText(c),0o640);await run('chown',['root:town560',`${shared}/.env.local`]);
  // Do not attach .local before Turbopack runs: uploaded assets live in shared
  // storage outside this release and are deliberately not part of the build graph.
  const candidateEnv={...env,...appEnvironment(c)};
  console.log('[3/6] 类型检查、回归测试和生产构建（完整测试模式运行时仍用开发服务器）…');
  await asApp(release,[`${runtime}/npm`,'run','typecheck'],{env:candidateEnv});
  await asApp(release,[`${runtime}/npm`,'test'],{env:{...env,...testEnvironment()}});
  await asApp(release,[`${runtime}/npm`,'run','build'],{env:{...candidateEnv,NODE_ENV:'production'}});
  attachRuntimeState({release,shared});
  if(previous||migration){
    console.log(migration?'[4/7] 候选通过，备份并迁移旧服务状态…':'[4/6] 暂停旧服务，备份数据库、素材和配置…');
    await run('systemctl',['stop',service]);stopped=true;
    const backup=`${backups}/${stamp}`;mkdirSync(backup,{mode:0o700});
    await database(release,'backup',{databaseUrl:c.databaseUrl,file:`${backup}/database.dump`},'root');
    const sourceShared=migration?migration.oldShared:shared;
    await run('tar',['-czf',`${backup}/assets-and-config.tar.gz`,'-C',sourceShared,'local','.env.local','deploy.json']);
    privateWrite(`${backup}/previous-release.txt`,(migration?migration.oldRelease:previous)+'\n');
    if(migration){
      await run('rsync',['-a','--delete',`${migration.oldShared}/local/`,`${shared}/local/`]);
      await run('rsync',['-a',`${migration.old.base}/backups/`,`${backups}/previous-root/`]);
      await run('usermod',['--home',shared,'town560']);
      console.log(`已迁移共享配置与上传素材；旧项目根仍保留：${migration.old.projectRoot}`);
    }
    console.log(`备份已保存：${backup}`);
  }else {
    console.log('[4/6] 新安装：复查端口并初始化数据库结构…');
    const available=await recheckPort({prompt:promptPort,current:c.port});
    if(available!==c.port){
      c.port=available;
      privateWrite(saved,JSON.stringify(c,null,2)+'\n');
      privateWrite(`${shared}/.env.local`,envText(c),0o640);
      console.log(`已同步保存新端口 ${available}，服务启动、访问地址及SSH提示将使用新端口。`);
    }
  }
  await asApp(release,[`${runtime}/npm`,'run','db:migrate']);
  console.log('[5/6] 安装 systemd 服务并检查本机访问…');
  atomicLink(release,`${base}/current`);switched=true;
  writeFileSync(unit,unitText(c),{mode:0o644});installedUnit=true;
  await run('systemctl',['daemon-reload']);await run('systemctl',['enable',service]);await run('systemctl',['restart',service]);
  await healthy(c);
  console.log('[6/6] 配置入口…');
  if(c.mode==='preview'){
    await run('apt-get',['install','-y','nginx']);
    if(existsSync(nginxFile)&&!readFileSync(nginxFile,'utf8').startsWith('# Managed by 560-town'))throw new Error('Nginx 文件不属于此部署工具，拒绝覆盖。');
    if(!existsSync(nginxFile)){writeFileSync(nginxFile,nginxText(c),{mode:0o644});addedNginx=true;}
    if(!existsSync(nginxLink))symlinkSync(nginxFile,nginxLink);
    await run('nginx',['-t']);await run('systemctl',['enable','--now','nginx']);await run('systemctl',['reload','nginx']);
    const response=await fetch('http://127.0.0.1/',{headers:{Host:c.host},signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw new Error('Nginx 入口检查未通过。');
  }
  console.log(`\nV${version} 部署完成。日志：sudo journalctl -u ${service} -f`);
  if(c.mode==='test'){
    console.log(`在每位测试者电脑执行（把用户和地址换成实际值）：\nssh -N -L ${c.port}:127.0.0.1:${c.port} SSH用户@服务器地址\n然后访问 http://localhost:${c.port}`);
    console.log('注册手机号时页面会显示随机测试验证码。注册后可在服务器执行以下命令授权首位超管：');
    console.log(`cd ${base}/current\nsudo -u town560 env PATH=${env.PATH} ${runtime}/npm run admin:grant -- --phone 你的已注册手机号 --super-admin`);
  }else if(c.mode==='password'){
    const proxy=`${shared}/https-proxy.conf.example`;
    privateWrite(proxy,proxyLocationText(c));
    console.log(`密码服务本机检查通过；外部HTTPS尚待配置/验收：https://${c.host}。代理示例：${proxy}。首位超管：sudo bash ${projectRoot}/manage-linux.sh admin`);
  }else console.log(`游客预览：http://${c.host} （仅HTTP，HTTPS设置见部署说明）。当前不支持公网注册/多人/后台登录。`);
  console.log(`配置保存在 ${saved}（仅root可读）；不要发送给他人。上传素材在 ${shared}/local/site-assets。`);
}
try{await main();}catch(error){
  console.error(`\n部署未完成：${error.message}`);
  if(addedNginx){try{if(existsSync(nginxLink))unlinkSync(nginxLink);unlinkSync(nginxFile);await run('nginx',['-t'],{quiet:true});await run('systemctl',['reload','nginx'],{quiet:true});}catch{}}
  if((previous||migration)&&(switched||stopped)){
    try{
      if(migration){
        await run('systemctl',['stop',service]);
        if(oldUnit)writeFileSync(unit,oldUnit);
        await run('usermod',['--home',migration.oldHome,'town560']);
        await run('systemctl',['daemon-reload']);await run('systemctl',['restart',service]);
        console.error('已尝试恢复旧项目根服务与应用账号 Home。');
      }else {
        if(switched)atomicLink(previous,`${base}/current`);if(oldUnit){writeFileSync(unit,oldUnit);await run('systemctl',['daemon-reload']);}await run('systemctl',['restart',service]);console.error('已尝试恢复旧代码服务。');
      }
      console.error('数据库迁移不会自动回退；需要时按备份恢复说明操作。');
    }catch{console.error('旧服务恢复失败，请检查 journalctl；源码、配置与备份均已保留。');}
  }else if(installedUnit){try{await run('systemctl',['stop',service]);if(switched&&lstatSync(`${base}/current`).isSymbolicLink())unlinkSync(`${base}/current`);}catch{}}
  console.error('未清除数据库、源码候选目录或已有配置。');
  if(process.stdin.isTTY){
    try{
      console.log('\n下一步：\n  [1] 查看 560-town 最近日志\n  [2] 运行只读部署检查\n  [3] 保留现场并退出');
      const next=await ask('请选择','3',choice(['1','2','3']));
      if(next==='1')await run('journalctl',['-u',service,'-n','80','--no-pager']);
      if(next==='2'&&!migration)await run('bash',[join(source,'deploy-linux.sh'),'--check','--install-root',projectRoot]);
      if(next==='2'&&migration)console.log('迁移候选尚未成为受管理安装；已保留现场。请修正错误后重新运行迁移。');
    }catch{console.error('诊断未完成；候选与备份仍已保留。');}
  }
  process.exitCode=1;
}
