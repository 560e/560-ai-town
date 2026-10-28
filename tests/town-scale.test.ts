import test from 'node:test';
import assert from 'node:assert/strict';
import {TOWN_SCALE,townPoint,townBounds} from '../data/town-scale.ts';
import {buildings,benches,canStand} from '../data/district-plan.ts';
import {places} from '../data/places.ts';
import {roads,walkSpawns,townConfig} from '../data/town-config.ts';
import {serviceEntrance} from '../data/service-entrance.ts';
import {nodes,boundaryOpacity,vehicleTypes} from '../data/traffic.ts';

test('main town footprint expands by 1.5 on each horizontal axis, with unchanged building and vehicle sizes',()=>{
 assert.equal(TOWN_SCALE,1.5);
 assert.deepEqual(townPoint([41,30]),[61.5,45]);
 assert.deepEqual(places.find(p=>p.id==='ai-community')!.size,[46.5,36]);
 assert.deepEqual(buildings.find(b=>b.id==='civic')!.position,[-61.5,-51]);
 assert.deepEqual(buildings.find(b=>b.id==='civic')!.size,[21,11]);
 assert.deepEqual(roads.find(r=>r.id==='east-ring')!.position,[90,-2.25]);
 assert.deepEqual(roads.find(r=>r.id==='east-ring')!.size,[9,142.5]);
 assert.equal(Math.max(...townConfig.outline.map(p=>p[0])),100.5);
 assert.deepEqual(benches[0],[-16.5,-10.5]);
 assert.equal(vehicleTypes[0].length,3.1);
 assert.ok(canStand(90,0),'new outer ring supports standing beyond old boundary');
 assert.ok(!canStand(townBounds.maxX+1,0),'outside new boundary remains blocked');
});
test('navigation and traffic share expanded coordinates while wall service arrival stays near the actual doorway',()=>{
 assert.deepEqual(walkSpawns.service,[serviceEntrance.arrival.x,serviceEntrance.arrival.z]);
 const civic=buildings.find(b=>b.id==='civic')!;
 assert.ok(Math.abs(walkSpawns.service[1]-(civic.position[1]+civic.size[1]/2))<2);
 assert.deepEqual(nodes[0],[-90,-73.5]);
 assert.equal(boundaryOpacity({x:90,heading:Math.PI/2,type:0}),1);
 assert.equal(boundaryOpacity({x:100.5,heading:Math.PI/2,type:0}),0);
});
