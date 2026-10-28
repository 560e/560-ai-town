import ApplyTitle from '@/components/service/ApplyTitle';
import ResidentDistrict from '@/components/account/ResidentDistrict';
export default async function Page({params}:{params:Promise<{id:string}>}){return <ResidentDistrict title="身份申请" destination="service"><ApplyTitle id={(await params).id}/></ResidentDistrict>;}
