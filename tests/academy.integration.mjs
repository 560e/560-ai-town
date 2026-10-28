import '../scripts/account-env.mjs';
import assert from 'node:assert/strict';
import {randomInt,randomUUID} from 'node:crypto';
import {unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {Pool} from 'pg';
import sharp from 'sharp';
import {localHttp as fetch} from './local-http.mjs';
assert.equal(process.env.TOWN_DISPOSABLE_TEST_DB,'1');
const url=new URL(process.env.DATABASE_URL),base=process.env.PASSWORD_TEST_URL;
assert.equal(url.hostname,'127.0.0.1');assert.match(url.pathname,/^\/town_verify_[a-z0-9_]+$/);assert.equal(new URL(base).hostname,'127.0.0.1');
const db=new Pool({connectionString:url.href}),assets=[],people=[];let checks=0;
function check(value,label){assert.ok(value,label);checks++;console.log('PASS academy '+label);}
async function call(path,person,data){const r=await fetch(base+path,{method:data?'POST':'GET',headers:{Host:'town-password.test','x-forwarded-host':'town-password.test','x-forwarded-proto':'https',Origin:'https://town-password.test','x-real-ip':person?.ip||'127.0.0.91','x-forwarded-for':person?.ip||'127.0.0.91',...(person?.cookie?{Cookie:person.cookie}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});const raw=await r.text();let body;try{body=JSON.parse(raw);}catch{body=raw;}return {status:r.status,body,cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')};}
const manage=(p,data)=>call('/api/manage/academy',p,data);
async function save(p,course){const r=await manage(p,{op:'save',course});assert.equal(r.status,200,JSON.stringify(r.body));return {...course,id:r.body.id,revision:r.body.revision};}
try{
 for(let i=0;i<2;i++){const phoneNumber=`+86196${randomInt(10000000,99999999)}`,r=await call('/api/auth/password/register',{ip:`127.0.0.${92+i}`},{name:'测试'+Math.random().toString(36).slice(2,12),phoneNumber,password:'AcademyTest'+randomUUID()+'42'});assert.equal(r.status,200,JSON.stringify(r.body));const id=(await db.query('SELECT id FROM "user" WHERE "phoneNumber"=$1',[phoneNumber])).rows[0].id;people.push({id,ip:`127.0.0.${92+i}`,cookie:r.cookie});}
 const [admin,learner]=people;await db.query('UPDATE "user" SET role=\'admin\' WHERE id=$1',[admin.id]);
 check((await call('/api/academy')).status===401,'anonymous catalog denied');
 check((await manage()).status===401,'anonymous management denied');
 check((await manage(learner)).status===403,'resident cannot read management');
 const course={title:'外部学院验证课程',summary:'学习发生在外部课程平台。',url:'https://example.com/course?lesson=1',coverAssetId:null,sort:30,published:false};
 check((await manage(learner,{op:'save',course})).status===403,'resident cannot save');
 check((await manage(null,{op:'save',course})).status===401,'anonymous cannot save');
 for(const url of ['javascript:alert(1)','data:text/html,hello','//example.com','https://user:secret@example.com'])check((await manage(admin,{op:'save',course:{...course,url}})).status===400,'unsafe URL rejected '+url.split(':')[0]);
 const text=await call('/api/academy/assets',admin,{name:'资料.txt',mime:'text/plain',data:Buffer.from('资料').toString('base64')});check(text.status===400,'non-image uploads disabled');
 const image=await sharp({create:{width:8,height:8,channels:3,background:'#3388dd'}}).png().toBuffer();
 check((await call('/api/academy/assets',learner,{name:'封面.png',mime:'image/png',data:image.toString('base64')})).status===403,'resident cannot upload');
 const upload=await call('/api/academy/assets',admin,{name:'封面.png',mime:'image/png',data:image.toString('base64')});assert.equal(upload.status,200,JSON.stringify(upload.body));const cover=upload.body.asset.id;assets.push(cover);
 check(upload.body.asset.status==='approved','image cover approved directly');
 check((await call('/api/academy/assets/'+cover,learner)).status===404,'unreferenced cover protected');
 check((await call('/api/academy/assets/'+cover)).status===401,'anonymous cover denied');
 check((await call('/api/academy/assets',admin,{op:'review',id:cover,status:'approved',reason:'旧流程'})).status===410,'legacy asset review disabled');
 let first=await save(admin,{...course,coverAssetId:cover});check(!!first.id&&first.revision===1,'create returns ID and revision');
 check(!(await call('/api/academy',learner)).body.courses.some(c=>c.id===first.id),'unpublished course hidden');
 check((await manage(admin)).body.courses.some(c=>c.id===first.id),'operator sees unpublished course');
 check((await call('/api/academy/assets/'+cover,learner)).status===404,'draft referenced cover protected');
 check((await manage(admin,{op:'save',course:{...first,revision:2}})).status===409,'stale revision rejected');
 first=await save(admin,{...first,published:true});check(first.revision===2,'publish increments revision');
 const second=await save(admin,{...course,title:'排序优先课程',sort:2,published:true});
 const catalog=(await call('/api/academy',learner)).body.courses;check(catalog.findIndex(c=>c.id===second.id)<catalog.findIndex(c=>c.id===first.id),'catalog follows explicit ordering');
 check(catalog.find(c=>c.id===first.id)?.url===course.url,'published catalog exposes external URL');
 check((await call('/api/academy/assets/'+cover,learner)).status===200,'published cover readable to resident');
 first=await save(admin,{...first,title:'修订外部课程',sort:1});check((await call('/api/academy',learner)).body.courses.find(c=>c.id===first.id)?.title===first.title,'edit updates published course');
 first=await save(admin,{...first,published:false});check(!(await call('/api/academy',learner)).body.courses.some(c=>c.id===first.id),'unpublish hides course');
 check((await call('/api/academy/assets/'+cover,learner)).status===404,'unpublishing removes cover access');
 const oldCourse=randomUUID(),oldVersion=randomUUID(),unit=randomUUID();await db.query('INSERT INTO academy_courses(id) VALUES($1)',[oldCourse]);await db.query("INSERT INTO academy_versions(id,course_id,version,status,content) VALUES($1,$2,1,'published',$3)",[oldVersion,oldCourse,{title:'历史保留课程',units:[]}]);await db.query('INSERT INTO academy_enrollments(user_id,course_id,version_id) VALUES($1,$2,$3)',[learner.id,oldCourse,oldVersion]);await db.query('INSERT INTO academy_progress(user_id,version_id,unit_id,completed) VALUES($1,$2,$3,true)',[learner.id,oldVersion,unit]);
 for(const view of ['mine','paths','course'])check((await call('/api/academy?view='+view,learner)).status===410,'legacy '+view+' reads disabled');
 for(const op of ['enroll','complete','videoStart','video'])check((await call('/api/academy',learner,{op,courseId:oldCourse,versionId:oldVersion,unitId:unit})).status===410,'legacy resident '+op+' disabled');
 for(const op of ['saveDraft','saveGroup','submit','review','newVersion','retire'])check((await manage(admin,{op,courseId:oldCourse,versionId:oldVersion,content:{}})).status===410,'legacy management '+op+' disabled');
 check((await db.query('SELECT completed FROM academy_progress WHERE user_id=$1 AND version_id=$2',[learner.id,oldVersion])).rows[0]?.completed===true,'historical progress preserved');
 check(Number((await db.query('SELECT count(*) AS n FROM academy_enrollments WHERE user_id=$1 AND course_id=$2',[learner.id,oldCourse])).rows[0].n)===1,'historical enrollment preserved');
 check(!(await call('/api/academy',learner)).body.courses.some(c=>c.id===oldCourse),'internal historic content not exposed in external catalog');
 check(Number((await db.query("SELECT count(*) AS n FROM town_audit WHERE actor_id=$1 AND action LIKE 'academy.%'",[admin.id])).rows[0].n)>=6,'external changes audited');
 console.log(`PASS academy ${checks} integration checks`);
}finally{await db.end();for(const id of assets){assert.match(id,/^[a-f0-9-]{36}$/);await unlink(join(process.cwd(),'.local','academy-assets',id+'.asset')).catch(()=>{});}}



