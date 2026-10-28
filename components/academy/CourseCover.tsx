"use client";
import {useState} from 'react';

const fallback='/images/academy-course-default.svg';
/** Keep private asset authorization intact and fall back once without retry loops. */
export default function CourseCover({src,title}:{src?:string;title:string}){
 const [failed,setFailed]=useState<string|null>(null);
 const source=src&&failed!==src?src:fallback;
 return <img className="academy-course-cover" src={source} alt={`${title}课程封面`} width={640} height={360} loading="lazy" decoding="async" onError={source!==fallback?()=>setFailed(src!):undefined}/>;
}
