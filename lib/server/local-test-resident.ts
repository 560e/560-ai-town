import {isLoopback} from './config.ts';
export const localTestResidentPhone='+8613800138000';
export const localTestResidentCode='5600';
export function isLocalTestResident(phone:string,env:Record<string,string|undefined>=process.env){
 return phone===localTestResidentPhone&&env.TOWN_LOCAL_TEST_RESIDENT==='1'&&env.TOWN_LOCAL_AUTH==='1'&&env.NODE_ENV!=='production'&&isLoopback(env.BETTER_AUTH_URL||'http://localhost:3000');
}
export function otpCodeLength(phone:string){return isLocalTestResident(phone)?4:6;}

