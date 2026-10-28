import {appendFileSync, existsSync, readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export function ensureManagementEntries(root) {
  const file=resolve(root,'.env.local');
  if(!existsSync(file))throw new Error('请先运行 npm run local:setup 初始化 .env.local');
  const content=readFileSync(file,'utf8'), additions=[];
  for(const key of ['TOWN_MANAGE_ENTRY','TOWN_SYSTEM_ENTRY']) {
    // Existing values, including invalid/empty ones, are never silently replaced.
    if(!new RegExp(`^${key}=`, 'm').test(content)&&!process.env[key]) additions.push(`${key}=gate-${randomBytes(16).toString('hex')}`);
  }
  if(additions.length)appendFileSync(file,`\n# 私有管理入口。请勿设置为 NEXT_PUBLIC_ 变量。\n${additions.join('\n')}\n`);
  return additions.length;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  ensureManagementEntries(process.cwd());
  console.log('管理入口配置已就绪；已有地址保持不变。管理员登录个人中心后可进入当前管理页面。');
}
