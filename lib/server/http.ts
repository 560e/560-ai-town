import {authConfig, isLoopback, trustedOrigins} from "./config.ts";
export class HttpError extends Error {status: number; constructor(status:number,message:string){super(message);this.status=status;}}
export function json(body: unknown, status = 200) {return Response.json(body, {status, headers:{"Cache-Control":"no-store", "X-Content-Type-Options":"nosniff"}});}
export function guard(request: Request, mutation = false) {
  const config = authConfig();
  if (!config.enabled) throw new HttpError(503, "账户服务尚未启用，请联系站点管理员。");
  // Local OTPs must never be exposed on a deployed host, even with an accidentally copied env file.
  const host = request.headers.get("host");
  if(config.publicPassword){
    const expected=new URL(config.baseURL);
    if(host!==expected.host||request.headers.get('x-forwarded-host')!==expected.host||request.headers.get('x-forwarded-proto')!=='https'||process.env.TOWN_TRUST_PROXY!=='1')throw new HttpError(403,'请从站点 HTTPS 域名访问');
  }else if (!isLoopback(request.url) || (host && !isLoopback(`http://${host}`)) || (request.headers.get("x-forwarded-for")||"127.0.0.1").split(",").some(ip=>!["127.0.0.1","::1","::ffff:127.0.0.1"].includes(ip.trim())) || (!!request.headers.get("x-forwarded-host")&&!isLoopback(`http://${request.headers.get("x-forwarded-host")}`))) throw new HttpError(403,"本地测试账户只允许本机访问");
  if (mutation) {
    const origin = request.headers.get("origin");
    if (!origin || !trustedOrigins().includes(origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new HttpError(403,"请从小镇页面发起操作");
    if (!request.headers.get("content-type")?.includes("application/json")) throw new HttpError(415,"请求格式应为 JSON");
  }
}
export async function body(request: Request, limit=4096) {
  const reader=request.body?.getReader(),chunks:Uint8Array[]=[];let size=0;
  if(reader){try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new HttpError(413,"提交内容过长");}chunks.push(value);}}finally{reader.releaseLock();}}
  const text=new TextDecoder().decode(Buffer.concat(chunks));
  try {const result = JSON.parse(text); if (!result || typeof result !== "object" || Array.isArray(result)) throw Error(); return result as Record<string,unknown>;}
  catch {throw new HttpError(400,"提交内容格式错误");}
}
export async function handle(work: () => Promise<Response>) {
  try {return await work();} catch (error) {
    if (error instanceof HttpError) return json({error:error.message}, error.status);
    console.error("[town-account]", error instanceof Error ? error.name : "UnknownError");
    return json({error:"服务暂时不可用，请确认本地数据库已启动后重试"},503);
  }
}
