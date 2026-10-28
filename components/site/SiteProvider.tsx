"use client";
import {createContext,useContext,useEffect,useState} from "react";
import {defaultSiteSettings,type SiteSettings} from "@/lib/site-settings";
const SiteContext=createContext({settings:defaultSiteSettings,refresh:async()=>{}});
export function SiteProvider({initial,children}:{initial:SiteSettings;children:React.ReactNode}){
  const [settings,setSettings]=useState(initial);
  useEffect(()=>setSettings(initial),[initial]);
  const refresh=async()=>{try{const response=await fetch("/api/site-settings",{cache:"no-store"});if(response.ok)setSettings(await response.json());}catch{/* Keep current display during a temporary network failure. */}};
  useEffect(()=>{const sync=()=>{void refresh();};window.addEventListener("focus",sync);return()=>window.removeEventListener("focus",sync);},[]);
  return <SiteContext.Provider value={{settings,refresh}}>{children}</SiteContext.Provider>;
}
export const useSite=()=>useContext(SiteContext);
