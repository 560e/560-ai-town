import {transaction} from '../lib/server/db.ts';
export async function migrateCharacters(){
 await transaction(async client=>{
  await client.query(`ALTER TABLE town_profiles ADD COLUMN IF NOT EXISTS identity_display jsonb NOT NULL DEFAULT '["resident"]', ADD COLUMN IF NOT EXISTS identity_display_version integer NOT NULL DEFAULT 0`);
  await client.query('LOCK TABLE "user" IN ACCESS EXCLUSIVE MODE');
  await client.query(`CREATE OR REPLACE FUNCTION town_nickname_key(value text) RETURNS text LANGUAGE SQL IMMUTABLE STRICT AS $$ SELECT lower(regexp_replace(btrim(normalize(value,NFKC)), ' +', ' ', 'g')) $$`);
  const duplicates=await client.query('SELECT count(*)::int AS groups FROM (SELECT town_nickname_key(name) FROM "user" GROUP BY 1 HAVING count(*)>1) d');
  if(duplicates.rows[0].groups)throw new Error(`存在${duplicates.rows[0].groups}组重复昵称，请先处理后再启用唯一约束`);
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS town_user_nickname_unique ON "user" (town_nickname_key(name))');
  await client.query(`ALTER TABLE town_profiles ADD COLUMN IF NOT EXISTS character jsonb NOT NULL DEFAULT '{"hairStyle":"short","hairColor":"ink","shirtColor":"green"}'`);
 });
}
