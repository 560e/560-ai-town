import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
export async function ask(label,fallback='',validate=x=>x,{secret=false}={}) {
  for(;;){
    const output=new Writable({write(chunk,_encoding,done){if(!secret)process.stdout.write(chunk);done();}});
    const rl=createInterface({input:process.stdin,output,terminal:true});
    rl.on('SIGINT',()=>{rl.close();process.exit(130);});
    const prompt=`${label}${fallback&&!secret?` [${fallback}]`:''}: `;
    if(secret)process.stdout.write(prompt);
    const answer=(await rl.question(secret?'':prompt))||fallback;rl.close();if(secret)console.log();
    try{return validate(answer);}catch(error){console.log(error.message);}
  }
}
