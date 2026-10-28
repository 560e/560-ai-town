"use client";
import {useContext} from 'react';
import {ServicePanelContext} from './ServicePanelContext';
import TownReturnLink from "@/components/town/TownReturnLink";
import Link from 'next/link';
import SiteBrand from '@/components/site/SiteBrand';
import SiteFooter from '@/components/site/SiteFooter';
export default function ServiceShell({children}:{children:React.ReactNode}){const panel=useContext(ServicePanelContext);if(panel)return <div className="service-embedded">{children}</div>;return <main className="service-page"><header className="service-header"><Link href="/service" aria-label="服务中心首页"><SiteBrand/></Link><nav><TownReturnLink destination="service">返回小镇</TownReturnLink><Link href="/account/applications">我的身份与申请</Link><Link href="/account">个人中心</Link></nav></header><div className="service-main">{children}</div><SiteFooter className="service-footer"/></main>;}

