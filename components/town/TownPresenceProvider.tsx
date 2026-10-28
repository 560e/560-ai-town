"use client";
import {createContext,useCallback,useContext,useEffect,useLayoutEffect,useMemo,useRef,useState,type MutableRefObject,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {useAccount} from '@/components/account/AccountProvider';
import {sceneForPath,sceneSpawn,type TownSceneId} from '@/lib/town-scenes';
import type {PresenceRuntime} from '@/data/scene-presence';
import {useTownPresence} from './useTownPresence';

type Online=ReturnType<typeof useTownPresence>;
type Binding={runtime:MutableRefObject<PresenceRuntime>;scene:TownSceneId;enabled:boolean;token:object};
type ContextValue={online:Online;bind:(binding:Binding)=>()=>void;scene:TownSceneId};
const Context=createContext<ContextValue|null>(null);
function parkedRuntime(scene:TownSceneId):PresenceRuntime{
 const pose=sceneSpawn(scene);
 return {player:{...pose,lookYaw:0,pitch:.15,exists:true,walking:false,view:'third',typing:false,stride:0,seat:null},remoteResidents:[],lastDestination:0,talkingId:null};
}
/** One authenticated lease per mounted app, not per page. Navigation changes scene, never leaves room. */
export function TownPresenceProvider({children}:{children:ReactNode}){
 const pathname=usePathname(),account=useAccount();
 const [binding,setBinding]=useState<Binding|null>(null),[activated,setActivated]=useState(false);
 const scene=pathname==='/'&&binding?.scene==='town'&&!binding.enabled?'account':sceneForPath(pathname);
 const parked=useMemo(()=>parkedRuntime(scene),[scene]),bridge=useRef<PresenceRuntime>(parked);
 bridge.current=binding?.scene===scene&&binding.enabled?binding.runtime.current:parked;
 const bind=useCallback((next:Binding)=>{setBinding(next);if(next.enabled)setActivated(true);return()=>setBinding(current=>current?.token===next.token?null:current);},[]);
 useEffect(()=>{if(!account.user&&!account.loading)setActivated(false);},[account.user,account.loading]);
 // Direct district URLs can join without mounting the main-map renderer first.
 const directWorld=pathname==='/service'||pathname.startsWith('/districts/');
 useEffect(()=>{if(directWorld&&account.user)setActivated(true);},[directWorld,account.user]);
 const online=useTownPresence(bridge,account.user?.id,activated||directWorld,scene);
 return <Context.Provider value={{online,bind,scene}}>{children}</Context.Provider>;
}
export function useSceneConnection(){const value=useContext(Context);if(!value)throw new Error('Scene presence provider missing');return value;}
export function useScenePresence(runtime:MutableRefObject<PresenceRuntime>,enabled=true,explicitScene?:TownSceneId){
 const {online,bind}=useSceneConnection(),path=usePathname(),actualScene=explicitScene??sceneForPath(path);
 useLayoutEffect(()=>bind({runtime,scene:actualScene,enabled,token:{}}),[runtime,enabled,actualScene,bind]);
 return online;
}
