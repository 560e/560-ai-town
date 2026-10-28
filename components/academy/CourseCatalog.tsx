"use client";
import {useCallback,useEffect,useState} from 'react';
import type {AcademyCatalog} from '@/lib/academy';
import CourseCover from './CourseCover';
import '@/app/academy/academy.css';
export async function academyRequest<T>(url:string,body?:unknown):Promise<T>{const response=await fetch(url,{cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const value=await response.json();if(!response.ok)throw new Error(value.error||'学院服务暂时不可用');return value as T;}
export default function CourseCatalog(){
 const [catalog,setCatalog]=useState<AcademyCatalog|null>(null),[error,setError]=useState(''),[search,setSearch]=useState(''),[loading,setLoading]=useState(true);
 const load=useCallback(async(signal?:AbortSignal)=>{setLoading(true);setError('');try{const response=await fetch('/api/academy',{cache:'no-store',signal});const value=await response.json();if(!response.ok)throw Error(value.error||'学院服务暂时不可用');setCatalog(value);}catch(e){if(!signal?.aborted)setError((e as Error).message);}finally{if(!signal?.aborted)setLoading(false);}},[]);
 useEffect(()=>{const controller=new AbortController();void load(controller.signal);return()=>controller.abort();},[load]);
 const courses=catalog?.courses.filter(c=>`${c.title} ${c.summary}`.toLowerCase().includes(search.trim().toLowerCase()))||[];
 return <section className="academy-workbench academy-external-catalog"><div className="academy-heading"><p className="academy-eyebrow">560 · AI ACADEMY</p><h2>探索 AI 课程</h2><p>精选课程将在新标签页打开。课程内容、账号和学习进度由课程所在平台提供，小镇不记录或同步站外学习进度。</p></div><div className="academy-filters"><label>搜索课程<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="课程名称或介绍"/></label></div>{error&&<p className="academy-error" role="alert">{error} <button disabled={loading} onClick={()=>void load()}>重试加载</button></p>}{loading?<p role="status">正在读取课程目录…</p>:!error&&<><div className="academy-course-grid">{courses.map(course=><article className="academy-course-card" key={course.id}><CourseCover title={course.title} src={course.coverAssetId?`/api/academy/assets/${encodeURIComponent(course.coverAssetId)}`:undefined}/><div className="academy-course-body"><span className="academy-course-meta">站外课程 · 新标签页打开</span><h3 title={course.title}>{course.title}</h3><p className="academy-course-summary">{course.summary}</p><a className="academy-primary" href={course.url} target="_blank" rel="noopener noreferrer">前往网校学习 ↗</a></div></article>)}</div>{!courses.length&&<div className="academy-empty"><h3>{catalog?.courses.length?'没有匹配的课程':'课程目录正在准备'}</h3><p>{catalog?.courses.length?'请尝试其他课程名称或关键词。':'运营发布课程后，将在这里展示。'}</p></div>}</>}</section>;
}

