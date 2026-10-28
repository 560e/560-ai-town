import test from 'node:test';
import assert from 'node:assert/strict';
import {benches,canStand} from '../data/district-plan.ts';
import {buildings} from '../data/district-plan.ts';
import {walkSpawns} from '../data/town-config.ts';
import {createTownRuntime,nearestBench,sitOnBench,standFromBench,movePlayer,nearestNpc} from '../data/town-runtime.ts';
function world(){const r=createTownRuntime();r.npcs=[];r.traffic.cars=[];r.player.walking=r.player.exists=true;return r;}
test('all twelve benches support approaching, seating, movement lock and safe standing',()=>{
 assert.equal(benches.length,12);
 benches.forEach(([x,z],index)=>{const r=world();let found=false;
  for(const dz of [1.1,1.4,1.8,-1.4])for(const dx of [0,-1,1,-2,2]){if(found||!canStand(x+dx,z+dz))continue;r.player.x=x+dx;r.player.z=z+dz;if(nearestBench(r)===index)found=true;}
  assert.ok(found,`bench ${index} inaccessible`);const before=[r.player.x,r.player.z];assert.ok(sitOnBench(r,index));assert.deepEqual([r.player.x,r.player.z],[x,z]);assert.equal(nearestNpc(r),null);movePlayer(r,10,10);assert.deepEqual([r.player.x,r.player.z],[x,z]);assert.ok(standFromBench(r));assert.deepEqual([r.player.x,r.player.z],before);assert.ok(canStand(r.player.x,r.player.z));assert.equal(r.player.seat,null);
 });
});
test('seating requires nearby active player and does not trigger during typing or dialogue',()=>{
 const r=world();assert.equal(sitOnBench(r,0),false);[r.player.x,r.player.z]=[benches[0][0],benches[0][1]+1.4];assert.equal(nearestBench(r),0);
 for(const mode of ['typing','talking','overview']){r.player.typing=mode==='typing';r.talkingId=mode==='talking'?'npc':null;r.player.walking=mode!=='overview';assert.equal(nearestBench(r),null);assert.equal(sitOnBench(r,0),false);}
});
test('standing chooses another safe position when the arrival position is occupied',()=>{
 const r=world();[r.player.x,r.player.z]=[benches[0][0],benches[0][1]+1.4];assert.ok(sitOnBench(r,0));const n=createTownRuntime().npcs[0];n.x=benches[0][0];n.z=benches[0][1]+1.4;r.npcs=[n];assert.ok(standFromBench(r));assert.ok(Math.hypot(r.player.x-n.x,r.player.z-n.z)>=.9);assert.ok(canStand(r.player.x,r.player.z));
});
test('service centre navigation lands on its public forecourt',()=>{const [x,z]=walkSpawns.service;assert.ok(canStand(x,z));const civic=buildings.find(b=>b.id==='civic')!;assert.ok(Math.abs(x-civic.position[0])<civic.size[0]/2);assert.ok(z>civic.position[1]+civic.size[1]/2&&z<civic.position[1]+civic.size[1]/2+10);});
