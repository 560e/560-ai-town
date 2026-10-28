import TownEntry from "@/components/town/TownEntry";
import {returnDestination,districtPanelIntent,districtEntry} from '@/data/district-entries';

export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams;
  const panel=districtPanelIntent(params.district);
  const destination=panel?districtEntry(panel)!.destination:returnDestination(params.return),resume=!destination&&params.resume==='account';
  return <TownEntry initialDistrict={panel} key={panel||destination||(resume?'account-return':'welcome')} returnTo={destination} resume={resume}/>;
}
