import ResidentDistrict from '@/components/account/ResidentDistrict';
import AcademyWorkbench from '@/components/academy/AcademyWorkbench';
import TownReturnLink from '@/components/town/TownReturnLink';
import Link from 'next/link';
export default async function Page({searchParams}:{searchParams:Promise<{view?:string}>}){const query=await searchParams;const view=query.view==='mine'?'mine':query.view==='paths'?'paths':'catalog';return <ResidentDistrict title="AI学院" destination="academy"><main className="academy-page"><header className="academy-page-header"><Link href="/districts/learning-campus"><b>560</b> AI学院</Link><TownReturnLink>返回小镇 ↗</TownReturnLink></header><AcademyWorkbench initialView={view}/></main></ResidentDistrict>;}
