"use client";
import {useCallback,useEffect,useState} from 'react';
import InvitationManager from './InvitationManager';
import {accountRequest} from './AccountProvider';
import type {RegistrationAccess} from '@/lib/registration-policy';
type Snapshot=RegistrationAccess&{version:number;updatedAt:string;actor:string|null};
export default function RegistrationSettingsEditor(){
  const [record,setRecord]=useState<Snapshot|null>(null),[required,setRequired]=useState(false),[inviteRequired,setInviteRequired]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const read=useCallback(async()=>{const r=await fetch('/api/system/registration',{cache:'no-store'}),data=await r.json();if(!r.ok)throw Error(data.error||'无法读取注册设置');setRecord(data);setRequired(data.smsRequired);setInviteRequired(data.inviteRequired);},[]);
  useEffect(()=>{void read().catch(e=>setError(e.message));},[read]);
  const dirty=!!record&&(required!==record.smsRequired||inviteRequired!==record.inviteRequired);
  useEffect(()=>{if(!dirty)return;const unload=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};const navigate=(e:MouseEvent)=>{if((e.target as HTMLElement).closest('a[href]')&&!window.confirm('注册设置尚未保存，确定离开吗？')){e.preventDefault();e.stopPropagation();}};window.addEventListener('beforeunload',unload);document.addEventListener('click',navigate,true);return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',navigate,true);};},[dirty]);
  const reload=async()=>{if(dirty&&!window.confirm('重新读取会替换尚未保存的设置，继续吗？'))return;setBusy(true);setError('');try{await read();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const save=async()=>{if(!record)return;setBusy(true);setError('');setNotice('');try{const result=await accountRequest('/api/system/registration',{version:record.version,smsRequired:required,inviteRequired},'PATCH');setRecord({...record,version:result.version,smsRequired:required,inviteRequired,passwordRegistrationAllowed:!required});setNotice('注册设置已保存，新的注册请求立即使用此规则。已有账号和登录方式不变。');try{await read();}catch{setError('保存成功，但重新读取失败，请稍后刷新。');}}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  return <section className="account-panel system-panel" aria-label="账号与注册设置"><h2>账号与注册设置</h2><p className="account-help">控制新居民注册是否需要邀请码或短信验证。不会修改已有账号的身份、密码或手机验证状态。</p>
    <div className="management-notice"><strong>短信服务：{record?.smsConfigured?'已接入':'尚未接入'}</strong><p>当前先使用手机号＋密码注册，手机归属标记为未验证。真实短信接入并验收后才能开启验证，不会用测试验证码代替真实短信。</p></div>
    {record?<><label className="registration-switch"><span><strong>注册时要求短信验证</strong><small>{required?'新注册必须验证手机号':'关闭：手机号＋密码注册，默认成为小镇居民'}</small></span><input type="checkbox" role="switch" aria-describedby="registration-sms-help" checked={required} disabled={busy||(!record.smsConfigured&&!required)} onChange={e=>{setRequired(e.target.checked);setNotice('');}}/></label><label className="registration-switch"><span><strong>注册时要求邀请码</strong><small>开启后，新居民必须使用有效的一次性邀请码；已有账号登录不受影响。</small></span><input type="checkbox" role="switch" aria-label="注册时要求邀请码" checked={inviteRequired} disabled={busy} onChange={e=>{setInviteRequired(e.target.checked);setNotice('');}}/></label><p id="registration-sms-help" className="account-help">{!record.smsConfigured?'真实短信服务未配置，暂不能开启。已有账号仍使用密码登录。':'开启后新注册需要短信验证码和密码。'}</p><p className="account-help">配置版本 {record.version} · {new Date(record.updatedAt).toLocaleString('zh-CN')} · {record.actor||'系统初始化'}</p></>:!error&&<p role="status">正在读取注册设置…</p>}
    {error&&<p className="account-error" role="alert">{error}</p>}{notice&&<p className="system-notice" role="status">{notice}</p>}<div className="system-actions"><button className="account-primary" disabled={busy||!dirty} onClick={()=>void save()}>{busy?'正在处理…':'保存注册设置'}</button><button className="account-secondary" disabled={busy} onClick={()=>void reload()}>重新读取</button></div>
    <InvitationManager/>
  </section>;
}
