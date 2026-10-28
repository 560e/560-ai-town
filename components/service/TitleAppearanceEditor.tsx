"use client";
import {identityPresets,type BadgeStyle} from '@/lib/identity-display';
import type {TitleConfig} from '@/lib/service';
import {IdentityChip} from '../account/IdentityBadges';
export default function TitleAppearanceEditor({config,onChange}:{config:TitleConfig;onChange:(patch:Partial<TitleConfig>)=>void}){
 const style=config.overheadStyle||identityPresets.blue.style;
 const set=(patch:Partial<BadgeStyle>)=>onChange({overheadStyle:{...style,...patch}});
 return <section className="service-editor-section identity-style-editor"><h3>人物头顶称号样式</h3><label className="service-check"><input type="checkbox" checked={config.overheadAllowed===true} onChange={e=>onChange({overheadAllowed:e.target.checked})}/>允许持有人选择在人物头顶展示</label><p className="service-muted">与展示板是否公开分别设置。开启后，用户仍需在个人中心自行选择。保存草稿不会影响线上，发布后生效。</p>
 <div className="identity-presets">{Object.entries(identityPresets).map(([id,p])=><button type="button" key={id} aria-pressed={JSON.stringify(style)===JSON.stringify(p.style)} onClick={()=>onChange({overheadStyle:{...p.style,colors:[...p.style.colors]}})}><IdentityChip badge={{id,name:p.name,style:p.style,expiresAt:null}}/></button>)}</div>
 <div className="service-form-grid"><label>背景配色数量<select value={style.colors.length} onChange={e=>set({colors:Array.from({length:Number(e.target.value)},(_,i)=>style.colors[i]||'#FFFFFF')})}><option value={1}>纯色</option><option value={2}>双色渐变</option><option value={3}>三色渐变</option></select></label>{style.colors.map((c,i)=><label key={i}>背景色 {i+1}<input aria-label={`称号背景色${i+1}`} type="color" value={c} onChange={e=>set({colors:style.colors.map((v,j)=>i===j?e.target.value:v)})}/></label>)}<label>文字颜色<input type="color" value={style.text} onChange={e=>set({text:e.target.value})}/></label><label>边框颜色<input type="color" value={style.border} onChange={e=>set({border:e.target.value})}/></label></div><p className="service-muted">建议使用浅色背景与清晰文字。颜色名称不代表权限等级。</p>
 <div className="identity-preview"><IdentityChip badge={{id:'preview',name:config.name||'称号预览',style,expiresAt:null}}/><small>实际展示预览</small></div></section>;
}
