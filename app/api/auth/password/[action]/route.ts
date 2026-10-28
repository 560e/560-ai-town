import {body,guard,handle,HttpError,json} from '@/lib/server/http';
import {authConfig} from '@/lib/server/config';
import {getAuth} from '@/lib/server/auth';
import {requireUser} from '@/lib/server/session';
import {normalizePhone} from '@/lib/account';
import {validatePassword} from '@/lib/password-policy';
import {passwordLimit,registerPassword,changeResidentPassword} from '@/lib/server/passwords';
import {database} from '@/lib/server/db';
import {passwordLogin} from '@/lib/server/password-context';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handle(async()=>{
  guard(request,true);
  if(!authConfig().password)throw new HttpError(403,'密码登录尚未启用');
  const action=new URL(request.url).pathname.split('/').pop();
  if(!['register','login','change'].includes(action||''))throw new HttpError(404,'此账户操作未开放');
  const data=await body(request),fields=action==='change'?['currentPassword','newPassword']:action==='register'?['phoneNumber','password','name','inviteCode']:['phoneNumber','password'];
  if(Object.keys(data).some(k=>!fields.includes(k)))throw new HttpError(400,'请求包含不允许修改的字段');
  if(action==='change'){
    const user=await requireUser(request.headers);
    await passwordLimit(request,'change',user.id);
    let password:string;try{password=validatePassword(data.newPassword);}catch(e){throw new HttpError(400,(e as Error).message);}
    if(data.currentPassword!==undefined&&(typeof data.currentPassword!=='string'||data.currentPassword.length>128))throw new HttpError(400,'当前密码格式无效');
    const session=await getAuth().api.getSession({headers:request.headers});
    const fresh=!!session&&Date.now()-new Date(session.session.createdAt).getTime()<15*60*1000;
    await changeResidentPassword(user.id,password,data.currentPassword as string|undefined,fresh);
    return json({ok:true,reauthenticate:true});
  }
  let phone:string;try{phone=normalizePhone(data.phoneNumber);}catch(e){throw new HttpError(400,(e as Error).message);}
  if(typeof data.password!=='string'||!data.password.length||data.password.length>128)throw new HttpError(400,'请输入有效密码');
  await passwordLimit(request,action!,phone);
  if(action==='register'){
    try{validatePassword(data.password);}catch(e){throw new HttpError(400,(e as Error).message);}
    await registerPassword(phone,data.password,data.name,data.inviteCode);
  }
  const headers=new Headers(request.headers);headers.delete('content-length');
  const url=new URL('/api/auth/sign-in/phone-number',request.url);
  const credential=(await database().query('SELECT u.id,a.password FROM "user" u JOIN account a ON a."userId"=u.id AND a."providerId"=\'credential\' WHERE u."phoneNumber"=$1',[phone])).rows[0];
  if(!credential?.password)throw new HttpError(401,'手机号或密码不正确，或账户尚未设置密码');
  const response=await passwordLogin.run({userId:credential.id,hash:credential.password},()=>getAuth().handler(new Request(url,{method:'POST',headers,body:JSON.stringify({phoneNumber:phone,password:data.password})})));
  if(!response.ok)return json({error:response.status===429?'尝试次数过多，请稍后重试':'手机号或密码不正确，或账户不可用'},response.status===429?429:401);
  const result=json({ok:true});for(const cookie of response.headers.getSetCookie())result.headers.append('set-cookie',cookie);return result;
});}
