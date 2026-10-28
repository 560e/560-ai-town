"use client";
import {useEffect,useState} from 'react';
import {ServiceLink as Link} from './ServicePanelContext';
import {useAccount} from '@/components/account/AccountProvider';
import SignIn from '@/components/account/SignIn';
import {serviceRequest} from './shared';
import ServiceShell from './ServiceShell';
export default function ServiceGuide({id}:{id:string}){const account=useAccount(),[guide,setGuide]=useState<{config:{name:string;body:string}}|null>(null),[error,setError]=useState('');useEffect(()=>{setError('');setGuide(null);void serviceRequest(`/api/service/guides/${id}`).then(setGuide).catch(e=>setError(e.message));},[id,account.user?.id]);return <ServiceShell><Link className="service-back" href="/service">← 返回服务中心</Link><article className="service-panel service-reading">{guide?<><span className="service-eyebrow">SERVICE LIBRARY</span><h1>{guide.config.name}</h1><p className="service-prose">{guide.config.body}</p></>:<><h1>服务资料</h1><p role="status">{error||'正在读取…'}</p>{!account.loading&&!account.user&&<SignIn/>}{account.user&&<Link href="/account/applications">查看我的权限称号</Link>}</>}</article></ServiceShell>;}
