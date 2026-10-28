"use client";
import {useEffect,useRef,useState} from 'react';
import {academyDialogues,type AcademyPanel as Panel} from '@/data/academy-hall';
import CourseCatalog from '../CourseCatalog';
import {ScenePanel} from '@/components/scene/SceneChrome';
import './academy-hall.css';
const titles:Record<Panel,string>={catalog:'学院课程目录','student-chat':'校园学员',guide:'学院引导员',assistant:'教学助理',librarian:'图书管理员',helper:'学习助手',announcement:'学校公告牌',classes:'班级教学',library:'AI 图书馆',lecture:'AI 讲堂',student:'学生中心'};
export default function AcademyPanel({view,onClose,pendingChat=false}:{view:Panel;onClose:()=>void;pendingChat?:boolean}){
 const [step,setStep]=useState(0),[offset]=useState(()=>Math.floor(Math.random()*3)),[showCatalog,setShowCatalog]=useState(false),close=useRef(onClose);close.current=onClose;
 const lines=Object.hasOwn(academyDialogues,view)?academyDialogues[view as keyof typeof academyDialogues]:null;
 useEffect(()=>{setStep(0);setShowCatalog(false);},[view]);
 useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.repeat||event.target instanceof HTMLElement&&event.target.closest('input,textarea,select'))return;if(event.key==='Escape'||event.key===' '&&(!!lines&&!showCatalog||!(event.target instanceof HTMLElement&&event.target.closest('button,a')))){event.preventDefault();event.stopPropagation();close.current();}else if(lines&&!showCatalog&&event.key.toLowerCase()==='e'){event.preventDefault();event.stopPropagation();setStep(n=>(n+1)%lines.length);}};window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true);},[lines,showCatalog]);
 return <ScenePanel open title={showCatalog?'学院课程目录':titles[view]} subtitle="560 · AI ACADEMY" wide={!lines||showCatalog} className={`academy-hall-panel${!lines||showCatalog?" academy-catalog-dialog":""}`} bodyClassName="hall-dialog-content" returnToScene onClose={onClose} onBack={showCatalog?()=>setShowCatalog(false):undefined}><div className="hall-welcome-panel">{pendingChat&&<p role="status">收到私聊邀请，关闭当前窗口后可处理；邀请可能自动过期。</p>}{view==='catalog'||showCatalog?<CourseCatalog/>:lines?<><span className="service-eyebrow">校园学习引导</span><p className="service-prose" aria-live="polite">{lines[(step+offset)%lines.length]}</p><div className="hall-intro-options"><button onClick={()=>setStep(n=>(n+1)%lines.length)}><b>继续交流 <kbd>E</kbd></b></button><button onClick={onClose}><b>继续游览 <kbd>Space</kbd></b></button></div></>:<>
 {view==='announcement'&&<><h3>学院通知</h3><p>已发布的站外课程可在下方浏览，点击后在新标签页打开。校园位置和房间保持不变。</p><p>班级教学、活动报名、签到和直播筹备中。</p></>}
 {view==='library'&&<><h3>学习资源导览</h3><p>可从下方课程目录前往课程平台，资料和下载以对应平台的实际提供内容为准。</p><p>独立馆藏、知识库和投稿功能筹备中。</p></>}
 {view==='lecture'&&<><h3>公开课程推荐</h3><p>浏览当前发布的站外课程，内容与学习服务由对应课程平台提供。</p><p>讲座报名、直播、回放和线下签到筹备中。</p></>}
 {view==='student'&&<><h3>学习服务说明</h3><p>课程将在站外平台学习，小镇不提供站内报名、课时或进度记录，也不与站外平台同步学习进度。</p><p>班级通知、学习日历和个人学习计划筹备中。</p></>}
 {view==='classes'&&<><h3>班级教学筹备中</h3><p>当前暂无班级报名，可先浏览已发布的站外课程。</p></>}
 <CourseCatalog/>
 </>}{lines&&!showCatalog&&<div className="academy-panel-links"><button onClick={()=>setShowCatalog(true)}>浏览课程目录 ↗</button></div>}</div></ScenePanel>;
}

