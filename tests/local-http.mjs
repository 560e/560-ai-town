import {request} from 'node:http';
// Node's fetch normalizes Host. These proxy tests must send the real forwarded host.
export function localHttp(url,{method='GET',headers={},body}={}){
  const target=new URL(url);
  if(target.protocol!=='http:'||!['127.0.0.1','localhost'].includes(target.hostname)||target.username||target.password)throw Error('Only local HTTP test servers are allowed');
  return new Promise((ok,fail)=>{
    const req=request(target,{method,headers:{...headers,...(body!==undefined?{'Content-Length':Buffer.byteLength(body)}:{})}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('error',fail);res.on('end',()=>{const h=new Headers();for(let i=0;i<res.rawHeaders.length;i+=2)h.append(res.rawHeaders[i],res.rawHeaders[i+1]);ok(new Response([204,304].includes(res.statusCode)?null:Buffer.concat(chunks),{status:res.statusCode,headers:h}));});});
    req.on('error',fail);req.setTimeout(15000,()=>req.destroy(new Error('Local test request timeout')));req.end(body);
  });
}
