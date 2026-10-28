"use client";
import {useEffect,useRef,useState} from 'react';
import TownExperience from './TownExperience';
import type {DistrictEntryId} from '@/data/district-entries';
import {loadTownReturn,type TownReturnState} from '@/data/town-return';
import {consumeTownReturn,townArrival,type TownDestination} from '@/data/town-navigation';
export default function TownEntry({resume,returnTo,initialDistrict=null}:{resume:boolean;returnTo:TownDestination|null;initialDistrict?:DistrictEntryId|null}){
 const [saved,setSaved]=useState<TownReturnState|null|undefined>(undefined),booted=useRef(false);
 useEffect(()=>{
  if(booted.current)return;booted.current=true;
  const pending=consumeTownReturn();
  setSaved(pending??(returnTo?townArrival(returnTo):resume?loadTownReturn():null));
  // Legacy bookmarked return links are one-time intents, never persistent player coordinates.
  const url=new URL(window.location.href);
  if(url.searchParams.has('return')||url.searchParams.has('resume')||url.searchParams.has('district')){
   url.searchParams.delete('return');url.searchParams.delete('resume');url.searchParams.delete('district');
   window.history.replaceState(null,'',url.pathname+url.search+url.hash);
  }
 },[resume,returnTo]);
 if(saved===undefined)return <main className="scene-loading" role="status">正在展开小镇…</main>;
 return <TownExperience resumeState={saved} initialDistrict={initialDistrict}/>;
}
