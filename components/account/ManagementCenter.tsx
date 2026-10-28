"use client";
import SiteFooter from "@/components/site/SiteFooter";
import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {usePathname,useSearchParams} from "next/navigation";
import {accountRequest,useAccount} from "./AccountProvider";
import ResidentAvatar from "./ResidentAvatar";
import SignIn from "./SignIn";
import {isOperator,accountRole,roleLabels} from "@/lib/roles";
import AdminPage from "./AdminPage";
import ServiceManagement from "@/components/service/ServiceManagement";
import AcademyManager from '@/components/academy/AcademyManager';
import ModerationManagement from './ModerationManagement';
import {managementSection,managementSections,type ManagementSectionId} from "@/data/management-navigation";
type Overview={counts:{total:number;active:number;suspended:number;recent:number};logs:{id:string;action:string;created_at:string;details:{reason?:string}}[];updatedAt:string};
const actions:Record<string,string>={"moderation.save":"维护敏感词","moderation.batch":"批量维护敏感词","moderation.import":"导入敏感词",register:"注册账户",login:"登录小镇","profile.update":"修改个人资料","user.ban":"停用居民账户","user.restore":"恢复居民账户","admin.grant":"管理员授权","role.update":"变更管理角色","site.update":"修改站点配置","site.restore":"恢复站点配置","site.asset":"上传站点图片","service.edit":"保存称号草稿","service.publish":"发布称号","service.apply":"办理身份申请","service.review":"审核申请","service.application.delete":"删除申请记录","service.grant":"授予称号","service.revoke":"撤销称号","service.staff":"配置服务岗位","service.content":"维护服务内容"};
const time=(value:string)=>new Date(value).toLocaleString("zh-CN");

export default function ManagementCenter(){
  const account=useAccount(),path=usePathname(),params=useSearchParams();
  const section=managementSection(params.get("section"));
  const [menuOpen,setMenuOpen]=useState(false),[data,setData]=useState<Overview|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
  const title=useRef<HTMLHeadingElement>(null),requestId=useRef(0);
  const href=(id:ManagementSectionId)=>id==="overview"?path:`${path}?section=${id}`;
  const load=useCallback(async()=>{
    const serial=++requestId.current;setLoading(true);setError("");
    try{const response=await fetch("/api/manage/overview",{cache:"no-store"});const result=await response.json();if(!response.ok)throw new Error(result.error||"暂时无法读取运营数据");if(serial===requestId.current)setData(result);}
    catch(error){if(serial===requestId.current){setError((error as Error).message);setData(null);}}
    finally{if(serial===requestId.current)setLoading(false);}
  },[]);
  useEffect(()=>{if(isOperator(account.user?.role))void load();else{++requestId.current;setData(null);}return()=>{++requestId.current;};},[account.user?.id,account.user?.role,section.id,load]);
  useEffect(()=>{setMenuOpen(false);title.current?.focus({preventScroll:true});document.querySelector(".management-content")?.scrollTo(0,0);},[section.id]);
  const logout=async()=>{setBusy(true);setError("");try{await accountRequest("/api/auth/sign-out",{});await account.refresh();setData(null);}catch(error){setError((error as Error).message);}finally{setBusy(false);}};
  const groups=[...new Set(managementSections.map(item=>item.group))];

  if(account.loading||!account.user||!isOperator(account.user.role))return <main className="account-page"><header className="account-page-header"><Link className="account-brand" href="/"><b>560</b><span>小镇运营管理中心</span></Link><Link href="/account">个人中心 ↗</Link></header><div className="account-page-body"><p className="account-eyebrow">560 AI TOWN · OPERATIONS</p><h1>小镇运营管理中心</h1><p className="account-intro">用清晰的分工，让小镇的每一天有序运转。</p>{account.loading?<p role="status">正在核验管理权限…</p>:!account.user?<section className="account-panel account-login-panel"><h2>工作人员登录</h2><p className="account-help">请使用已获得管理授权的手机号登录。</p><SignIn/></section>:<section className="account-panel"><h2>当前账户没有运营管理权限</h2><p className="account-help">你可以返回个人中心，继续探索小镇的公共空间。</p><Link className="account-primary" href="/account">返回个人中心</Link> <button className="account-secondary" disabled={busy} onClick={()=>void logout()}>退出并切换账户</button></section>}{error&&<p className="account-error" role="alert">{error}</p>}</div></main>;

  const logs=(limit:number)=>!data?<p className="management-empty">{loading?"正在读取工作记录…":"工作记录暂不可用"}</p>:!data.logs.length?<p className="management-empty">暂无工作记录</p>:<ul className="management-log">{data.logs.slice(0,limit).map(log=><li key={log.id}><span className="management-log-dot"/><div><strong>{actions[log.action]||log.action}</strong>{log.details.reason&&<p>{log.details.reason}</p>}<time dateTime={log.created_at}>{time(log.created_at)}</time></div><span>本人操作</span></li>)}</ul>;
  return <div className="management-app">
    <aside className={`management-sidebar${menuOpen?" is-open":""}`} id="management-navigation"><Link href={href("overview")} className="management-brand" onClick={()=>setMenuOpen(false)}><b>560</b><span>小镇运营管理中心<small>五六零人工智能科技</small></span></Link><nav aria-label="运营管理模块">{groups.map(group=><div className="management-nav-group" key={group}><p>{group}</p>{managementSections.filter(item=>item.group===group).map(item=><Link key={item.id} href={href(item.id)} aria-current={section.id===item.id?"page":undefined} className={section.id===item.id?"selected":""} onClick={()=>setMenuOpen(false)}><span aria-hidden="true">{item.icon}</span>{item.name}{item.status==="planned"&&<small>筹备</small>}</Link>)}</div>)}</nav><div className="management-sidebar-foot">学习 · 创业 · 生活<br/>在北海，与 AI 的未来相遇</div></aside>
    <div className="management-main"><header className="management-header"><button className="management-menu-toggle" aria-expanded={menuOpen} aria-controls="management-navigation" onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?"收起菜单":"菜单"}</button><span className="management-breadcrumb">运营管理中心 <span>/</span> {section.name}</span><div className="management-account"><Link href="/account"><ResidentAvatar id={account.user.avatar}/><span>{account.user.name}</span></Link><button disabled={busy} onClick={()=>void logout()}>退出登录</button></div></header>
    <main className="management-content"><div className="management-heading"><div><p className="account-eyebrow">560 AI TOWN · OPERATIONS</p><h1 ref={title} tabIndex={-1}>{section.id==="overview"?"小镇运营工作台":section.name}</h1><p>{section.description}</p></div><Link href="/" className="management-town-link">返回小镇 ↗</Link></div>
    {error&&<div className="account-error" role="alert">{error} <button className="account-secondary" onClick={()=>void load()} disabled={loading}>重试</button></div>}
    {section.id==="overview"?<>
      <section className="management-hero"><div><span className="management-label">运营管理中心</span><h2>把小镇的每一天，运营好。</h2><p>欢迎回来，{account.user.name}。从居民服务开始，连接小镇的学习、创业与生活。</p><Link href={href("residents")}>进入居民管理 →</Link></div><span className="management-watermark" aria-hidden="true">560</span></section>
      <div className="management-stats">{([['居民总数','total'],['正常账户','active'],['已停用账户','suspended'],['近7天新增','recent']] as const).map(([label,key])=><section key={key}><p>{label}</p><strong>{data?data.counts[key]:"—"}</strong><small>{loading?"正在更新":data?"来自本地账户数据库":"暂无可用数据"}</small></section>)}</div>
      <div className="management-columns"><section className="management-card"><div className="management-card-heading"><h2>常用工作</h2><span className="management-label">已接入</span></div><Link className="management-work-row" href={href("residents")}><span className="management-feature-icon">◎</span><div><h3>居民管理</h3><p>查询资料、查看详情、停用与恢复账户。</p></div><span>↗</span></Link><Link className="management-work-row" href={href("activity")}><span className="management-feature-icon">↺</span><div><h3>我的工作记录</h3><p>查看本人最近的账户和管理操作。</p></div><span>↗</span></Link><div className="management-notice">服务中心身份申请与审核已接入；学院课程已接入，任务业务继续分批开发；筹备模块不会显示虚构的业务数据。</div></section><section className="management-card"><div className="management-card-heading"><h2>最近操作</h2><Link href={href("activity")}>查看记录 ↗</Link></div>{logs(4)}</section></div>
      <section><div className="management-card-heading"><h2>版块管理</h2><span className="account-help">场景已搭建 · 管理业务分批接入</span></div><div className="management-districts">{managementSections.filter(item=>item.group==="版块管理").map(item=><Link key={item.id} href={href(item.id)}><span className="management-feature-icon">{item.icon}</span><span className={`management-label ${item.status==="live"?"":"pending"}`}>{item.status==="live"?"已接入":"筹备中"}</span><h3>{item.name}</h3><p>{item.description}</p><small>查看模块范围 →</small></Link>)}</div></section>
    </>:section.id==="learning-campus"?<AcademyManager/>:section.id==="moderation"?<ModerationManagement/>:section.id==="civic-hall"?<ServiceManagement/>:section.id==="residents"?<AdminPage embedded/>:section.id==="activity"?<section className="management-card"><div className="management-card-heading"><h2>最近30条本人记录</h2><button className="account-secondary" onClick={()=>void load()} disabled={loading}>刷新记录</button></div>{logs(30)}</section>:<section className="management-card management-pending"><span className="management-feature-icon">{section.icon}</span><span className="management-label pending">管理业务筹备中</span><h2>{section.name}</h2><p>{section.description}</p><div className="management-module-tabs"><span>基础内容</span><span>业务管理</span><span>操作记录</span></div><div className="management-notice">该模块已纳入运营中心导航，编辑、保存与发布功能尚未接入。现有小镇场景和内容继续正常展示。</div><p className="account-help">已开放的居民查询、账户处理和工作记录，可直接通过左侧菜单使用。</p><Link href={href("overview")} className="account-secondary">返回运营概览</Link></section>}
    <SiteFooter className="management-footer"/></main></div>
  </div>;
}
