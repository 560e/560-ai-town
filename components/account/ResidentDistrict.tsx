import type {ReactNode} from 'react';
import {headers} from 'next/headers';
import {authConfig} from '@/lib/server/config';
import {currentUser} from '@/lib/server/session';
import type {TownDestination} from '@/data/town-navigation';
import DistrictAccess from './DistrictAccess';

export default async function ResidentDistrict({children,title,destination}:{children:ReactNode;title:string;destination:TownDestination}){
  let authorized=false;
  if(authConfig().enabled){try{authorized=!!await currentUser(await headers());}catch{}}
  // Guests receive only the sign-in page, never the district's server-rendered content.
  return <DistrictAccess authorized={authorized} title={title} destination={destination}>{authorized?children:null}</DistrictAccess>;
}
