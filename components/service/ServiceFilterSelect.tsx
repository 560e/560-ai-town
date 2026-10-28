"use client";
import {useEffect,useId,useRef,useState,type KeyboardEvent} from 'react';
export type FilterOption={id:string;name:string};

/** Kept inside the hall dialog so its focus trap also covers the open menu. */
export default function ServiceFilterSelect({label,value,options,onChange,disabled=false}:{label:string;value:string;options:FilterOption[];onChange:(value:string)=>void;disabled?:boolean}){
 const id=useId(),root=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null),[open,setOpen]=useState(false),[active,setActive]=useState(0),search=useRef({text:'',time:0});
 const selected=options.findIndex(o=>o.id===value),index=Math.min(active,options.length-1);
 const reveal=()=>{setActive(Math.max(0,selected));setOpen(true);};
 const choose=(i:number)=>{if(!options[i])return;onChange(options[i].id);setOpen(false);button.current?.focus();};
 useEffect(()=>{if(!open)return;const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[open]);
 useEffect(()=>{if(open)root.current?.querySelector<HTMLElement>(`[data-option-index="${index}"]`)?.scrollIntoView({block:'nearest'});},[open,index]);
 const key=(e:KeyboardEvent<HTMLButtonElement>)=>{
  if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false);return;}
  if(e.key==='Tab'){setOpen(false);return;}
  if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(e.key)){
   e.preventDefault();e.stopPropagation();if(!open){reveal();return;}
   if(e.key==='Enter'||e.key===' ')choose(index);
   else setActive(e.key==='Home'?0:e.key==='End'?options.length-1:Math.max(0,Math.min(options.length-1,index+(e.key==='ArrowDown'?1:-1))));
  }else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
   const now=Date.now();search.current={text:(now-search.current.time<600?search.current.text:'')+e.key,time:now};const found=options.findIndex(o=>o.name.toLowerCase().startsWith(search.current.text.toLowerCase()));if(found>=0){setActive(found);setOpen(true);}
  }
 };
 return <div className="service-filter-select" ref={root} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOpen(false);}}>
  <span id={`${id}-label`} className="service-filter-label">{label}</span>
  <button ref={button} type="button" className="service-filter-trigger" role="combobox" aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-haspopup="listbox" aria-controls={open?`${id}-list`:undefined} aria-activedescendant={open&&index>=0?`${id}-${index}`:undefined} disabled={disabled} onClick={()=>open?setOpen(false):reveal()} onKeyDown={key}>
   <span id={`${id}-value`}>{options[selected]?.name||'全部'}</span><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg>
  </button>
  {open&&<div id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} className="service-filter-menu">{options.map((option,i)=><div id={`${id}-${i}`} key={option.id} role="option" aria-selected={option.id===value} data-option-index={i} className={i===index?'is-active':''} onPointerMove={()=>setActive(i)} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(i)}><span>{option.name}</span>{option.id===value&&<span aria-hidden="true">✓</span>}</div>)}</div>}
 </div>;
}
