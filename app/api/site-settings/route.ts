import {publicSiteSettings} from "@/lib/server/site-settings";
import {json} from "@/lib/server/http";
export const dynamic="force-dynamic";
export async function GET(){return json(await publicSiteSettings());}
