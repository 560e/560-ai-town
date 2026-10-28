import {database} from '../lib/server/db.ts';
export async function migrateAcademy(query=database()){await query.query(`
CREATE TABLE IF NOT EXISTS academy_groups(id uuid PRIMARY KEY,kind text NOT NULL CHECK(kind IN('path','series')),title text NOT NULL,description text NOT NULL,sort integer NOT NULL DEFAULT 0,published boolean NOT NULL DEFAULT false,path_id uuid REFERENCES academy_groups(id));
CREATE TABLE IF NOT EXISTS academy_courses(id uuid PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS academy_versions(id uuid PRIMARY KEY,course_id uuid NOT NULL REFERENCES academy_courses(id),version integer NOT NULL,revision integer NOT NULL DEFAULT 1,status text NOT NULL CHECK(status IN('draft','review','published','rejected','retired')),content jsonb NOT NULL,reason text NOT NULL DEFAULT '',actor_id text REFERENCES "user"(id) ON DELETE SET NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(course_id,version),UNIQUE(course_id,id));
CREATE UNIQUE INDEX IF NOT EXISTS academy_one_editable ON academy_versions(course_id) WHERE status IN('draft','review','rejected');
CREATE TABLE IF NOT EXISTS academy_enrollments(user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,course_id uuid NOT NULL REFERENCES academy_courses(id),version_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,course_id),FOREIGN KEY(course_id,version_id) REFERENCES academy_versions(course_id,id),UNIQUE(user_id,version_id));
CREATE TABLE IF NOT EXISTS academy_progress(user_id text NOT NULL,version_id uuid NOT NULL,unit_id uuid NOT NULL,completed boolean NOT NULL DEFAULT false,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,version_id,unit_id),FOREIGN KEY(user_id,version_id) REFERENCES academy_enrollments(user_id,version_id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS academy_video_progress(user_id text NOT NULL,version_id uuid NOT NULL,unit_id uuid NOT NULL,block_id uuid NOT NULL,intervals jsonb NOT NULL DEFAULT '[]',duration double precision NOT NULL,last_at timestamptz NOT NULL DEFAULT now(),last_position double precision NOT NULL DEFAULT 0,PRIMARY KEY(user_id,version_id,unit_id,block_id),FOREIGN KEY(user_id,version_id) REFERENCES academy_enrollments(user_id,version_id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS academy_external_courses (
 id uuid PRIMARY KEY,title text NOT NULL,summary text NOT NULL DEFAULT '',url text NOT NULL DEFAULT '',
 cover_asset_id uuid REFERENCES academy_assets(id),sort integer NOT NULL DEFAULT 0 CHECK(sort>=0),
 published boolean NOT NULL DEFAULT false,revision integer NOT NULL DEFAULT 1,
 actor_id text REFERENCES "user"(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS academy_external_public ON academy_external_courses(sort,created_at DESC) WHERE published;
`);}
