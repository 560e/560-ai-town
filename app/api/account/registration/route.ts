import {guard,handle,json} from '@/lib/server/http';
import {publicRegistrationPolicy} from '@/lib/server/registration-policy';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handle(async()=>{guard(request);return json(await publicRegistrationPolicy());});}
