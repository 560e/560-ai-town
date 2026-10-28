"use client";
import {createContext,useContext,useCallback,useEffect,type ComponentProps} from 'react';
import NextLink from 'next/link';
import {useRouter} from 'next/navigation';
export type ServicePanelView={type:'board';kind?:'all'|'honor'|'permission'}|{type:'intro'}|{type:'mine'}|{type:'title'|'application'|'guide';id:string};
export const ServicePanelContext=createContext<{navigate:(path:string,saved?:boolean)=>boolean;setDirty:(dirty:boolean)=>void;setBusy:(busy:boolean)=>void}|null>(null);
export function servicePanelPath(path:string):ServicePanelView|null{
 if(path==='/service')return {type:'board'};
 if(path==='/account/applications')return {type:'mine'};
 const match=path.match(/^\/(service\/(titles|guides)|account\/applications)\/([0-9a-f-]{36})$/);
 return match?{type:match[1]==='account/applications'?'application':match[2]==='titles'?'title':'guide',id:match[3]}:null;
}
export function useServiceNavigation(){const panel=useContext(ServicePanelContext),router=useRouter();return useCallback((path:string,saved=false)=>{if(!panel||!panel.navigate(path,saved))router.push(path);},[panel,router]);}
export function useServiceFormState(dirty:boolean,busy:boolean){const panel=useContext(ServicePanelContext);useEffect(()=>{panel?.setDirty(dirty);return()=>panel?.setDirty(false);},[panel,dirty]);useEffect(()=>{panel?.setBusy(busy);return()=>panel?.setBusy(false);},[panel,busy]);}
export function ServiceLink(props:ComponentProps<typeof NextLink>){const panel=useContext(ServicePanelContext);return <NextLink {...props} onClick={e=>{props.onClick?.(e);if(!e.defaultPrevented&&panel&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&typeof props.href==='string'&&servicePanelPath(props.href)){e.preventDefault();panel.navigate(props.href);}}}/>;}
