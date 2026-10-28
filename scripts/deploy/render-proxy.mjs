import {readFileSync,writeFileSync} from 'node:fs';
import {deploymentPaths,proxyLocationText,hostName} from './config.mjs';
const paths=deploymentPaths(process.env.TOWN_DEPLOY_ROOT);
const c=JSON.parse(readFileSync(`${paths.shared}/deploy.json`,'utf8'));
if(c.format!==2||c.projectRoot!==paths.projectRoot)throw new Error('保存配置不属于当前安装根。');
const host=hostName(c.previewHost||c.host);
if(!process.argv[2]?.startsWith(`/www/server/panel/vhost/nginx/proxy/${host}/`))throw new Error('代理配置不属于保存的站点域名。');
writeFileSync(process.argv[3],proxyLocationText(c),{mode:0o600});
