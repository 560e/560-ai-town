import {existsSync,readFileSync,writeFileSync,mkdirSync,readdirSync,cpSync,lstatSync,chmodSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

export const directories=['app','components','data','docs','lib','public','scripts','tests','types'];
export const rootFiles=['LICENSE','THIRD_PARTY_NOTICES.md','package.json','package-lock.json','next.config.ts','next-env.d.ts','tsconfig.json','.gitignore','.env.example','README.md','AGENTS.md','AI_HANDOFF.md','新AI导入提示词.md','VERSION','CHANGELOG.md','启动说明.md','deploy-linux.sh','manage-linux.sh','deploy-debian.sh','migrate-baota.sh','manage-debian.sh','start-linux.sh','start-windows.bat'];
export function permitted(path){
  const parts=path.replaceAll('\\','/').split('/');
  if(parts.length===1)return rootFiles.includes(parts[0]);
  return directories.includes(parts[0])&&!parts.some(part=>part.startsWith('.')||['node_modules','artifacts','backups'].includes(part))&&!/\.(log|dump|bak|zip|tar|gz|tsbuildinfo)$/i.test(path);
}
export function packageRelease(root) {
  const version=JSON.parse(readFileSync(join(root,'package.json'),'utf8')).version;
  if(!/^\d+\.\d+\.\d+$/.test(version)||readFileSync(join(root,'VERSION'),'utf8').trim()!==version)throw new Error('版本号不一致。');
  const lock=JSON.parse(readFileSync(join(root,'package-lock.json'),'utf8'));
  if(lock.version!==version||lock.packages[''].version!==version)throw new Error('依赖锁文件版本号不一致。');
  const label=`560-ai-town-v${version}`,out=join(root,'artifacts','releases');mkdirSync(out,{recursive:true});
  const archive=join(out,`${label}.tar.gz`);
  if(existsSync(archive))throw new Error(`已有 ${archive}；请先保留/重命名原包，避免覆盖正式交付。未创建新的暂存目录。`);
  // Never delete an earlier package or staging directory on a rerun.
  const stamp=new Date().toISOString().replace(/[:.]/g,'-'),stage=join(out,`stage-${stamp}`),destination=join(stage,label);
  mkdirSync(destination,{recursive:true});
  const files=[];
  function walk(path){
    const absolute=join(root,path);if(!existsSync(absolute))return;
    const stat=lstatSync(absolute);if(stat.isSymbolicLink())throw new Error(`发布内容不得包含符号链接：${path}`);
    if(stat.isDirectory()){for(const entry of readdirSync(absolute)){const child=join(path,entry);if(permitted(child))walk(child);}}
    else if(permitted(path)){const target=join(destination,path);mkdirSync(dirname(target),{recursive:true});cpSync(absolute,target);if(path.endsWith('.sh'))writeFileSync(target,readFileSync(target,'utf8').replaceAll('\r\n','\n'));chmodSync(target,path.endsWith('.sh')?0o755:0o644);files.push(path.replaceAll('\\','/'));}
  }
  for(const entry of [...directories,...rootFiles])walk(entry);
  files.sort();
  const manifest={name:label,version,createdAt:new Date().toISOString(),type:'source-release-build-on-target',excludes:['local credentials','database contents','uploads','node_modules','Windows build output'],files:files.map(path=>({path,sha256:createHash('sha256').update(readFileSync(join(destination,path))).digest('hex')}))};
  writeFileSync(join(destination,'RELEASE-MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
  writeFileSync(join(destination,'FILES.sha256'),manifest.files.map(f=>`${f.sha256}  ${f.path}`).join('\n')+'\n');
  const result=spawnSync('tar',['-czf',archive,'-C',stage,label],{stdio:'inherit'});
  if(result.status!==0)throw new Error('tar 打包失败。');
  const checksum=createHash('sha256').update(readFileSync(archive)).digest('hex');
  writeFileSync(join(out,`${label}.tar.gz.sha256`),`${checksum}  ${label}.tar.gz\n`);
  console.log(JSON.stringify({archive,sha256:checksum,files:files.length,bytes:lstatSync(archive).size,staging:destination},null,2));
  return {archive,manifest,destination};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))packageRelease(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
