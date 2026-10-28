"use client";
import {useEffect,useState} from 'react';
import {activeBadges,badgeBackground,type IdentityBadge} from '@/lib/identity-display';
export function IdentityChip({badge}:{badge:IdentityBadge}){return <span className="identity-chip" title={badge.name} style={{background:badgeBackground(badge.style),color:badge.style.text,borderColor:badge.style.border}}>{badge.name}</span>;}
export function IdentityBadges({badges,compact=false}:{badges:IdentityBadge[];compact?:boolean}){
 const [expanded,setExpanded]=useState(false),[now,setNow]=useState(()=>Date.now());
 useEffect(()=>{if(!badges.some(b=>b.expiresAt))return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[badges]);
 const active=activeBadges(badges,now),more=compact&&active.length>6,open=expanded;
 if(!active.length)return null;
 return <div className={`identity-badges${compact?' is-compact':''}`} onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()} onDoubleClick={e=>e.stopPropagation()} onWheel={e=>e.stopPropagation()} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){setExpanded(false);}}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)){setExpanded(false);}}}>
  <div className="identity-visible" style={compact?{gridTemplateColumns:`repeat(${Math.min(active.length,3)}, minmax(0, 1fr))`}:undefined}>{(compact?active.slice(0,6):active).map(b=><IdentityChip key={b.id} badge={b}/>)}</div>
  {more&&<button type="button" className="identity-more" aria-label={`查看全部${active.length}个身份`} aria-expanded={open} onClick={()=>{setExpanded(!expanded);}}>＋{active.length-6}</button>}
  {more&&open&&<div className="identity-expanded" role="group" aria-label="全部展示身份">{active.map(b=><IdentityChip key={b.id} badge={b}/>)}</div>}
 </div>;
}
