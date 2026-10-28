"use client";
import {useEffect,useState} from 'react';
import {accountRequest,useAccount} from './AccountProvider';
import {normalizePhone,nicknameInput} from '@/lib/account';
import {validatePassword} from '@/lib/password-policy';
import type {RegistrationAccess} from '@/lib/registration-policy';
export default function PasswordSignIn({onSuccess}:{onSuccess?:()=>void}){
  const account=useAccount();
  const [mode,setMode]=useState<'login'|'register'>('login'),[phone,setPhone]=useState(''),[name,setName]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[inviteCode,setInviteCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [policy,setPolicy]=useState<RegistrationAccess|null>(null),[policyError,setPolicyError]=useState(''),[reload,setReload]=useState(0);
  useEffect(()=>{if(mode!=='register')return;let active=true;setPolicy(null);setPolicyError('');void fetch('/api/account/registration',{cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'注册设置暂时不可用');if(active)setPolicy(data);}).catch(e=>{if(active)setPolicyError(e.message);});return()=>{active=false;};},[mode,reload]);
  async function submit(){setBusy(true);setError('');try{
    const phoneNumber=normalizePhone(phone);
    if(mode==='register'){if(!policy?.passwordRegistrationAllowed)throw Error('当前暂不能注册，请重新读取注册设置');nicknameInput(name);validatePassword(password);if(policy.inviteRequired&&!inviteCode.trim())throw Error('请输入邀请码');if(password!==confirm)throw Error('两次输入的密码不一致');}
    await accountRequest(`/api/auth/password/${mode}`,{phoneNumber,password,...(mode==='register'?{inviteCode,name:nicknameInput(name)}:{})});
    setPassword('');setConfirm('');setInviteCode('');setName('');await account.refresh();onSuccess?.();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <form className="account-signin" onSubmit={e=>{e.preventDefault();void submit();}}>
    <div className="account-password-tabs" aria-label="账户操作">{(['login','register'] as const).map(v=><button key={v} type="button" aria-pressed={mode===v} disabled={busy} onClick={()=>{setMode(v);setPassword('');setConfirm('');setError('');}}>{v==='login'?'登录小镇':'注册居民'}</button>)}</div>
    <h2>{mode==='login'?'欢迎回到小镇':'成为小镇居民'}</h2>
    <p className="account-help">{mode==='login'?'使用注册手机号和密码登录。':'注册后即可使用居民公共功能，更多身份可到服务中心申请。'}</p>
    <label htmlFor="password-phone">手机号</label><input id="password-phone" type="tel" autoComplete="username" inputMode="tel" maxLength={16} placeholder="请输入中国大陆手机号" value={phone} onChange={e=>setPhone(e.target.value)} required disabled={busy}/>
    {mode==='register'&&<><label htmlFor="registration-name">昵称</label><input id="registration-name" type="text" autoComplete="nickname" minLength={2} maxLength={40} placeholder="为自己取一个小镇昵称" value={name} onChange={e=>setName(e.target.value)} required disabled={busy} aria-describedby="registration-name-help"/><p id="registration-name-help" className="account-help">2–20个字符，不可与其他居民重名（不区分英文大小写和全角字符）。</p></>}
    <label htmlFor="login-password">{mode==='login'?'密码':'设置密码'}</label><input id="login-password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} maxLength={128} minLength={mode==='register'?10:1} placeholder={mode==='register'?'至少10位，包含字母和数字':'请输入密码'} value={password} onChange={e=>setPassword(e.target.value)} required disabled={busy}/>
    {mode==='register'&&<><label htmlFor="confirm-password">确认密码</label><input id="confirm-password" type="password" autoComplete="new-password" maxLength={128} value={confirm} onChange={e=>setConfirm(e.target.value)} required disabled={busy}/>{policy?.inviteRequired&&<><label htmlFor="registration-invite">邀请码</label><input id="registration-invite" type="text" style={{width:'100%',boxSizing:'border-box'}} autoComplete="off" maxLength={64} placeholder="请输入管理员提供的一次性邀请码" value={inviteCode} onChange={e=>setInviteCode(e.target.value)} required disabled={busy}/><p className="account-help">邀请码仅在注册成功后失效，如没有邀请码请联系管理员。</p></>}<p className="account-help">{policy?.passwordRegistrationAllowed?'本站当前不要求注册短信验证。请填写自己的手机号；注册不代表已验证手机号归属。':policy?'当前注册要求短信验证，短信服务尚未接入，请联系管理员。':policyError||'正在读取注册设置…'}</p>{(policyError||policy&&!policy.passwordRegistrationAllowed)&&<button type="button" className="account-secondary" disabled={busy} onClick={()=>setReload(n=>n+1)}>重新读取</button>}</>}
    {error&&<p className="account-error" role="alert">{error}</p>}
    <button className="account-primary" disabled={busy||!account.enabled||mode==='register'&&!policy?.passwordRegistrationAllowed}>{busy?'正在处理…':mode==='login'?'登录小镇':'注册并进入小镇'}</button>
    <p className="account-help">忘记密码或旧账号尚未设置密码，请联系小镇管理员核实后处理。不能仅凭手机号重置密码。</p>
  </form>;
}
