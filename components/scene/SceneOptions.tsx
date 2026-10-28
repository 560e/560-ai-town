"use client";
import type {ReactNode} from 'react';
import TownMusic from '@/components/town/TownMusic';
export default function SceneOptions({talking,help,children}:{talking:boolean;help:ReactNode;children?:ReactNode}){
 return <div className="scene-options"><section><h3>环境声音</h3><TownMusic talking={talking} inline/></section><details className="scene-help"><summary>操作说明 <span>⌄</span></summary><div>{help}</div></details>{children&&<section className="scene-more-links">{children}</section>}</div>;
}
