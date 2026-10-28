import {database} from '../lib/server/db.ts';
import {initialServiceContent} from '../lib/service.ts';
export async function migrateService(){const pool=database();await pool.query(`
CREATE TABLE IF NOT EXISTS town_service_titles(id uuid PRIMARY KEY,version integer NOT NULL DEFAULT 1,draft jsonb NOT NULL,published jsonb,published_version integer,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS town_service_title_versions(id bigserial PRIMARY KEY,title_id uuid NOT NULL REFERENCES town_service_titles(id),version integer NOT NULL,config jsonb NOT NULL,actor_id text REFERENCES "user"(id) ON DELETE SET NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(title_id,version));
CREATE TABLE IF NOT EXISTS town_service_staff(user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,policy jsonb NOT NULL,version integer NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS town_service_guides(id uuid PRIMARY KEY,version integer NOT NULL DEFAULT 1,draft jsonb NOT NULL,published jsonb,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS town_service_content(id integer PRIMARY KEY CHECK(id=1),version integer NOT NULL DEFAULT 0,draft jsonb NOT NULL,published jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS town_service_applications(id uuid PRIMARY KEY,user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,title_id uuid NOT NULL REFERENCES town_service_titles(id),version integer NOT NULL DEFAULT 1,status text NOT NULL CHECK(status IN('draft','pending','returned','approved','rejected','withdrawn')),answers jsonb NOT NULL,snapshot jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE town_service_applications ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE town_service_applications ADD COLUMN IF NOT EXISTS deleted_by text REFERENCES "user"(id) ON DELETE SET NULL;
ALTER TABLE town_service_applications ADD COLUMN IF NOT EXISTS deleted_reason text;
DROP INDEX IF EXISTS town_service_open_application;
CREATE UNIQUE INDEX town_service_open_application ON town_service_applications(user_id,title_id) WHERE deleted_at IS NULL AND status IN('draft','pending','returned');
CREATE TABLE IF NOT EXISTS town_service_events(id bigserial PRIMARY KEY,application_id uuid NOT NULL REFERENCES town_service_applications(id) ON DELETE CASCADE,actor_id text REFERENCES "user"(id) ON DELETE SET NULL,action text NOT NULL,message text NOT NULL,snapshot jsonb,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS town_service_grants(id uuid PRIMARY KEY,user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,title_id uuid NOT NULL REFERENCES town_service_titles(id),source text NOT NULL,application_id uuid REFERENCES town_service_applications(id) ON DELETE SET NULL,actor_id text REFERENCES "user"(id) ON DELETE SET NULL,snapshot jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz,revoked_at timestamptz,revoke_reason text);
CREATE INDEX IF NOT EXISTS town_service_grants_owner ON town_service_grants(user_id,title_id);
CREATE TABLE IF NOT EXISTS town_service_notices(id bigserial PRIMARY KEY,user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,message text NOT NULL,application_id uuid REFERENCES town_service_applications(id) ON DELETE CASCADE,created_at timestamptz NOT NULL DEFAULT now(),read_at timestamptz);
ALTER TABLE town_service_titles ADD COLUMN IF NOT EXISTS internal_note text NOT NULL DEFAULT '';
ALTER TABLE town_service_applications ADD COLUMN IF NOT EXISTS draft_answers jsonb;
ALTER TABLE town_service_applications ADD COLUMN IF NOT EXISTS draft_snapshot jsonb;
`);await pool.query('INSERT INTO town_service_content(id,draft,published) VALUES(1,$1,$1) ON CONFLICT DO NOTHING',[JSON.stringify(initialServiceContent)]);}
