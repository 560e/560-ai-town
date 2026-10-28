import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
const releaseVersion=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url),'utf8')).version;

export const service='560-town';
export function projectDirectory(value) {
  if(typeof value!=='string'||!/^\/(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+$/.test(value)||value.split('/').some(p=>p==='.'||p==='..'||p==='.deployment')||['/etc','/usr','/bin','/sbin','/var','/opt','/srv','/home','/root','/www/wwwroot'].includes(value))throw new Error('项目根必须是独立绝对目录，不允许空格、特殊字符、路径跳转或 .deployment 内部路径。');
  return value;
}
export function deploymentPaths(root) {
  const projectRoot=projectDirectory(root),base=projectRoot+'/.deployment';
  return {projectRoot,base,runtime:base+'/runtime/bin',shared:base+'/shared',backups:base+'/backups',current:base+'/current',releases:base+'/releases'};
}
export function linuxPlatform(id,version,arch) {
  if(!((id==='debian'&&['12','13'].includes(version))||(id==='ubuntu'&&['22.04','24.04'].includes(version))))throw new Error('仅支持 Debian 12/13、Ubuntu 22.04/24.04 LTS。');
  if(!['x86_64','aarch64','arm64'].includes(arch))throw new Error('仅支持 x86_64/arm64。');
  return arch==='x86_64'?'x64':'arm64';
}
export function appDirectory(value) {
  if(typeof value!=='string'||!/^\/www\/wwwroot\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(value)||value.split('/').some(p=>p==='.'||p==='..'))throw new Error('宝塔运行目录必须是 /www/wwwroot/站点名/项目名，不允许空格或路径跳转。');
  return value;
}
export function port(value) {
  if(!/^\d+$/.test(String(value))||Number(value)<1024||Number(value)>65535)throw new Error('端口必须为 1024–65535。');
  return Number(value);
}
export function databaseName(value) {
  if(!/^[a-z][a-z0-9_]{0,39}$/.test(value))throw new Error('数据库名/用户名仅允许小写字母开头、数字和下划线，最多40字符。');
  return value;
}
export function hostName(value) {
  if(!/^[a-zA-Z0-9][a-zA-Z0-9.-]{0,252}$/.test(value)||value.includes('..'))throw new Error('请输入有效的 IPv4 或域名，不含协议和路径。');
  return value;
}
export function dbUrl({host,dbPort,name,user,password,ssl}) {
  hostName(host);databaseName(name);databaseName(user);
  if(!/^\d+$/.test(String(dbPort))||Number(dbPort)<1||Number(dbPort)>65535)throw new Error('数据库端口无效。');
  if(!password||/[\r\n\0]/.test(password))throw new Error('数据库密码不能为空或包含换行。');
  if(!['disable','verify-full'].includes(ssl))throw new Error('SSL 模式无效。');
  const escape=value=>encodeURIComponent(value).replace(/[!'()*]/g,c=>`%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `postgresql://${escape(user)}:${escape(password)}@${host}:${Number(dbPort)}/${escape(name)}?sslmode=${ssl}`;
}
export function newConfig({mode,appPort,host='localhost',databaseUrl,projectRoot=''}) {
  projectDirectory(projectRoot);
  if(!['test','preview','password'].includes(mode))throw new Error('部署模式无效。');
  const p=port(appPort);
  if(mode!=='test')hostName(host);
  return {format:2,projectRoot,mode,port:p,host:mode==='test'?'localhost':host,databaseUrl,
    secret:randomBytes(48).toString('hex'),manage:`gate-${randomBytes(16).toString('hex')}`,system:`gate-${randomBytes(16).toString('hex')}`};
}
export function envText(c) {
  return Object.entries(appEnvironment(c)).map(([key,value])=>`${key}=${value}`).join('\n')+'\n';
}
// A previous release used this fixed, non-login system account.  A fresh
// project-root installation can retain that account only when it is plainly
// the dedicated application account; every other account shape stays blocked.
export function townSystemUserPlan(passwdEntry,expectedHome) {
  if(typeof passwdEntry!=='string'||typeof expectedHome!=='string'||!expectedHome.startsWith('/'))return 'reject';
  const fields=passwdEntry.split(':');
  if(fields.length<7||fields[0]!=='town560'||fields[2]==='0'||!/^\d+$/.test(fields[2])||fields[6]!=='/usr/sbin/nologin'||!fields[5].startsWith('/'))return 'reject';
  return fields[5]===expectedHome?'reuse':'rehome';
}
export function migratedConfig(source,targetRoot) {
  if(!source||source.format!==2||!['test','preview','password'].includes(source.mode))throw new Error('旧部署配置不兼容。');
  const projectRoot=projectDirectory(targetRoot);
  port(source.port);hostName(source.host);
  if(typeof source.databaseUrl!=='string'||typeof source.secret!=='string'||!source.secret||typeof source.manage!=='string'||typeof source.system!=='string')throw new Error('旧部署配置缺少迁移所需字段。');
  return {...source,projectRoot};
}
export function appEnvironment(c) {
  const origin=c.mode==='test'?`http://localhost:${c.port}`:`${c.mode==='password'?'https':'http'}://${hostName(c.host)}`;
  return {
    DATABASE_URL:c.databaseUrl,
    BETTER_AUTH_SECRET:c.secret,
    BETTER_AUTH_URL:origin,
    TOWN_LOCAL_AUTH:c.mode==='test'?'1':'0',
    TOWN_LOCAL_TEST_RESIDENT:'0',
    TOWN_PASSWORD_AUTH:c.mode==='password'?'1':'0',
    TOWN_TRUST_PROXY:c.mode==='password'?'1':'0',
    TOWN_MANAGE_ENTRY:c.manage,
    TOWN_SYSTEM_ENTRY:c.system,
    NEXT_TELEMETRY_DISABLED:'1',
  };
}
// Regression tests must not inherit a candidate's database or authentication mode.
// Tests that need a specific configuration set it explicitly.
export function testEnvironment() {
  return {NODE_ENV:'test',NEXT_TELEMETRY_DISABLED:'1'};
}
// Only used by the local deployment probe; public requests still pass the normal guard.
/** @returns {Record<string, string>} */
export function healthHeaders(c) {
  return c.mode==='password'?{Host:hostName(c.host),'X-Forwarded-Host':hostName(c.host),'X-Forwarded-Proto':'https'}:{};
}
export function accountHealthy(mode,response) {
  if(mode==='password')return response.enabled===true&&response.password===true&&response.local===false;
  return mode==='test'?response.enabled===true&&response.local===true:response.enabled===false&&response.local===false;
}
export function unitText(c) {
  const {base,runtime}=deploymentPaths(c.projectRoot);
  return `[Unit]\nDescription=560 AI Town V${releaseVersion} (${c.mode})\nAfter=network-online.target postgresql.service\nWants=network-online.target\n\n[Service]\nType=simple\nUser=town560\nGroup=town560\nWorkingDirectory=${base}/current\nEnvironment=PATH=${runtime}:/usr/bin:/bin\nEnvironment=NODE_ENV=${c.mode==='test'?'development':'production'}\nEnvironment=NEXT_TELEMETRY_DISABLED=1\nEnvironment=HOME=${base}/shared\n${c.previewHost?`Environment=TOWN_DEV_ORIGINS=${hostName(c.previewHost)}\n`:''}ExecStart=${runtime}/node node_modules/next/dist/bin/next ${c.mode==='test'?'dev':'start'} --hostname 127.0.0.1 --port ${port(c.port)}\nRestart=on-failure\nRestartSec=5\nTimeoutStopSec=30\nKillSignal=SIGTERM\nUMask=0077\nNoNewPrivileges=true\nPrivateTmp=true\nProtectHome=false\nProtectSystem=full\n\n[Install]\nWantedBy=multi-user.target\n`;
}
export function nginxText(c) {
  if(c.mode!=='preview')throw new Error('完整测试模式不得生成公网代理。');
  return `# Managed by 560-town deployer. HTTP visitor preview only.\nserver {\n    listen 80;\n    server_name ${hostName(c.host)};\n    client_max_body_size 8m;\n    location ~ (^|/)\\. { return 404; }\n    location / {\n        proxy_pass http://127.0.0.1:${port(c.port)};\n        proxy_http_version 1.1;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_set_header X-Forwarded-Host $host;\n        proxy_buffering off;\n        proxy_read_timeout 60s;\n    }\n}\n`;
}

export function adoptLegacyConfig(c,root) {
  if(c.format!==1||!['test','preview','password'].includes(c.mode))throw new Error('仅支持旧版受管理部署；新布局请使用正常升级。');
  port(c.port);hostName(c.host);
  const {appDirectory:oldDirectory,...preserved}=c;
  return {...preserved,format:2,projectRoot:projectDirectory(root)};
}
export function proxyLocationText(c) {
  return `# Add inside the existing HTTPS server block; preserve its TLS certificates.\nclient_max_body_size 8m;\nlocation ~ (^|/)\\. { return 404; }\nlocation / {\n proxy_pass http://127.0.0.1:${port(c.port)};\n proxy_http_version 1.1;\n proxy_set_header Host $host;\n proxy_set_header X-Real-IP $remote_addr;\n proxy_set_header X-Forwarded-Host $host;\n proxy_set_header X-Forwarded-Proto $scheme;\n proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n proxy_set_header Upgrade $http_upgrade;\n proxy_set_header Connection "upgrade";\n proxy_buffering off;\n proxy_cache off;\n proxy_read_timeout 3600s;\n${c.mode==='test'?' proxy_hide_header Cache-Control;\n add_header Cache-Control "no-store" always;\n':''}}\n`;
}
// State is persisted only after CREATE completed successfully. A pre-existing or
// partially created role/database is never adopted merely because login works.
export async function finishLocalProvision(c,{check,create,save}) {
  if(!c.pendingLocalDatabase)return;
  if(!c.localDatabaseCreated){await create();c.localDatabaseCreated=true;await save();}
  await check();c.pendingLocalDatabase=false;await save();
}
