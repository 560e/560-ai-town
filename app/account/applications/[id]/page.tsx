import ApplicationDetail from '@/components/service/ApplicationDetail';
export default async function Page({params}:{params:Promise<{id:string}>}){return <ApplicationDetail id={(await params).id}/>;}
