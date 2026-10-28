import ServiceGuide from '@/components/service/ServiceGuide';
import ResidentDistrict from '@/components/account/ResidentDistrict';
export const metadata={robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){return <ResidentDistrict title="服务资料" destination="service"><ServiceGuide id={(await params).id}/></ResidentDistrict>;}
