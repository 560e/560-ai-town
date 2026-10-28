import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline/promises';
import {deploymentPaths,service} from './config.mjs';
const {base,runtime,projectRoot,backups}=deploymentPaths(process.env.TOWN_DEPLOY_ROOT);
const savedConfig=JSON.parse(readFileSync(`${base}/shared/deploy.json`,'utf8'));
if(savedConfig.format!==2||savedConfig.projectRoot!==projectRoot)throw new Error('安装根与保存配置不一致。');
const env={...process.env,PATH:`${runtime}:/usr/sbin:/usr/bin:/sbin:/bin`};
function run(command,args,input){return new Promise((ok,fail)=>{const child=spawn(command,args,{cwd:`${base}/current`,env,stdio:[input===undefined?'inherit':'pipe','inherit','inherit']});if(input!==undefined)child.stdin.end(JSON.stringify(input));child.on('error',fail);child.on('exit',code=>code===0?ok():fail(new Error('维护命令执行失败。')));});}
try {
  if(process.platform!=='linux'||process.getuid()!==0)throw new Error('请在服务器使用 sudo 执行。');
  const action=process.argv[2];
  if(['status','restart','stop','start'].includes(action))await run('systemctl',[action,service]);
  else if(action==='logs')await run('journalctl',['-u',service,'-f']);
  else if(action==='admin'){
    const c=JSON.parse(readFileSync(`${base}/shared/deploy.json`,'utf8'));
    if(!['test','password'].includes(c.mode))throw new Error('当前游客预览模式未开放登录。');
    const rl=createInterface({input:process.stdin,output:process.stdout});
    const phone=await rl.question('请输入已经通过页面注册的首位超级管理员手机号：');rl.close();
    if(!/^1[3-9]\d{9}$/.test(phone))throw new Error('请输入有效的11位手机号。');
    await run('runuser',['-u','town560','--','env',`PATH=${env.PATH}`,`${runtime}/node`,'--experimental-strip-types','scripts/admin-account.ts','--phone',phone,'--super-admin']);
  }else if(action==='password'){
    await run(`${runtime}/node`,['--experimental-strip-types','scripts/password-account.ts']);
  }else if(action==='backup'){
    const c=JSON.parse(readFileSync(`${base}/shared/deploy.json`,'utf8'));
    const backup=`${backups}/manual-${new Date().toISOString().replace(/[:.]/g,'-')}`;
    mkdirSync(backup,{mode:0o700});
    console.log('暂停应用以保证数据库与素材的一致性；备份结束后恢复原运行状态。');
    let active=false;try{await run('systemctl',['is-active','--quiet',service]);active=true;}catch{}
    try{
      if(active)await run('systemctl',['stop',service]);
      await run(`${runtime}/node`,['scripts/deploy/database.mjs','backup'],{databaseUrl:c.databaseUrl,file:`${backup}/database.dump`});
      await run('tar',['-czf',`${backup}/assets-and-config.tar.gz`,'-C',`${base}/shared`,'local','.env.local','deploy.json']);
      writeFileSync(`${backup}/version.txt`,readFileSync(`${base}/current/VERSION`),{mode:0o600});
      console.log(`备份完成：${backup}`);
    }finally{if(active)await run('systemctl',['start',service]);}
  }else console.log('用法：sudo bash manage-linux.sh <status|logs|restart|stop|start|backup|admin|password>');
}catch(error){console.error(error.message);process.exitCode=1;}
