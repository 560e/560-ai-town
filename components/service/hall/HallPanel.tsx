"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import ServiceBoard from '../ServiceBoard';
import {ScenePanel} from '@/components/scene/SceneChrome';
import {navigatePanel,backPanel,type PanelHistory} from '../panel-navigation';
import './service-panel.css';
import ApplyTitle from '../ApplyTitle';
import MyService from '../MyService';
import ApplicationDetail from '../ApplicationDetail';
import ServiceGuide from '../ServiceGuide';
import {ServicePanelContext,servicePanelPath,type ServicePanelView} from '../ServicePanelContext';
import type {ServiceContent} from '@/lib/service';
export default function HallPanel({initial,content,onClose,pendingChat=false}:{initial:ServicePanelView;content:ServiceContent;onClose:()=>void;pendingChat?:boolean}){
 const [history,setHistory]=useState<PanelHistory<ServicePanelView>>({current:initial,past:[]}),view=history.current;
 const [confirm,setConfirm]=useState<null|{view?:ServicePanelView;back?:boolean}>(null),[working,setWorking]=useState(false),dirty=useRef(false),busy=useRef(false),body=useRef<HTMLDivElement>(null);
 const change=useCallback((next?:ServicePanelView,back=false)=>{if(back)setHistory(backPanel);else if(next)setHistory(current=>navigatePanel(current,next));else onClose();},[onClose]);
 const canLeave=useCallback((next?:ServicePanelView,back=false)=>{if(busy.current){setWorking(true);return;}if(dirty.current){setConfirm({view:next,back});return;}change(next,back);},[change]);
 const context=useMemo(()=>({navigate:(path:string,saved=false)=>{const next=servicePanelPath(path);if(!next)return false;if(saved){dirty.current=false;busy.current=false;setHistory(current=>navigatePanel(current,next,true));}else canLeave(next);return true;},setDirty:(value:boolean)=>{dirty.current=value;},setBusy:(value:boolean)=>{busy.current=value;if(!value)setWorking(false);}}),[canLeave]);
 useEffect(()=>{const scroll=body.current?.closest('.scene-panel-body');scroll?.scrollTo(0,0);setWorking(false);},[view]);
 useEffect(()=>{if(confirm||working){body.current?.closest('.scene-panel-body')?.scrollTo(0,0);body.current?.parentElement?.querySelector<HTMLButtonElement>('.hall-leave-confirm button')?.focus();}},[confirm,working]);
 useEffect(()=>{const unload=(e:BeforeUnloadEvent)=>{if(dirty.current||busy.current)e.preventDefault();};window.addEventListener('beforeunload',unload);return()=>window.removeEventListener('beforeunload',unload);},[]);
 const key=view.type+('id'in view?view.id:'kind'in view?view.kind:'');
 return <ScenePanel open title={view.type==='intro'?'接待与办理':view.type==='mine'?'我的办理':view.type==='application'?'申请详情':view.type==='title'?'称号与申请':view.type==='guide'?'服务资料':'身份展示板'} subtitle="560 · SERVICE CENTRE" className="service-scene-panel" bodyClassName="hall-dialog-content" wide returnToScene onClose={()=>canLeave()} onBack={history.past.length?()=>canLeave(undefined,true):undefined}>
  {pendingChat&&<p className="hall-dialog-notice" role="status">收到私聊邀请，关闭当前窗口后可处理；邀请可能自动过期。</p>}
  {working&&<p className="hall-dialog-notice" role="status">正在保存，请等待处理完成。</p>}
  {confirm&&<div className="hall-leave-confirm" role="alert"><p>申请资料还没有保存。要先留下继续填写，还是放弃修改？</p><button onClick={()=>setConfirm(null)}>继续填写</button><button onClick={()=>{dirty.current=false;const next=confirm;setConfirm(null);change(next.view,next.back);}}>放弃修改并离开</button></div>}
  <div ref={body} inert={!!confirm}>
   <ServicePanelContext.Provider value={context}>
    {view.type==='intro'?<div className="hall-welcome-panel"><div className="service-guide-person" aria-hidden="true"><span>●</span><b>560</b></div><span className="service-eyebrow">你的服务向导 · 小零</span><h3>欢迎来到服务大厅</h3><p className="service-prose">{content.welcome}</p><div className="hall-intro-options"><button onClick={()=>canLeave({type:'board',kind:'permission'})}><b>了解权限称号 ↗</b><span>找到适合你的身份与服务</span></button><button onClick={()=>canLeave({type:'board',kind:'honor'})}><b>了解荣誉称号 ↗</b><span>了解贡献与成长的荣誉</span></button><button onClick={()=>canLeave({type:'mine'})}><b>查看我的办理 ↗</b><span>身份、申请进度与消息</span></button></div><h4>办理说明</h4><p className="service-prose">{content.faq}</p></div>:view.type==='board'?<ServiceBoard key={key} initialKind={view.kind}/>:view.type==='title'?<ApplyTitle key={key} id={view.id}/>:view.type==='mine'?<MyService/>:view.type==='application'?<ApplicationDetail key={key} id={view.id}/>:<ServiceGuide key={key} id={view.id}/>}
   </ServicePanelContext.Provider>
  </div>
 </ScenePanel>;
}
