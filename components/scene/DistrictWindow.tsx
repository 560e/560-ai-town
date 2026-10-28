"use client";
import type {CSSProperties} from 'react';
import {ScenePanel} from './SceneChrome';
import {districtEntry,type DistrictEntryId} from '@/data/district-entries';
import {districtIntroductions,type IntroDistrictId} from '@/data/district-introductions';

/** Presentation only: callers retain the scene and enforce the resident gate. */
export default function DistrictWindow({id,onClose,onService}:{id:DistrictEntryId;onClose:()=>void;onService:()=>void}){
 const entry=districtEntry(id),info=districtIntroductions[id as IntroDistrictId];
 if(!entry||!info)return null;
 return <ScenePanel open wide returnToScene title={entry.name} subtitle="街区探索 · 内容窗口" onClose={onClose}>
  <div className="district-window" style={{'--district-accent':info.color} as CSSProperties}>
   <section className="district-window-intro"><span className="district-window-symbol" aria-hidden="true">{info.icon}</span><div><small>{info.eyebrow}</small><h3>{info.title}</h3><p>{info.intro}</p><span className="district-window-status">功能筹备中 · 当前开放版块介绍</span></div></section>
   <h3 className="district-window-heading">探索这个版块</h3>
   <p className="scene-panel-intro">以下为规划方向，具体内容将逐步开放。</p>
   <div className="district-window-cards">{info.areas.map(([name,description],index)=><article key={name}><span className="district-window-number">0{index+1}</span><h4>{name}</h4><p>{description}</p><small>筹备中</small></article>)}</div>
   <footer className="district-window-actions"><p>关闭窗口后，继续在原位置游览。</p><button type="button" className="account-secondary" onClick={onService}>前往服务中心</button><button type="button" className="account-primary" onClick={onClose}>继续游览</button></footer>
  </div>
 </ScenePanel>;
}
