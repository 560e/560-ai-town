"use client";
import {useEffect,useState} from "react";
import {accountRequest,useAccount} from "./AccountProvider";
import {normalizePhone} from "@/lib/account";
import PasswordSignIn from './PasswordSignIn';
export default function SignIn({onSuccess}:{onSuccess?:()=>void}){
  const account=useAccount();
  const [method,setMethod]=useState<'password'|'local'>('password');
  const localChoice=account.local&&account.password;
  return <>
    {localChoice&&<><div className="account-password-tabs" aria-label="本地登录方式"><button type="button" aria-pressed={method==='password'} onClick={()=>setMethod('password')}>手机号密码登录</button><button type="button" aria-pressed={method==='local'} onClick={()=>setMethod('local')}>本地验证码登录</button></div><p className="account-help">旧测试账号尚未设置密码？先用本地验证码登录，再到个人中心的“账户与形象”设置登录密码。此入口仅限本机开发测试。</p></>}
    {account.password&&(!localChoice||method==='password')?<PasswordSignIn onSuccess={onSuccess}/>:<LocalCodeSignIn onSuccess={onSuccess}/>}
  </>;
}
function LocalCodeSignIn({onSuccess}:{onSuccess?:()=>void}){
  const account=useAccount();
  const [phone,setPhone]=useState(""),[code,setCode]=useState(""),[localCode,setLocalCode]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[remaining,setRemaining]=useState(0);
  const codeLength=account.local&&localCode.length===4?4:6;
  useEffect(()=>{if(remaining<=0)return;const timer=setTimeout(()=>setRemaining(n=>n-1),1000);return()=>clearTimeout(timer);},[remaining]);
  const send=async()=>{setError("");setBusy(true);setLocalCode("");setCode("");try{const result=await accountRequest("/api/auth/phone-number/send-otp",{phoneNumber:normalizePhone(phone)});setLocalCode(result.localCode||"");setRemaining(result.retryAfter||60);}catch(error){setError((error as Error).message);}finally{setBusy(false);}};
  const verify=async()=>{setError("");setBusy(true);try{await accountRequest("/api/auth/phone-number/verify",{phoneNumber:normalizePhone(phone),code});await account.refresh();setLocalCode("");setCode("");onSuccess?.();}catch(error){setError((error as Error).message);}finally{setBusy(false);}};
  return <form className="account-signin" onSubmit={event=>{event.preventDefault();void verify();}}>
    {account.local&&<div className="account-local-note"><strong>本地测试模式</strong><span>不会发送短信。获取后将在此显示随机测试验证码，有效期 5 分钟。</span></div>}
    {!account.loading&&!account.enabled&&<p className="account-error" role="alert">{account.error||"账户服务尚未启用，请先完成本地初始化并使用开发模式启动。"}</p>}
    <label htmlFor="account-phone">手机号</label><div className="account-phone"><span>+86</span><input id="account-phone" type="tel" inputMode="tel" autoComplete="tel-national" maxLength={16} placeholder="请输入中国大陆手机号" value={phone} onChange={event=>{setPhone(event.target.value);setLocalCode("");setCode("");}} disabled={busy||!account.enabled} required/></div>
    <label htmlFor="account-code">验证码</label><div className="account-code"><input id="account-code" inputMode="numeric" autoComplete="one-time-code" maxLength={codeLength} pattern={`[0-9]{${codeLength}}`} placeholder={`${codeLength} 位验证码`} value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,""))} disabled={busy||!account.enabled} required/><button type="button" onClick={()=>void send()} disabled={busy||remaining>0||!account.enabled}>{remaining>0?`${remaining} 秒后重发`:"获取验证码"}</button></div>
    {localCode&&<div className="account-test-code" role="status"><span>本地测试验证码 <strong>{localCode}</strong></span><button type="button" onClick={()=>setCode(localCode)}>填入验证码</button></div>}
    {error&&<p className="account-error" role="alert">{error}</p>}
    <button className="account-primary" type="submit" disabled={busy||!account.enabled||code.length!==codeLength}>{busy?"正在处理…":"登录／注册"}</button>
    <p className="account-help">未注册的手机号验证后将自动成为“小镇居民”。可访问公共区域，也可在服务中心了解公开称号并按条件提交申请。</p>
  </form>;
}
