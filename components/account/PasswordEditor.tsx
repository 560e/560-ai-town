"use client";
import {useState} from 'react';
import {accountRequest,useAccount} from './AccountProvider';
import {validatePassword} from '@/lib/password-policy';
export default function PasswordEditor(){
  const account=useAccount();const [current,setCurrent]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  if(!account.password||!account.user)return null;
  async function save(){setBusy(true);setError('');try{validatePassword(password);if(password!==confirm)throw Error('两次输入的密码不一致');await accountRequest('/api/auth/password/change',{newPassword:password,...(account.user?.hasPassword?{currentPassword:current}:{})});setCurrent('');setPassword('');setConfirm('');await account.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <form className="account-signin password-editor" onSubmit={e=>{e.preventDefault();void save();}}><h3>{account.user.hasPassword?'修改密码':'设置登录密码'}</h3>
    <p className="account-help">{account.user.hasPassword?'修改后所有设备需要重新登录。':'请在登录后15分钟内设置。设置完成后需用新密码重新登录。'}</p>
    {account.user.hasPassword&&<><label htmlFor="resident-current-password">当前密码</label><input id="resident-current-password" type="password" autoComplete="current-password" maxLength={128} value={current} onChange={e=>setCurrent(e.target.value)} required disabled={busy}/></>}
    <label htmlFor="resident-new-password">新密码</label><input id="resident-new-password" type="password" autoComplete="new-password" minLength={10} maxLength={128} placeholder="至少10位，包含字母和数字" value={password} onChange={e=>setPassword(e.target.value)} required disabled={busy}/>
    <label htmlFor="resident-confirm-password">确认新密码</label><input id="resident-confirm-password" type="password" autoComplete="new-password" maxLength={128} value={confirm} onChange={e=>setConfirm(e.target.value)} required disabled={busy}/>
    {error&&<p role="alert" className="account-error">{error}</p>}<button className="account-secondary" disabled={busy}>{busy?'正在保存…':'保存密码并重新登录'}</button>
  </form>;
}
