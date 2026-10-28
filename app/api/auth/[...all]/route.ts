import {transaction} from '@/lib/server/db';
import {getAuth} from "@/lib/server/auth";
import {body, guard, handle, HttpError, json} from "@/lib/server/http";
import {normalizePhone} from "@/lib/account";
import {delivery, throttle} from "@/lib/server/otp";
import {otpCodeLength} from '@/lib/server/local-test-resident';
import {authConfig} from '@/lib/server/config';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request:Request) {return handle(async()=>{
  guard(request,true);
  const path = new URL(request.url).pathname.replace("/api/auth/","");
  if (!["phone-number/send-otp","phone-number/verify","sign-out"].includes(path)) throw new HttpError(404,"此账户操作未开放");
  if(path!=='sign-out'&&!authConfig().local)throw new HttpError(403,'测试验证码未开放，请使用手机号和密码登录');
  const data = await body(request);
  const allowed = path==="phone-number/send-otp"?["phoneNumber"]:path==="phone-number/verify"?["phoneNumber","code"]:[];
  if (Object.keys(data).some(key=>!allowed.includes(key))) throw new HttpError(400,"请求包含不允许修改的字段");
  if (path!=="sign-out") {
    try {data.phoneNumber=normalizePhone(data.phoneNumber);}catch(error){throw new HttpError(400,(error as Error).message);}
    const codeLength=otpCodeLength(data.phoneNumber as string);
    if (path.endsWith("/verify") && (typeof data.code!=="string" || !new RegExp(`^\\d{${codeLength}}$`).test(data.code))) throw new HttpError(400,`请输入 ${codeLength} 位验证码`);
    await throttle(data.phoneNumber as string,path.endsWith("send-otp")?"send":"verify");
  }
  const headers = new Headers(request.headers);headers.delete("content-length");
  const context:{code?:string}={};
  const response=await transaction(async client=>{
    if(path==='phone-number/verify'){
      const policy=(await client.query('SELECT invite_required FROM town_registration_settings WHERE id=1 FOR SHARE')).rows[0];
      if(!policy)throw new HttpError(503,'注册配置不可用');
      if(policy.invite_required&&!(await client.query('SELECT id FROM "user" WHERE "phoneNumber"=$1',[data.phoneNumber])).rowCount)throw new HttpError(403,'当前注册需要邀请码，请使用手机号、密码和邀请码注册');
    }
    return delivery.run(context,()=>getAuth().handler(new Request(request.url,{method:"POST",headers,body:JSON.stringify(data)})));
  });
  if (!response.ok) {
    const result=await response.json().catch(()=>({}));
    const message=response.status===429?"操作过于频繁，请稍后重试":String(result.message||"").includes("停用")?"账户已停用，请联系小镇管理员":"验证码无效、已使用或已过期，请重新获取";
    const failure=json({error:message},response.status);
    if(response.headers.has("retry-after"))failure.headers.set("retry-after",response.headers.get("retry-after")!);
    return failure;
  }
  const result = json({ok:true,...(path.endsWith("send-otp")?{localCode:context.code,expiresIn:300,retryAfter:60,mode:"local"}:{})});
  for (const cookie of response.headers.getSetCookie()) result.headers.append("set-cookie",cookie);
  return result;
});}

export async function GET(){return json({error:"此账户操作未开放"},404);}
