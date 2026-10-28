import {createServer} from 'node:net';
import {port} from './config.mjs';

export async function freePort(value) {
  const checked=port(value);
  await new Promise((ok,fail)=>{
    const server=createServer();
    server.once('error',fail);
    server.listen(checked,'127.0.0.1',()=>server.close(error=>error?fail(error):ok()));
  });
}

// Probe only: never kill a process or silently choose a different listening port.
export async function choosePort({prompt,initial=3000,check=freePort,notify=console.log}) {
  let candidate=port(initial);
  for(;;){
    candidate=port(await prompt(String(candidate)));
    try{await check(candidate);return candidate;}
    catch(error){
      if(error.code!=='EADDRINUSE')throw error;
      notify(`端口 ${candidate} 已被占用，不会停止占用它的服务。请输入其他端口。`);
      candidate=candidate===65535?1024:candidate+1;
    }
  }
}

export async function recheckPort({prompt,current,check=freePort,notify=console.log}) {
  try{await check(current);return current;}
  catch(error){
    if(error.code!=='EADDRINUSE')throw error;
    notify(`端口 ${current} 在部署期间被其他程序占用，请重新选择。`);
    return choosePort({prompt,initial:current===65535?1024:current+1,check,notify});
  }
}
