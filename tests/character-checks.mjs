import {randomUUID} from 'node:crypto';
export async function checkCharacters({db,call,check,adminId,adminCookie,targetId,targetCookie}){
  const name=`QA${randomUUID().replaceAll('-','').slice(0,12)}`;
  const appearance={hairStyle:'pony',hairColor:'honey',shirtColor:'coral'};
  const save=(cookie,data)=>call('/api/account',{cookie,method:'PATCH',data});
  const concurrent=await Promise.all([
    save(adminCookie,{name,avatar:'wave',character:appearance}),
    save(targetCookie,{name:name.toLowerCase(),avatar:'leaf',character:appearance})
  ]);
  check(concurrent.filter(r=>r.status===200).length===1&&concurrent.filter(r=>r.status===409).length===1,'concurrent equivalent nicknames have one winner and one conflict');
  const winner=concurrent[0].status===200?adminCookie:targetCookie,loser=winner===adminCookie?targetCookie:adminCookie;
  const account=(await call('/api/account',{cookie:winner})).body.user;
  check(JSON.stringify(account.character)===JSON.stringify(appearance),'saved character appearance persists in the account');
  check((await save(winner,{name:account.name,avatar:'wave'})).status===200,'saving unchanged nickname is allowed');
  check(JSON.stringify((await call('/api/account',{cookie:winner})).body.user.character)===JSON.stringify(appearance),'legacy profile saves preserve character appearance');
  const fullWidth=[...name].map(c=>String.fromCharCode(c.charCodeAt(0)+0xfee0)).join('');
  const before=(await call('/api/account',{cookie:loser})).body.user;
  check((await save(loser,{name:` ${fullWidth} `,avatar:'sun',character:{...appearance,hairStyle:'bun'}})).status===409,'fullwidth and padded nickname cannot bypass uniqueness');
  const after=(await call('/api/account',{cookie:loser})).body.user;
  check(after.name===before.name&&after.avatar===before.avatar&&JSON.stringify(after.character)===JSON.stringify(before.character),'nickname conflict rolls back appearance and avatar changes');
  check((await save(winner,{name:account.name,avatar:'wave',character:{...appearance,hairStyle:'url'}})).status===400,'API rejects unsupported character values');
  let directConflict=false;
  try{await db.query('UPDATE "user" SET name=$1 WHERE id=$2',[name,winner===adminCookie?targetId:adminId]);}catch(error){directConflict=error.code==='23505';}
  check(directConflict,'database constraint prevents duplicate nicknames outside profile API');
}
