"use client";
import {createContext,useCallback,useContext,useEffect,useState,type ReactNode} from "react";
import type {Resident} from "@/lib/account";
import type {IdentityBadge} from '@/lib/identity-display';
type State={badges:IdentityBadge[];refreshBadges:()=>Promise<void>;user:Resident|null;local:boolean;password:boolean;enabled:boolean;loading:boolean;error:string;refresh:()=>Promise<void>};
const Context=createContext<State>({badges:[],refreshBadges:async()=>{},user:null,local:false,password:false,enabled:false,loading:true,error:"",refresh:async()=>{}});
export function AccountProvider({children}:{children:ReactNode}){
  const [state,setState]=useState<Omit<State,"refresh"|"badges"|"refreshBadges">>({user:null,local:false,password:false,enabled:false,loading:true,error:""});
  const [badgeState,setBadges]=useState<{userId:string;badges:IdentityBadge[]}>({userId:'',badges:[]});
  const badgeUser=state.user?.id;
  const refreshBadges=useCallback(async()=>{
    if(!badgeUser)return;
    try{const response=await fetch('/api/account/identity-display?view=badges',{cache:'no-store'});if(!response.ok){setBadges({userId:badgeUser,badges:[]});return;}const result=await response.json();setBadges({userId:badgeUser,badges:result.badges});}catch{setBadges({userId:badgeUser,badges:[]});}
  },[badgeUser]);
  useEffect(()=>{if(!badgeUser)return;void refreshBadges();const poll=()=>{if(document.visibilityState==='visible')void refreshBadges();};const timer=setInterval(poll,5000);window.addEventListener('focus',poll);return()=>{clearInterval(timer);window.removeEventListener('focus',poll);};},[badgeUser,refreshBadges]);
  const refresh=useCallback(async()=>{
    try{const response=await fetch("/api/account",{cache:"no-store"});const result=await response.json();if(!response.ok)throw new Error(result.error||"账户服务暂时不可用");setState({...result,loading:false,error:""});}
    catch(error){setState({user:null,local:false,password:false,enabled:false,loading:false,error:(error as Error).message});}
  },[]);
  useEffect(()=>{void refresh();const focus=()=>{void refresh();};window.addEventListener("focus",focus);const interval=setInterval(focus,60000);return()=>{window.removeEventListener("focus",focus);clearInterval(interval);};},[refresh]);
  return <Context.Provider value={{...state,refresh,refreshBadges,badges:badgeState.userId===badgeUser?badgeState.badges:[]}}>{children}</Context.Provider>;
}
export function useAccount(){return useContext(Context);}
export async function accountRequest(path:string,data:unknown,method="POST"){
  const response=await fetch(path,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
  const result=await response.json();if(!response.ok)throw new Error(result.error||"操作失败，请重试");return result;
}
