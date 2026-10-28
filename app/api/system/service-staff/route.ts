import {handle,json,guard,body} from '@/lib/server/http';
import {requireSuperAdmin} from '@/lib/server/session';
import {serviceStaff,updateServiceStaff} from '@/lib/server/service-staff';
import {pageValue} from '@/lib/server/service-applications';
export async function GET(request:Request){return handle(async()=>{guard(request);await requireSuperAdmin(request.headers);const q=new URL(request.url).searchParams;return json(await serviceStaff(q.get('q')||'',pageValue(q.get('page'))));});}
export async function PATCH(request:Request){return handle(async()=>{guard(request,true);const actor=await requireSuperAdmin(request.headers);return json(await updateServiceStaff(actor.id,await body(request,65536)));});}
