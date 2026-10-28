import {randomUUID} from 'node:crypto';
import {transaction} from '../lib/server/db.ts';
import {normalizedChat} from '../lib/moderation.ts';
export async function migrateModeration(){await transaction(async client=>{
 await client.query(`CREATE TABLE IF NOT EXISTS town_sensitive_words(
  id uuid PRIMARY KEY,term text NOT NULL,canonical text NOT NULL UNIQUE,category text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,version integer NOT NULL DEFAULT 1,
  updated_by text REFERENCES "user"(id) ON DELETE SET NULL,updated_at timestamptz NOT NULL DEFAULT now()
 );CREATE TABLE IF NOT EXISTS town_moderation_seed(id integer PRIMARY KEY CHECK(id=1),version integer NOT NULL);
 INSERT INTO town_moderation_seed(id,version) VALUES(1,0) ON CONFLICT DO NOTHING;`);
 const seed=(await client.query('SELECT version FROM town_moderation_seed WHERE id=1 FOR UPDATE')).rows[0];
 if(seed.version<1){
  const groups:Record<string,string[]>={
   '辱骂':['傻逼','傻比','煞笔','傻屌','操你妈','草你妈','你妈死了','死全家','王八蛋','狗杂种','滚蛋'],
   '人身侮辱':['脑残','白痴','智障','废物','垃圾人','人渣','贱人','狗东西','去死'],
   '政治敏感':['台独','港独','疆独','藏独','法轮功','东突厥斯坦','纳粹万岁','希特勒万岁']
  };
  for(const [category,terms] of Object.entries(groups))for(const term of terms)await client.query('INSERT INTO town_sensitive_words(id,term,canonical,category) VALUES($1,$2,$3,$4) ON CONFLICT(canonical) DO NOTHING',[randomUUID(),term,normalizedChat(term),category]);
  // Seed once: future migrations must not restore words that staff disabled or deleted.
  await client.query('UPDATE town_moderation_seed SET version=1 WHERE id=1');
 }
});}
