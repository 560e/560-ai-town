"use client";
import {useCallback,useEffect,useState} from 'react';
import {ServiceLink as Link} from './ServicePanelContext';
import {useAccount} from '@/components/account/AccountProvider';
import {districtOptions,type PublicTitle,type ServiceContent} from '@/lib/service';
import {TitleBadge,serviceRequest} from './shared';
import ServiceShell from './ServiceShell';
import ServiceFilterSelect,{type FilterOption} from './ServiceFilterSelect';
type BoardData={titles:PublicTitle[];content:ServiceContent;guides:{id:string;name:string}[];filters:{categories:FilterOption[];districts:FilterOption[]}};
export default function ServiceBoard({initialKind='all'}:{initialKind?:'all'|'honor'|'permission'}){
 const account=useAccount(),[data,setData]=useState<BoardData|null>(null),[error,setError]=useState(''),[q,setQ]=useState(''),[kind,setKind]=useState(initialKind as string),[category,setCategory]=useState('all'),[district,setDistrict]=useState('all'),[selected,setSelected]=useState<PublicTitle|null>(null),[mine,setMine]=useState<{openApplications:{title_id:string;status:string}[];grants:{title_id:string;active:boolean}[]}|null>(null);
 const load=useCallback(()=>{setError('');void serviceRequest('/api/service').then((next:BoardData)=>{setData(next);setCategory(current=>next.filters.categories.some(c=>c.id===current)?current:'all');setDistrict(current=>next.filters.districts.some(d=>d.id===current)?current:'all');setSelected(current=>next.titles.find(t=>t.id===current?.id)||null);}).catch(e=>setError(e.message));},[]);
 useEffect(()=>{load();window.addEventListener('focus',load);return()=>window.removeEventListener('focus',load);},[load]);
 useEffect(()=>{setMine(null);if(account.user)void serviceRequest('/api/account/service').then(setMine).catch(()=>{});},[account.user?.id]);
 const titles=data?.titles.filter(t=>(kind==='all'||t.config.kind===kind)&&(category==='all'||t.config.category===category)&&(district==='all'||t.config.district===district)&&(`${t.config.name} ${t.config.summary}`).includes(q.trim()))||[];
 const filtering=!!q||category!=='all'||district!=='all'||kind!=='all';
 const reset=()=>{setQ('');setCategory('all');setDistrict('all');setKind('all');};
 const status=(t:PublicTitle)=>mine?.grants.some(g=>g.title_id===t.id&&g.active)?'已获得':mine?.openApplications.some(a=>a.title_id===t.id&&['pending','returned','draft'].includes(a.status))?'查看办理进度':!t.config.accepting?'了解获得方式':account.user?'了解并申请':'了解称号 · 登录后申请';
 return <ServiceShell><section className="service-hero"><div><span className="service-eyebrow">560 · SERVICE CENTRE</span><h1>五六零AI服务中心</h1><p>{data?.content.intro||'了解小镇身份，开启你的学习与共创之旅。'}</p><div className="service-hero-actions"><a href="#identity-board">探索身份称号 ↓</a><Link href="/account/applications">我的办理进度 ↗</Link></div></div><div className="service-house" aria-hidden="true"><span>560</span><i/><i/><i/><b>AI服务中心</b></div></section>
  {error&&<p className="account-error" role="alert">{error} <button onClick={load}>重新读取</button></p>}
  <div className="service-board-layout"><section id="identity-board"><div className="service-section-heading"><div><span className="service-eyebrow">IDENTITY & OPPORTUNITIES</span><h2>身份与服务展示板</h2></div><span aria-live="polite">{data?`${titles.length} 项公开称号`:'正在读取…'}</span></div>
   <div className="service-board-filters">
    <label className="service-filter-search"><span className="service-filter-label">搜索称号</span><span className="service-search-control"><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg><input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="搜索名称或介绍" maxLength={60}/></span></label>
    <ServiceFilterSelect label="称号分类" value={category} options={[{id:'all',name:'全部分类'},...(data?.filters.categories||[])]} onChange={setCategory} disabled={!data}/>
    <ServiceFilterSelect label="开放版块" value={district} options={[{id:'all',name:'全部开放版块'},...(data?.filters.districts||[])]} onChange={setDistrict} disabled={!data}/>
   </div>
   <div className="service-filter-summary"><span>{kind==='all'?'探索适合你的身份与服务':`当前展示：${kind==='honor'?'荣誉称号':'权限称号'}`}</span>{filtering&&<button onClick={reset}>清除筛选 · 查看全部</button>}</div>
   <div className="service-cards">{titles.map(title=><article key={title.id} className="service-title-card"><div className="service-card-top"><TitleBadge config={title.config}/><span className="service-tag">{title.config.kind==='honor'?'荣誉称号':'权限称号'}{title.config.featured?' · 推荐':''}</span></div><h3>{title.config.name}</h3><p>{title.config.summary}</p><small>{data?.filters.categories.find(c=>c.id===title.config.category)?.name||'未分类'} · {districtOptions.find(([id])=>id===title.config.district)?.[1]} · {title.config.days?`${title.config.days}天`:'长期有效'}</small><div className="service-card-actions"><Link href={`/service/titles/${title.id}`}>{status(title)} ↗</Link><button onClick={()=>setSelected(title)}>请向导介绍</button></div></article>)}</div>
   {data&&!titles.length&&<div className="service-empty"><span>◇</span><h3>{data.titles.length?'没有符合筛选条件的称号':'服务展示板正在准备中'}</h3><p>{data.titles.length?'换个关键词、分类或版块再看看。':'工作人员公开发布称号并开放对应版块后，将在这里展示。'}</p></div>}
  </section><aside className="service-guide"><div className="service-guide-person" aria-hidden="true"><span>●</span><b>560</b></div><span className="service-tag">服务向导 · 小零</span><h2>{selected?`了解「${selected.config.name}」`:'很高兴为你介绍小镇'}</h2><p className="service-prose" aria-live="polite">{selected?(selected.config.npc||selected.config.summary):data?.content.welcome||'请稍等，正在读取服务介绍。'}</p>{selected&&<><p>{selected.config.kind==='honor'?'这是用于展示贡献与成就的荣誉称号。':'这是提供业务资格的权限称号。'}{selected.config.accepting?'你可以查看条件后提交申请。':'这个称号由工作人员定向授予。'}</p>{selected.config.conditions&&<p className="service-prose">{selected.config.conditions}</p>}<Link className="account-primary" href={`/service/titles/${selected.id}`}>查看条件与权益</Link><button className="service-text-button" onClick={()=>setSelected(null)}>介绍其他称号</button></>}<small>向导介绍来自已发布的服务配置。</small></aside></div>
  {data&&<section className="service-explain"><div><h2>办理说明</h2><p className="service-prose">{data.content.faq}</p></div><div><h2>公开服务资料</h2>{data.guides.length?data.guides.map(guide=><Link className="service-resource-link" key={guide.id} href={`/service/guides/${guide.id}`}>{guide.name} ↗</Link>):<p>暂无公开资料。</p>}</div></section>}
 </ServiceShell>;
}
