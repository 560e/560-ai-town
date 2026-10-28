import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {healthRequest} from '../scripts/deploy/health.mjs';
import {healthHeaders,accountHealthy} from '../scripts/deploy/config.mjs';

test('deployment request preserves actual Host on the wire and validates account response',async()=>{
  const server=createServer((req,res)=>{
    const good=req.headers.host==='opc.560e.com'&&req.headers['x-forwarded-host']==='opc.560e.com'&&req.headers['x-forwarded-proto']==='https';
    res.writeHead(good?200:403);res.end(JSON.stringify({enabled:true,password:true,local:false}));
  });
  await new Promise<void>(ok=>server.listen(0,'127.0.0.1',ok));
  try{
    const port=(server.address() as {port:number}).port;
    const response=await healthRequest(`http://127.0.0.1:${port}/api/account`,{headers:healthHeaders({mode:'password',host:'opc.560e.com'})});
    assert.equal(response.status,200);assert.equal(accountHealthy('password',await response.json()),true);
    assert.equal((await healthRequest(`http://127.0.0.1:${port}/api/account`)).status,403);
    await assert.rejects(healthRequest('http://example.com/'),/loopback/);
  }finally{await new Promise<void>(ok=>server.close(()=>ok()));}
});
