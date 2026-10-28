import {createTraffic,stepTraffic,overlapsCars,footprint} from '../data/traffic.ts';
let seed=931;const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const world=createTraffic(rng);let collisions=0,max=0;for(let i=0;i<60*600;i++){stepTraffic(world,1/60,[],rng);max=Math.max(max,world.cars.length);for(let a=0;a<world.cars.length;a++)for(let b=a+1;b<world.cars.length;b++)if(overlapsCars(footprint(world.cars[a]),footprint(world.cars[b]),0))collisions++;}
console.log({max,spawned:world.spawned,exited:world.exited,types:world.typesSeen.size,collisions,cars:world.cars.map(c=>({id:c.id,speed:c.speed,d:c.distance,remaining:c.route.length-c.distance,reason:c.reason,x:c.x,z:c.z})),locks:world.locks});
