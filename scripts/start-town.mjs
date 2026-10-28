import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const help=`五六零人工智能AI小镇 · 一键安装与启动

Windows: start-windows.bat [选项]
Linux:   bash start-linux.sh [选项]

默认：检查环境 → 按需 npm ci → 生产构建 → 启动服务
要求：Node.js 24 或更高版本、npm；推荐与项目一致的 Node.js 24。

--dev           开发模式，支持修改后自动更新
--port 3001     指定端口，默认 3000（也可设置 PORT 环境变量）
--lan           监听 0.0.0.0，供局域网或服务器访问
--reinstall     强制重新安装项目依赖
--help          显示帮助

默认仅本机访问：http://127.0.0.1:3000
保持终端打开，按 Ctrl+C 停止。脚本不会安装系统 Node.js 或创建后台服务。`;

/** @param {string[]} args @param {{PORT?: string}} env */
export function parseOptions(args,env=process.env){
 const options={dev:false,reinstall:false,lan:false,port:env.PORT||'3000',help:false};
 for(let i=0;i<args.length;i++){
  const arg=args[i];
  if(arg==='--help'||arg==='-h')options.help=true;
  else if(arg==='--dev')options.dev=true;
  else if(arg==='--reinstall')options.reinstall=true;
  else if(arg==='--lan')options.lan=true;
  else if(arg==='--port')options.port=args[++i]??'';
  else throw new Error(`未知参数：${arg}。使用 --help 查看说明。`);
 }
 if(!/^\d+$/.test(options.port)||Number(options.port)<1||Number(options.port)>65535)throw new Error('端口必须是 1–65535 的整数。');
 options.port=String(Number(options.port));
 return options;
}

export function checkPort(port,host){
 return new Promise((ok,fail)=>{
  const server=createServer();
  server.once('error',error=>fail(new Error(error.code==='EADDRINUSE'
   ?`端口 ${port} 已被占用。若小镇已启动，请直接打开原页面；或使用 --port 3001。`
   :`无法监听端口 ${port}：${error.message}`)));
  server.listen(Number(port),host,()=>server.close(error=>error?fail(error):ok()));
 });
}

function runNpm(args,root){
 // Only fixed subcommands and validated numeric ports reach the Windows shell.
 const windows=process.platform==='win32';
 const executable=windows?(process.env.ComSpec||'cmd.exe'):'npm';
 const commandArgs=windows?['/d','/s','/c',`npm.cmd ${args.join(' ')}`]:args;
 return new Promise((ok,fail)=>{
  const child=spawn(executable,commandArgs,{cwd:root,stdio:'inherit',env:process.env});
  let interrupted=false;
  // The foreground process group also receives Ctrl+C; keep the wrapper alive until it exits.
  const interrupt=()=>{interrupted=true;if(!windows)child.kill('SIGINT');};
  const terminate=()=>{interrupted=true;child.kill('SIGTERM');};
  process.on('SIGINT',interrupt);process.on('SIGTERM',terminate);
  const cleanup=()=>{process.off('SIGINT',interrupt);process.off('SIGTERM',terminate);};
  child.once('error',error=>{cleanup();fail(new Error(`无法运行 npm：${error.message}。请确认 npm 已安装并加入 PATH。`));});
  child.once('exit',(code,signal)=>{
   cleanup();
   if(code===0&&!interrupted){ok();return;}
   const error=new Error(`npm ${args.join(' ')} 失败（退出码 ${code??signal}）。请查看上方输出。`);
   if(interrupted||signal==='SIGINT'||signal==='SIGTERM'||[130,-1073741510,3221225786].includes(code))error.name='AbortError';
   fail(error);
  });
 });
}

export async function launch({root=projectRoot,args=process.argv.slice(2),run=runNpm,portCheck=checkPort,log=console.log}={}){
 const options=parseOptions(args);
 if(options.help){log(help);return;}
 if(Number(process.versions.node.split('.')[0])<24)throw new Error(`当前 Node.js ${process.versions.node}，请先安装 Node.js 24 或更高版本。`);
 for(const file of ['package.json','package-lock.json'])if(!existsSync(join(root,file)))throw new Error(`项目缺少 ${file}，请使用完整项目目录。`);
 const host=options.lan?'0.0.0.0':'127.0.0.1';
 // Check before touching dependencies or build output; never stop an existing server.
 await portCheck(options.port,host);
 await run(['--version'],root);
 const fingerprint=createHash('sha256').update(readFileSync(join(root,'package.json'))).update(readFileSync(join(root,'package-lock.json'))).update(`${process.platform}:${process.arch}:${process.versions.node.split('.')[0]}`).digest('hex');
 const marker=join(root,'node_modules','.town-install-fingerprint');
 const installed=['next/package.json','react/package.json','three/package.json','typescript/package.json'].every(file=>existsSync(join(root,'node_modules',file)));
 const current=existsSync(marker)?readFileSync(marker,'utf8').trim():'';
 if(options.reinstall||!installed||current!==fingerprint){
  log('\n[1/3] 安装锁定版本依赖（首次运行需要联网）…');
  await run(['ci','--include=dev','--no-audit','--no-fund'],root);
  writeFileSync(marker,fingerprint+'\n');
 }else log('\n[1/3] 依赖未变化，复用已安装内容。');
 if(!options.dev){log('[2/3] 构建生产版本…');await run(['run','build'],root);}
 else {
  log('[2/3] 开发模式，跳过生产构建。');
  const envFile=join(root,'.env.local');
  if(existsSync(envFile)&&/^TOWN_LOCAL_AUTH=1\s*$/m.test(readFileSync(envFile,'utf8'))){
   if(options.lan)throw new Error('本地测试验证码模式仅供本机访问，请移除 --lan。');
   // Keep auth's explicit origin aligned with a user-selected local development port.
   process.env.BETTER_AUTH_URL=`http://localhost:${options.port}`;
   await run(['run','db:start'],root);
  }
 }
 log(`[3/3] 正在启动，看到 Ready 后访问：http://127.0.0.1:${options.port}`);
 if(options.lan)log(`已启用网络访问：请使用本机的实际 IP 地址和端口 ${options.port}。`);
 log('保持终端打开，按 Ctrl+C 停止。\n');
 await run(['run',options.dev?'dev':'start','--','--hostname',host,'--port',options.port],root);
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 launch().catch(error=>{if(error.name==='AbortError'){console.log('\n已停止。');process.exitCode=130;}else{console.error(`\n[错误] ${error.message}`);process.exitCode=1;}});
}
