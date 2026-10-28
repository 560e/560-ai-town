import './account-env.mjs';
import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {normalizePhone} from '../lib/account.ts';
import {validatePassword} from '../lib/password-policy.ts';
import {database} from '../lib/server/db.ts';
import {changeResidentPassword} from '../lib/server/passwords.ts';
async function prompt(label:string,hidden=false){
  const output=new Writable({write(chunk,_encoding,done){if(!hidden)process.stdout.write(chunk);done();}});
  const rl=createInterface({input:process.stdin,output,terminal:true});
  rl.on('SIGINT',()=>{rl.close();process.exit(130);});
  if(hidden)process.stdout.write(label);
  try{return await rl.question(hidden?'':label);}finally{rl.close();if(hidden)console.log();}
}
try{
  if(!process.stdin.isTTY||process.argv.length>2)throw Error('请在交互终端运行；密码不能通过命令行参数传入。');
  if(process.platform==='linux'&&process.getuid?.()!==0)throw Error('请使用 root 运行服务器账号维护工具');
  console.log('仅为已注册账号设置或重置密码。请先核实用户身份；不会注册账号、修改角色或标记手机号已验证。');
  const phone=normalizePhone(await prompt('已注册手机号：'));
  const user=(await database().query('SELECT id,banned FROM "user" WHERE "phoneNumber"=$1',[phone])).rows[0];
  if(!user||user.banned)throw Error('账号不存在或已停用');
  const password=validatePassword(await prompt('新密码（隐藏输入，至少10位字母和数字）：',true));
  if(await prompt('再次输入新密码：',true)!==password)throw Error('两次密码不一致');
  if(await prompt('输入 yes 确认设置密码并撤销该账号全部登录会话：')!=='yes')throw Error('操作已取消');
  await changeResidentPassword(user.id,password,undefined,false,true);
  console.log('密码已更新，请用新密码登录。角色和身份权限未改变。');
}catch(e){console.error((e as Error).message);process.exitCode=1;}finally{await database().end();}
