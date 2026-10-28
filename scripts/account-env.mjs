import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
export const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
