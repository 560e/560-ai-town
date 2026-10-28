import AcademyHall from '@/components/academy/hall/AcademyHall';
import ResidentDistrict from '@/components/account/ResidentDistrict';
import {notFound,redirect} from 'next/navigation';
import {districtEntry,districtPresentation} from '@/data/district-entries';

export default async function DistrictIntroduction({params}:{params:Promise<{id:string}>}){
 const {id}=await params,entry=districtEntry(id);
 if(!entry||id==='civic-hall')notFound();
 if(id==='learning-campus')return <ResidentDistrict title={entry.name} destination={entry.destination}><AcademyHall/></ResidentDistrict>;
 // Old bookmarks open the same guarded in-world window; the intent is consumed once.
 if(districtPresentation(id)==='panel')redirect(`/?district=${encodeURIComponent(id)}`);
 notFound();
}
