import {guard,handle,json,body} from '@/lib/server/http';
import {requireSuperAdmin} from '@/lib/server/session';
import {registrationSettings,writeRegistrationSettings} from '@/lib/server/registration-policy';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handle(async()=>{guard(request);await requireSuperAdmin(request.headers);return json(await registrationSettings());});}
export async function PATCH(request:Request){return handle(async()=>{guard(request,true);const actor=await requireSuperAdmin(request.headers);return json(await writeRegistrationSettings(actor.id,await body(request)));});}
