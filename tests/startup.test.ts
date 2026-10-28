import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
// The launcher is plain Node.js so it can run before project dependencies exist.
import {launch,parseOptions} from '../scripts/start-town.mjs';

function fixture(t:{after:(fn:()=>void)=>void}){
 const base=resolve(tmpdir()),root=mkdtempSync(join(base,'560-startup-'));
 t.after(()=>{assert.ok(resolve(root).startsWith(base+sep));assert.ok(root.includes('560-startup-'));rmSync(root,{recursive:true,force:true});});
 writeFileSync(join(root,'package.json'),'{}');writeFileSync(join(root,'package-lock.json'),'{}');
 const commands:string[][]=[];
 const run=async(args:string[])=>{commands.push(args);if(args[0]==='ci')for(const name of ['next','react','three','typescript']){mkdirSync(join(root,'node_modules',name),{recursive:true});writeFileSync(join(root,'node_modules',name,'package.json'),'{}');}};
 return {root,commands,run,portCheck:async()=>{},log:()=>{}};
}
test('startup installs once, rebuilds production, and reinstalls when the lock changes',async t=>{
 const f=fixture(t);await launch({...f,args:['--port','32123']});
 assert.deepEqual(f.commands.map(a=>a.slice(0,2)),[['--version'],['ci','--include=dev'],['run','build'],['run','start']]);
 f.commands.length=0;await launch({...f,args:['--dev','--port','32123']});assert.equal(f.commands.some(a=>a[0]==='ci'),false);assert.equal(f.commands.some(a=>a[1]==='build'),false);assert.equal(f.commands.at(-1)?.[1],'dev');
 writeFileSync(join(f.root,'package-lock.json'),'{"changed":true}');f.commands.length=0;await launch({...f,args:[]});assert.ok(f.commands.some(a=>a[0]==='ci'));
});
test('occupied port fails before installation or building; failed install never starts the app',async t=>{
 const f=fixture(t);await assert.rejects(launch({...f,args:[],portCheck:async()=>{throw new Error('occupied');}}),/occupied/);assert.equal(f.commands.length,0);
 await assert.rejects(launch({...f,args:[],run:async(args:string[])=>{f.commands.push(args);if(args[0]==='ci')throw new Error('network failed');}}),/network failed/);
 assert.equal(f.commands.some(a=>a[0]==='run'),false);assert.equal(existsSync(join(f.root,'node_modules','.town-install-fingerprint')),false);
});
test('failed or interrupted build never advances to starting a stale production build',async t=>{
 const f=fixture(t);await assert.rejects(launch({...f,args:[],run:async(args:string[])=>{await f.run(args);if(args[1]==='build')throw new Error('build stopped');}}),/build stopped/);assert.equal(f.commands.some(a=>a[1]==='start'),false);
});
test('launcher validates arguments and keeps localhost default; network binding is explicit',()=>{
 assert.equal(parseOptions([],{}).lan,false);assert.equal(parseOptions(['--lan','--port','3002'],{}).port,'3002');
 for(const args of [['--port'],['--port','65536'],['--port','3000 & echo bad'],['--unknown']])assert.throws(()=>parseOptions(args,{}));
 assert.equal(parseOptions([],{PORT:'3005'}).port,'3005');
});
test('local auth development starts its database before serving and refuses LAN exposure',async t=>{
 const previous=process.env.BETTER_AUTH_URL;t.after(()=>{if(previous===undefined)delete process.env.BETTER_AUTH_URL;else process.env.BETTER_AUTH_URL=previous;});
 const f=fixture(t);writeFileSync(join(f.root,'.env.local'),'TOWN_LOCAL_AUTH=1\n');
 await launch({...f,args:['--dev','--port','3004']});
 assert.deepEqual(f.commands.slice(-2).map(args=>args.slice(0,2)),[['run','db:start'],['run','dev']]);
 assert.equal(process.env.BETTER_AUTH_URL,'http://localhost:3004');
 f.commands.length=0;await assert.rejects(launch({...f,args:['--dev','--lan']}),/--lan/);assert.equal(f.commands.some(args=>args[1]==='dev'),false);
});
