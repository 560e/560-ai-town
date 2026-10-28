import {guard,handle,json,body} from "@/lib/server/http";
import {requireSuperAdmin} from "@/lib/server/session";
import {settingsHistory,writeSiteSettings} from "@/lib/server/site-settings";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){return handle(async()=>{guard(request);await requireSuperAdmin(request.headers);return json(await settingsHistory());});}
export async function PATCH(request:Request){return handle(async()=>{guard(request,true);const actor=await requireSuperAdmin(request.headers);return json(await writeSiteSettings(actor.id,await body(request)));});}
