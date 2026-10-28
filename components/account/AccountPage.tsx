"use client";
import {useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {residentModules,residentSection,workbenchHref,type ResidentSection} from '@/lib/resident-workbench';
import {districtOptions} from '@/lib/service';
import {useAccount} from './AccountProvider';
import AcademyWorkbench from '@/components/academy/AcademyWorkbench';
import AccountProfile from './AccountProfile';
import IdentityDisplayEditor from './IdentityDisplayEditor';
import {IdentityBadges} from './IdentityBadges';
import {useResidentRecords,IdentityHistory,ServiceRecords} from './WorkbenchRecords';
import ResidentAvatar from './ResidentAvatar';
import Icon from './WorkbenchIcon';
import SignIn from './SignIn';
import TownReturnLink from '@/components/town/TownReturnLink';
import SiteFooter from '@/components/site/SiteFooter';
import SiteBrand from '@/components/site/SiteBrand';
import {formatTime} from '@/components/service/shared';

function ResidentWorkbench(){
 const account=useAccount(),user=account.user!,query=useSearchParams(),section=residentSection(query.get('section')),view=query.get('view')||'',module=residentModules.find(m=>m.id===section)!;
 const records=useResidentRecords(user.id),{data,loading,error,load}=records;
 const [menu,setMenu]=useState(false),[visited,setVisited]=useState<Set<ResidentSection>>(()=>new Set([section])),scrollArea=useRef<HTMLDivElement>(null),heading=useRef<HTMLHeadingElement>(null),previous=useRef(section);
 useEffect(()=>{setMenu(false);scrollArea.current?.scrollTo({top:0,behavior:"instant"});setVisited(old=>new Set([...old,section]));if(previous.current!==section){heading.current?.focus({preventScroll:true});previous.current=section;void load();}},[section,load]);
 const open=data?.openApplications||[],returned=open.filter(a=>a.status==='returned'),pending=open.filter(a=>a.status==='pending'),drafts=open.filter(a=>a.status==='draft'),unread=data?.notices.filter(n=>!n.read_at)||[];
 return <div className="resident-workbench" ref={scrollArea}>
  <aside className={`wb-sidebar${menu?' is-open':''}`}><TownReturnLink className="wb-brand"><SiteBrand/></TownReturnLink><div className="wb-space-label"><span/> 居民工作台 <small>MY TOWN</small></div>
   <button className="wb-menu-toggle" aria-expanded={menu} aria-controls="resident-navigation" onClick={()=>setMenu(!menu)}><Icon name="menu"/><span>{module.name}</span><span>{menu?'收起':'切换模块'}</span></button>
   <nav id="resident-navigation" aria-label="居民工作台模块">{residentModules.map((m,i)=><div key={m.id}>{(i===0||residentModules[i-1].group!==m.group)&&<p className="wb-nav-group">{m.group}</p>}<Link href={workbenchHref(m.id)} scroll={false} aria-current={section===m.id?'page':undefined}><Icon name={m.icon}/><span>{m.name}</span>{'areas' in m&&m.id!=='learning'&&<small>筹备</small>}{m.id==='services'&&unread.length>0&&<b>{unread.length>99?'99+':unread.length}</b>}</Link></div>)}</nav>
   <div className="wb-sidebar-bottom">{user.managementPath&&<Link href={user.managementPath}>运营管理中心 <span>↗</span></Link>}{user.systemPath&&<Link href={user.systemPath}>系统管理后台 <span>↗</span></Link>}<TownReturnLink><Icon name="back"/>返回小镇</TownReturnLink><p>学习 · 创业 · 生活</p></div>
  </aside>
  <div className="wb-body"><header className="wb-topbar"><div><span>居民工作台</span><span className="wb-breadcrumb"> / {module.name}</span></div><div><Link className="wb-top-notifications" href={workbenchHref('services','messages')} aria-label={`服务消息${unread.length?`，${unread.length}条未读`:''}`}><Icon name="bell"/>{unread.length>0&&<i/>}</Link><Link className="wb-top-user" href={workbenchHref('settings')}><ResidentAvatar id={user.avatar}/><span>{user.name}</span></Link></div></header>
   <main className="wb-content"><div className="wb-page-heading"><div><p className="wb-eyebrow">560 AI TOWN · MY SPACE</p><h1 ref={heading} tabIndex={-1}>{module.name}</h1><p>{module.description}</p></div><TownReturnLink className="wb-town-link">游览小镇 <Icon name="arrow"/></TownReturnLink></div>
    {error&&<div className="wb-error" role="alert">{error}<button disabled={loading} onClick={()=>void load()}>重新读取</button></div>}
    {section==='overview'&&<>
     <section className="wb-welcome"><div className="wb-welcome-copy"><span className="wb-pill">我的居民名片</span><h2>你好，{user.name}</h2><p>在这里，让学习、创意与新的伙伴相遇。</p><div className="wb-personal-badges"><IdentityBadges badges={account.badges} compact/>{!account.badges.length&&<span>可在“我的身份”设置公开展示的标签</span>}</div><Link href={workbenchHref('identities')}>管理我的身份 <span>↗</span></Link></div><div className="wb-welcome-art" aria-hidden="true"><div className="wb-art-ring"/><div className="wb-art-card"><ResidentAvatar id={user.avatar}/><b>560</b><small>AI TOWN RESIDENT</small></div><span className="wb-art-dot"/></div></section>
     <div className="wb-stats">{[{title:'有效身份',value:data?data.grants.filter(g=>g.active).length+1:'—',note:'含默认小镇居民身份',href:workbenchHref('identities'),icon:'badge'}, {title:'需要我处理',value:data?returned.length+drafts.length:'—',note:'待补充材料及未提交申请',href:workbenchHref('services'),icon:'task'}, {title:'等待审核',value:data?pending.length:'—',note:'等待服务中心处理',href:workbenchHref('services'),icon:'service'}].map(s=><Link className="wb-stat" key={s.title} href={s.href}><span className="wb-stat-icon"><Icon name={s.icon}/></span><div><span>{s.title}</span><strong>{s.value}</strong><small>{s.note}</small></div><span className="wb-stat-arrow">↗</span></Link>)}</div>
     <div className="wb-overview-grid"><section className="wb-card"><div className="wb-card-heading"><div><h2>我的待办</h2><p>需要关注的事项，都在这里。</p></div><Link href={workbenchHref('services')}>全部申请 ↗</Link></div>{!data?<p className="wb-empty-small" role="status">{error?'暂时无法读取待办。':'正在读取待办…'}</p>:returned.length+drafts.length?<div className="wb-record-list">{[...returned,...drafts].slice(0,4).map(a=><Link key={a.id} href={`/account/applications/${a.id}`}><div><strong>{a.name||'身份申请'}</strong><small>{a.status==='returned'?'需要补充材料':'草稿尚未提交'}</small></div><span>处理 ↗</span></Link>)}</div>:<div className="wb-clear-state"><span><Icon name="check"/></span><h3>暂时没有待办</h3><p>继续探索小镇，了解适合你的新身份。</p><Link href="/service">逛逛服务中心 ↗</Link></div>}</section>
     <section className="wb-card"><div className="wb-card-heading"><div><h2>最近消息</h2><p>申请进度与身份更新。</p></div><Link href={workbenchHref('services','messages')}>全部消息 ↗</Link></div>{data?.notices.length?<div className="wb-recent-messages">{data.notices.slice(0,3).map(n=><Link href={n.application_id?`/account/applications/${n.application_id}`:workbenchHref('services','messages')} key={n.id}><i className={n.read_at?'':'unread'}/><div><p>{n.message}</p><small>{formatTime(n.created_at)}</small></div></Link>)}</div>:<div className="wb-empty-small">{!data?(error?'暂时无法读取消息。':'正在读取消息…'):'暂无新消息。服务办理结果会在这里通知你。'}</div>}</section></div>
     <section className="wb-card"><div className="wb-card-heading"><div><h2>继续探索</h2><p>{data?.guides.length?'你的可用资料与常用入口。':'从服务中心了解身份，从小镇发现下一站。'}</p></div></div><div className="wb-shortcuts"><Link href="/service"><Icon name="service"/><div><b>申请身份与服务</b><small>了解已开放的称号和权益</small></div><span>↗</span></Link><Link href={workbenchHref('identities')}><Icon name="badge"/><div><b>设置展示身份</b><small>昵称下方最多展示6个身份</small></div><span>↗</span></Link>{data?.guides.length?<Link href={workbenchHref('services','resources')}><Icon name="book"/><div><b>阅读授权资料</b><small>{data.guides.length}项资料可访问</small></div><span>↗</span></Link>:<Link href={workbenchHref('learning')}><Icon name="book"/><div><b>了解AI学院</b><small>浏览课程目录与站外学习入口</small></div><span>↗</span></Link>}</div></section>
    </>}
    {section==='learning'&&<AcademyWorkbench initialView="mine"/>}
    {'areas' in module&&section!=='learning'&&<><section className="wb-future-hero"><div className="wb-future-icon"><Icon name={module.icon}/></div><span className="wb-pill">功能筹备中</span><h2>{module.name}，即将从这里开始</h2><p>这里将集中展示你参与的记录与可使用的功能。当前可先了解板块介绍，或前往服务中心探索已开放的身份。</p><div>{module.districts.map(id=><Link className="account-primary" key={id} href={`/districts/${id}`}>了解{districtOptions.find(([key])=>key===id)?.[1]} ↗</Link>)}<Link className="account-secondary" href="/service">前往服务中心</Link></div></section><div className="wb-future-grid">{module.areas.map(([name,description],i)=><article className="wb-card" key={name}><div><span className="wb-feature-number">0{i+1}</span><span className="wb-pill">筹备中</span></div><h3>{name}</h3><p>{description}</p></article>)}</div>{module.id==='enterprise'&&<p className="wb-footnote">企业成员身份与荣誉称号分别管理，企业信息仅向有资格的成员开放。</p>}</>}
    {section==='services'&&<>{!data&&!error&&<p role="status">正在读取服务记录…</p>}<ServiceRecords records={records} view={view}/></>}
    <div hidden={section!=='identities'}>{(visited.has('identities')||section==='identities')&&<><IdentityDisplayEditor/>{section==='identities'&&data&&<IdentityHistory data={data}/>}</>}</div>
    <div hidden={section!=='settings'}>{(visited.has('settings')||section==='settings')&&<AccountProfile/>}</div>
   </main><SiteFooter className="wb-footer"/>
  </div>
 </div>;
}
export default function AccountPage(){const account=useAccount();if(account.user)return <ResidentWorkbench key={account.user.id}/>;return <main className="wb-login-page"><TownReturnLink><SiteBrand/></TownReturnLink><section className="wb-card"><p className="wb-eyebrow">WELCOME TO YOUR TOWN</p><h1>开启你的小镇生活</h1><p>一个账户，连接学习、共创与每一个新的可能。</p>{account.loading?<p role="status">正在读取账户…</p>:<SignIn/>}<TownReturnLink className="wb-login-return">先游览小镇 ↗</TownReturnLink></section><SiteFooter/></main>;}

