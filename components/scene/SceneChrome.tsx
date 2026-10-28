"use client";
import {useEffect,useId,useRef,type ReactNode} from 'react';
import {useSite} from '@/components/site/SiteProvider';

export function SceneIcon({name}:{name:'map'|'walk'|'chat'|'view'|'back'|'more'|'user'|'board'|'folder'|'camera'}){
 const paths={map:'m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16',walk:'m9 21 3-7 4 7M7 13l3-6 4 1 3 5 3 1M12 8v6l-5 4M13 3h.01',chat:'M21 11a8 8 0 0 1-8 8H6l-4 3V11a9 9 0 0 1 19 0ZM7 10h9m-9 4h6',view:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',back:'m10 5-7 7 7 7M3 12h18',more:'M5 6h14M5 12h14M5 18h14',user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',board:'M4 3h16v15H4V3Zm4 5h8m-8 5h8M8 18v3m8-3v3',folder:'M3 5h7l2 3h9v12H3V5Zm4 8h10m-10 3h6',camera:'M3 7h4l2-3h6l2 3h4v14H3V7Zm13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0'};
 return <svg className="scene-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}

export function SceneHeader({title,subtitle,status,actions,flow=false}:{title:string;subtitle?:string;status?:ReactNode;actions:ReactNode;flow?:boolean}){
 const {settings}=useSite(),Heading=flow?'strong':'h1';
 return <header className={`scene-header${flow?' scene-header-flow':''}`}>
  <div className="scene-identity"><span className="scene-logo">{settings.brand.logo?<img src={settings.brand.logo} alt="公司Logo"/>:'560'}</span><div className="scene-heading"><span className="scene-brand-name">{settings.brand.text}</span><Heading className="scene-title">{title}</Heading>{subtitle&&<span className="scene-subtitle">{subtitle}</span>}</div>{status&&<div className="scene-status">{status}</div>}</div>
  <nav className="scene-account-actions" aria-label="场景通用入口">{actions}</nav>
 </header>;
}

export function SceneDock({children,label='场景操作'}:{children:ReactNode;label?:string}){
 return <nav className="scene-dock" aria-label={label}>{children}</nav>;
}

// Keep children mounted so closing settings never restarts audio or loses its level.
export function ScenePanel({open,title,onClose,children,returnToScene=false,wide=false,className='',bodyClassName='',subtitle='五六零 · AI 小镇',onBack}:{wide?:boolean;className?:string;bodyClassName?:string;subtitle?:string;onBack?:()=>void;open:boolean;title:string;onClose:()=>void;children:ReactNode;returnToScene?:boolean}){
 const id=useId(),box=useRef<HTMLDivElement>(null),close=useRef<HTMLButtonElement>(null),returnTo=useRef<HTMLElement|null>(null),closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{if(!open)return;returnTo.current=document.activeElement as HTMLElement;close.current?.focus();return()=>{requestAnimationFrame(()=>{if(Array.from(document.querySelectorAll<HTMLElement>('[aria-modal="true"],dialog[open]')).some(el=>el!==box.current&&el.getClientRects().length))return;const target=returnTo.current;if(!returnToScene&&target?.isConnected&&!target.closest('[inert],[hidden]'))target.focus();else document.querySelector<HTMLElement>('[aria-label="五六零AI小镇三维场景"], [aria-label="服务中心3D互动大厅"] canvas, [aria-label="学院3D互动校园"] canvas, .academy-hall-page canvas')?.focus();});};},[open,returnToScene]);
 return <div className="scene-panel-shade" hidden={!open} onClick={e=>{if(e.target===e.currentTarget)closeRef.current();}}><div ref={box} className={`scene-panel${wide?" scene-panel-wide":""} ${className}`} role="dialog" aria-modal="true" aria-labelledby={id} onKeyDown={e=>{
  e.stopPropagation();if(e.key==='Escape'){e.preventDefault();closeRef.current();}
  if(e.key==='Tab'){const nodes=Array.from(box.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]')||[]).filter(el=>el.getClientRects().length&&!el.closest('[inert],[hidden]'));if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
 }}><header>{onBack&&<button type="button" className="scene-panel-back" onClick={onBack} aria-label="返回上一级">‹</button>}<div><small>{subtitle}</small><h2 id={id}>{title}</h2></div><button type="button" ref={close} onClick={onClose} aria-label={`关闭${title}`}>×</button></header><div className={`scene-panel-body ${bodyClassName}`}>{children}</div></div></div>;
}
