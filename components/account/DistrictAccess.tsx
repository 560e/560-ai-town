"use client";
import {useEffect,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {useAccount} from './AccountProvider';
import SignIn from './SignIn';
import TownReturnLink from '@/components/town/TownReturnLink';
import SiteBrand from '@/components/site/SiteBrand';
import SiteFooter from '@/components/site/SiteFooter';
import type {TownDestination} from '@/data/town-navigation';

export default function DistrictAccess({authorized,title,destination,children}:{authorized:boolean;title:string;destination:TownDestination;children:ReactNode}){
  const account=useAccount(),router=useRouter();
  useEffect(()=>{if(account.user&&!authorized)router.refresh();},[account.user?.id,authorized,router]);
  if(authorized&&account.user)return children;
  return <main className="district-access-page"><header><TownReturnLink destination={destination}><SiteBrand/></TownReturnLink></header><section className="district-access-card"><span className="district-access-icon" aria-hidden="true">560</span><p className="district-access-eyebrow">成为小镇居民 · 探索更多</p><h1>注册／登录后进入{title}</h1><p>游客可以在小镇主地图自由游览。进入各版块子页面，需要先成为小镇居民。</p>{account.loading||account.user?<p role="status">正在核验居民身份…</p>:<SignIn/>}<TownReturnLink destination={destination} className="district-access-return">继续游览小镇 ↗</TownReturnLink></section><SiteFooter/></main>;
}
