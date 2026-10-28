import '../scripts/account-env.mjs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {nextPublicRoom} from '../lib/server/rooms.ts';
assert.equal(process.env.TOWN_LOCAL_AUTH,'1');
const db=new Pool({connectionString:process.env.DATABASE_URL}),c=await db.connect();let checks=0;
const check=(v,label)=>{assert.ok(v,label);checks++;console.log('✓ '+label);};
try{
 await c.query('BEGIN');
 // Connection-local shadow tables: never fill or change the user's real public room.
 await c.query('CREATE TEMP TABLE town_rooms(number integer PRIMARY KEY,instance uuid,created_by text,password_hash text) ON COMMIT DROP');
 await c.query('CREATE TEMP TABLE "user"(id text,banned boolean) ON COMMIT DROP');
 await c.query('CREATE TEMP TABLE session(id text,"expiresAt" timestamptz) ON COMMIT DROP');
 await c.query('CREATE TEMP TABLE town_presence(user_id text,session_id text,room integer,room_instance uuid,online boolean,updated_at timestamptz) ON COMMIT DROP');
 for(const n of [1,2,3,5,9])await c.query('INSERT INTO town_rooms VALUES($1,$2,$3,$4)',[n,randomUUID(),'host',n===2?'locked':null]);
 await c.query('INSERT INTO "user" SELECT n::text,false FROM generate_series(1,100) n');
 await c.query('INSERT INTO session SELECT n::text,now()+interval \'1 hour\' FROM generate_series(1,100) n');
 check((await nextPublicRoom(c,'guest',9)).number===1,'removed resident prefers available public room 1');
 await c.query('INSERT INTO town_presence SELECT n::text,n::text,1,r.instance,true,clock_timestamp() FROM generate_series(1,50) n CROSS JOIN town_rooms r WHERE r.number=1');
 check((await nextPublicRoom(c,'guest',9)).number===3,'full room 1 skips password room 2 and uses available room 3');
 await c.query('INSERT INTO town_presence SELECT n::text,n::text,3,r.instance,true,clock_timestamp() FROM generate_series(51,100) n CROSS JOIN town_rooms r WHERE r.number=3');
 const created=await nextPublicRoom(c,'guest',9);check(created.number===4&&!created.password_hash&&created.created_by==='guest','full earlier rooms create the first unused public number and assign its creator as host');
 await c.query("UPDATE town_rooms SET password_hash='locked' WHERE number=4");
 check((await nextPublicRoom(c,'guest',9)).number===5,'routing skips multiple full or password rooms in ascending order');
 check((await nextPublicRoom(c,'guest',5)).number===6,'routing never sends someone back to the room they were removed from');
 await c.query('UPDATE town_presence SET updated_at=now()-interval \'9 seconds\' WHERE room=1');
 check((await nextPublicRoom(c,'guest',9)).number===1,'expired sessions do not block public room capacity');
 console.log(`Passed ${checks} automatic room routing checks.`);
}finally{await c.query('ROLLBACK');c.release();await db.end();}
