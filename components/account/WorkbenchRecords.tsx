"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import type {TitleConfig} from '@/lib/service';
import {TitleBadge,serviceRequest,Status,formatTime} from '@/components/service/shared';
import {IdentityChip} from './IdentityBadges';
import {residentBadge} from '@/lib/identity-display';
import {workbenchHref} from '@/lib/resident-workbench';
export type ResidentRecords={applications:{id:string;status:string;updated_at:string;snapshot:{config:TitleConfig}}[];openApplications:{id:string;status:string;name:string}[];grants:{id:string;current:TitleConfig|null;snapshot:TitleConfig;active:boolean;created_at:string;expires_at:string|null;revoked_at:string|null;revoke_reason:string|null;source:string}[];notices:{id:string;message:string;application_id:string|null;created_at:string;read_at:string|null}[];guides:{id:string;name:string}[];page:number;total:number};
export function useResidentRecords(userId:string|undefined){
 const [data,setData]=useState<ResidentRecords|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[page,setPage]=useState(1),requestId=useRef(0);
 const load=useCallback(async()=>{if(!userId)return;const id=++requestId.current;setLoading(true);setError('');try{const result=await serviceRequest(`/api/account/service?page=${page}`);if(id===requestId.current)setData(result);}catch(e){if(id===requestId.current)setError((e as Error).message);}finally{if(id===requestId.current)setLoading(false);}},[userId,page]);
 useEffect(()=>{void load();return()=>{requestId.current++;};},[load]);
 useEffect(()=>{const refresh=()=>void load();window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);},[load]);
 return {data,error,loading,page,setPage,load};
}
export function IdentityHistory({data}:{data:ResidentRecords}){
 const [filter,setFilter]=useState('active');const records=data.grants.filter(g=>filter==='history'?!g.active:g.active&&(filter==='active'||g.snapshot.kind===filter));
 return <section className="wb-card"><div className="wb-card-heading"><div><h2>已获得的身份</h2><p>荣誉记录成长，权限称号提供具体服务资格。</p></div><Link href="/service">探索更多 ↗</Link></div><div className="wb-tabs" role="group" aria-label="身份记录筛选">{[['active','有效身份'],['honor','荣誉称号'],['permission','权限称号'],['history','历史身份']].map(([id,name])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{name}</button>)}</div>
 <div className="wb-grants">{filter==='active'&&<article><div><IdentityChip badge={residentBadge}/><p>默认身份 · 可访问小镇公共区域</p></div></article>}{records.map(g=>{const config=g.current||g.snapshot;return <article key={g.id}><TitleBadge config={config}/><div><h3>{config.name}</h3><span className="wb-pill">{g.revoked_at?'已撤销':g.active?'有效':'已到期'} · {g.snapshot.kind==='honor'?'荣誉':'权限'}</span><p>获得于 {formatTime(g.created_at)} · {g.expires_at?`有效至 ${formatTime(g.expires_at)}`:'长期有效'}</p>{g.revoke_reason&&<p>撤销说明：{g.revoke_reason}</p>}{g.active&&config.kind==='permission'&&<p>{config.permissions.length?`包含${config.permissions.length}项服务资料权益`:'当前提供身份资格'}</p>}{g.active&&data.guides.filter(item=>config.permissions.includes(`guide:${item.id}:read`)).map(item=><Link className="wb-inline-link" key={item.id} href={`/service/guides/${item.id}`}>{item.name} ↗</Link>)}</div></article>;})}</div>{!records.length&&filter!=='active'&&<div className="wb-empty-small">{filter==='history'?'暂无过期或撤销的身份。':'暂无此类称号。可以前往服务中心了解已开放的身份。'}</div>}
 </section>;
}
export function ServiceRecords({records,view}:{records:ReturnType<typeof useResidentRecords>;view:string}){
 const {data,page,setPage,load,loading}=records,[busy,setBusy]=useState(false),[error,setError]=useState('');if(!data)return null;
 const tab=['applications','messages','resources'].includes(view)?view:'applications';
 const read=async(id:string)=>{setBusy(true);setError('');try{await serviceRequest('/api/account/service',{op:'read',id});await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 return <><div className="wb-tabs" aria-label="服务记录分类">{[['applications','申请记录'],['messages','服务消息'],['resources','授权资料']].map(([id,name])=><Link aria-current={tab===id?'page':undefined} key={id} href={workbenchHref('services',id)} scroll={false}>{name}</Link>)}</div><section className="wb-card">{error&&<p className="account-error" role="alert">{error}</p>}
 {tab==='applications'&&<><div className="wb-card-heading"><div><h2>我的申请</h2><p>查看办理进度，或按审批意见补充材料。</p></div><Link href="/service">前往申请 ↗</Link></div><div className="wb-record-list">{data.applications.map(a=><Link key={a.id} href={`/account/applications/${a.id}`}><div><strong>{a.snapshot.config.name}</strong><small>{formatTime(a.updated_at)}</small></div><Status value={a.status}/><span aria-hidden>↗</span></Link>)}</div>{!data.applications.length&&<div className="wb-empty-small">暂无申请记录，去服务中心看看有哪些适合你的身份。</div>}<div className="wb-pagination"><span>共 {data.total} 项 · 第 {page} 页</span><button disabled={loading||page<=1} onClick={()=>setPage(p=>p-1)}>上一页</button><button disabled={loading||page*20>=data.total} onClick={()=>setPage(p=>p+1)}>下一页</button></div></>}
 {tab==='messages'&&<><div className="wb-card-heading"><div><h2>服务消息</h2><p>最近100条消息 · {data.notices.filter(n=>!n.read_at).length}条未读</p></div></div>{data.notices.map(n=><article className={`wb-message${n.read_at?'':' unread'}`} key={n.id}><div><span className="wb-message-dot"/><p>{n.message}</p></div><small>{formatTime(n.created_at)}</small><div className="wb-message-actions">{n.application_id&&<Link href={`/account/applications/${n.application_id}`}>查看申请 ↗</Link>}{!n.read_at&&<button disabled={busy} onClick={()=>void read(n.id)}>标记已读</button>}</div></article>)}{!data.notices.length&&<div className="wb-empty-small">暂无服务消息。申请处理与身份授予通知会出现在这里。</div>}</>}
 {tab==='resources'&&<><div className="wb-card-heading"><div><h2>我可以阅读的资料</h2><p>根据当前有效的权限称号提供访问入口。</p></div></div><div className="wb-record-list">{data.guides.map(g=><Link key={g.id} href={`/service/guides/${g.id}`}><strong>{g.name}</strong><span>阅读 ↗</span></Link>)}</div>{!data.guides.length&&<div className="wb-empty-small">目前没有授权资料。可在服务中心查看公开身份及其权益。</div>}</>}
 </section></>;
}
