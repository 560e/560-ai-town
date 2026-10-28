import {database} from '../lib/server/db.ts';
export async function migrateAcademyAssets(db:Pick<ReturnType<typeof database>,'query'>=database()){
 await db.query(`CREATE TABLE IF NOT EXISTS academy_assets (
 id uuid PRIMARY KEY,actor_id text REFERENCES "user"(id) ON DELETE SET NULL,
 name text NOT NULL,mime text NOT NULL,bytes bigint NOT NULL CHECK(bytes>0),
 storage_key text NOT NULL UNIQUE,sha256 text NOT NULL,width integer,height integer,duration double precision,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','disabled')),
 created_at timestamptz NOT NULL DEFAULT now());
 ALTER TABLE academy_assets ADD COLUMN IF NOT EXISTS duration double precision;
 CREATE INDEX IF NOT EXISTS academy_assets_actor ON academy_assets(actor_id,created_at);`);
}
