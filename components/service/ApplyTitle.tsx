"use client";
import {useEffect,useState} from 'react';
import {ServiceLink as Link} from './ServicePanelContext';
import {useServiceNavigation,useServiceFormState} from './ServicePanelContext';
import {useAccount} from '@/components/account/AccountProvider';
import SignIn from '@/components/account/SignIn';
import type {PublicTitle} from '@/lib/service';
import {TitleInfo,ApplicationFields,serviceRequest} from './shared';
import ServiceShell from './ServiceShell';
export default function ApplyTitle({id}:{id:string}){
  const account=useAccount(),navigate=useServiceNavigation(),[title,setTitle]=useState<PublicTitle|null>(null),[error,setError]=useState(''),[answers,setAnswers]=useState<Record<string,string|string[]>>({}),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[existing,setExisting]=useState<{id:string;status:string}|null>(null),[owned,setOwned]=useState(false);
  useEffect(()=>{void serviceRequest(`/api/service/titles/${id}`).then(data=>setTitle(data.titles[0])).catch(e=>setError(e.message));},[id]);
  useEffect(()=>{setExisting(null);setOwned(false);if(account.user)void serviceRequest('/api/account/service').then(data=>{setExisting(data.openApplications.find((a:{title_id:string;status:string})=>a.title_id===id&&['draft','pending','returned'].includes(a.status))||null);setOwned(data.grants.some((g:{title_id:string;active:boolean})=>g.title_id===id&&g.active));}).catch(e=>setError(e.message));},[account.user?.id,id]);
  useServiceFormState(Object.keys(answers).length>0||confirmed,busy);
  const save=async(submit:boolean)=>{if(!title)return;setBusy(true);setError('');try{const result=await serviceRequest('/api/account/service',{op:submit?'submit':'draft',titleId:id,answers,termsVersion:title.version,confirmTerms:confirmed});navigate(`/account/applications/${result.id}`,true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  return <ServiceShell><Link className="service-back" href="/service">← 返回身份展示板</Link>{error&&<p className="account-error" role="alert">{error}</p>}{!title?<p>正在读取称号；若该称号未公开，请返回展示板。</p>:<div className="service-apply-layout"><section className="service-panel"><TitleInfo config={title.config} benefits={title.benefits}/></section><section className="service-panel"><h2>{owned?'你已获得此称号':existing?'你已有办理记录':'办理申请'}</h2>{account.loading?<p>正在核验账户…</p>:!account.user?<><p>游客可以了解服务，登录后即可办理。登录后会留在当前事项。</p><SignIn/></>:owned?<Link className="account-primary" href="/account/applications">查看我的身份与权益</Link>:existing?<Link className="account-primary" href={`/account/applications/${existing.id}`}>继续办理 / 查看进度</Link>:!title.config.accepting?<p>当前仅展示介绍，由工作人员定向授予或等待申请开放。</p>:<><p className="account-help">申请账户：{account.user.name} · {account.user.phone}。手机号与账户关联，无需重复填写。</p><ApplicationFields fields={title.config.fields} answers={answers} onChange={setAnswers} disabled={busy}/>{!title.config.fields.length&&<p>此事项无需额外填写资料，请确认条件后提交。</p>}<label className="service-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={busy}/>我已确认当前申请条件、权益和有效期限。</label><div className="system-actions"><button className="account-secondary" disabled={busy} onClick={()=>void save(false)}>保存草稿</button><button className="account-primary" disabled={busy||!confirmed} onClick={()=>void save(true)}>{busy?'正在处理…':'确认提交申请'}</button></div></>}</section></div>}</ServiceShell>;
}
