import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import sharp from 'sharp';
import {unlink} from 'node:fs/promises';
import {join} from 'node:path';
// Runs with the integration suite's disposable users; always restores the exact pre-test configuration.
export async function checkSiteSettings({base,db,call,check,adminId,adminCookie,residentCookie}){
  const baseline=(await db.query('SELECT * FROM town_site_settings WHERE id=1')).rows[0];
  let lastVersion=baseline.version;const assets=[];
  const save=async(group,value,version=lastVersion)=>{const result=await call('/api/system/settings',{cookie:adminCookie,method:'PATCH',data:{group,value,version}});if(result.status===200)lastVersion=result.body.version;return result;};
  const upload=async(bytes,type='image/png',cookie=adminCookie,origin=base)=>{const res=await fetch(base+'/api/system/site-assets',{method:'POST',headers:{'Content-Type':type,Origin:origin,...(cookie?{Cookie:cookie}:{})},body:bytes});return {status:res.status,body:await res.json()};};
  try{
    const publicValue=await call('/api/site-settings');
    check(publicValue.status===200&&Object.keys(publicValue.body).sort().join(',')==='brand,footer','public settings expose only the public appearance groups');
    check((await call('/api/system/settings')).status===401,'anonymous visitors cannot read settings history');
    check((await call('/api/system/settings',{cookie:residentCookie})).status===403,'residents cannot read system settings history');
    await db.query('UPDATE "user" SET role=\'admin\' WHERE id=$1',[adminId]);
    check((await save('brand',baseline.settings.brand)).status===403,'operators cannot modify website settings');
    check((await upload(Buffer.from('test'))).status===403,'operators cannot upload branding images');
    await db.query('UPDATE "user" SET role=\'super_admin\' WHERE id=$1',[adminId]);
    check((await call('/api/system/settings',{cookie:adminCookie,method:'PATCH',origin:'https://other.invalid',data:{version:lastVersion,group:'brand',value:baseline.settings.brand}})).status===403,'cross-origin website setting writes are rejected');
    check((await save('brand',{...baseline.settings.brand,text:''})).status===400,'empty branding is rejected');
    check((await save('brand',{...baseline.settings.brand,logo:'https://other.invalid/image.png'})).status===400,'external logo URLs are rejected');
    check((await save('footer',{...baseline.settings.footer,icp:'test',icpUrl:''})).status===400,'incomplete filing information is rejected');
    check((await save('footer',{...baseline.settings.footer,icp:'test',icpUrl:'javascript:alert(1)'})).status===400,'executable filing URLs are rejected');
    check((await upload(Buffer.from('<svg onload="alert(1)"></svg>'))).status===400,'SVG disguised as PNG is rejected');
    check((await upload(Buffer.alloc(2*1024*1024+1))).status===413,'oversized image uploads are rejected');
    const image=await sharp({create:{width:64,height:64,channels:4,background:'#227bbd'}}).png().toBuffer();
    check((await upload(image,'image/png','')).status===401,'anonymous uploads are rejected');
    check((await upload(image,'image/png',adminCookie,'https://other.invalid')).status===403,'cross-origin image uploads are rejected');
    const asset=await upload(image);assert.equal(asset.status,201,JSON.stringify(asset.body));assets.push(asset.body.path.split('/').pop());
    const media=await fetch(base+asset.body.path);check(media.status===200&&media.headers.get('content-type')==='image/webp','uploaded images are decoded and served as sanitized WebP');
    const brand={...baseline.settings.brand,text:'配置集成测试',logo:asset.body.path,icon:asset.body.path,shareImage:asset.body.path,title:'站点配置集成测试'};
    check((await save('brand',brand)).status===200,'super-admin can publish a brand configuration');
    check((await call('/api/site-settings')).body.brand.text===brand.text,'published configuration is visible to visitors');
    const refreshed=(await call('/api/system/settings',{cookie:adminCookie})).body;
    check(refreshed.version===lastVersion&&refreshed.actor&&refreshed.settings.brand.logo===asset.body.path,'settings survive reads and include author/version');
    check((await save('brand',{...brand,text:'过期编辑'},baseline.version)).status===409,'stale settings versions cannot overwrite newer edits');
    const footer={...baseline.settings.footer,company:'集成测试公司',copyright:'测试版权',icp:'测试ICP备案',icpUrl:'https://example.com/icp',police:'测试公安备案',policeUrl:'https://example.com/police'};
    check((await save('footer',footer)).status===200,'company and filing information can be published independently');
    const html=await (await fetch(base+'/')).text();
    check(html.includes('站点配置集成测试')&&html.includes('property="og:image"')&&html.includes(asset.body.path),'server-rendered metadata uses title and sharing image');
    check(html.includes('测试ICP备案')&&html.includes('https://example.com/icp'),'welcome footer renders configured filing links');
    const oldVersion=lastVersion;
    const restore=await call('/api/system/settings',{cookie:adminCookie,method:'PATCH',data:{version:lastVersion,group:'brand',restore:true}});assert.equal(restore.status,200,JSON.stringify(restore.body));lastVersion=restore.body.version;
    const restored=(await call('/api/site-settings')).body;
    check(lastVersion>oldVersion&&isDeepStrictEqual(restored.brand,baseline.settings.brand)&&restored.footer.company===footer.company,'restoring the previous brand creates a version and preserves footer changes');
    const logs=await db.query("SELECT details FROM town_audit WHERE actor_id=$1 AND action='site.update'",[adminId]);
    check(logs.rows.some(row=>row.details.beforeSettings&&row.details.afterSettings),'setting changes audit before and after values');
    const history=(await call('/api/system/settings',{cookie:adminCookie})).body;
    check(history.history.some(row=>row.restored_from!==null)&&history.previous.footer,'history supports per-group previous versions');
    // Two editors start from one version; precisely one wins.
    const concurrent=await Promise.all(['并发配置甲','并发配置乙'].map(text=>call('/api/system/settings',{cookie:adminCookie,method:'PATCH',data:{version:lastVersion,group:'brand',value:{...baseline.settings.brand,text}}})));
    lastVersion=concurrent.find(r=>r.status===200)?.body.version??lastVersion;
    check(concurrent.filter(r=>r.status===200).length===1&&concurrent.filter(r=>r.status===409).length===1,'simultaneous settings changes serialize and detect conflicts');
  }finally{
    await db.query('UPDATE "user" SET role=\'super_admin\' WHERE id=$1',[adminId]);
    const client=await db.connect();let clean=false;
    try{await client.query('BEGIN');const current=(await client.query('SELECT version FROM town_site_settings WHERE id=1 FOR UPDATE')).rows[0];
      if(current.version===lastVersion){await client.query('UPDATE town_site_settings SET version=$1,settings=$2,actor_id=$3,updated_at=$4 WHERE id=1',[baseline.version,JSON.stringify(baseline.settings),baseline.actor_id,baseline.updated_at]);await client.query('DELETE FROM town_site_versions WHERE actor_id=$1 AND version>$2',[adminId,baseline.version]);await client.query('DELETE FROM town_site_assets WHERE actor_id=$1',[adminId]);clean=true;}
      else console.warn('Settings changed outside this test; skipped fixture configuration cleanup to preserve newer work.');
      await client.query('COMMIT');
    }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
    if(clean)for(const id of assets)await unlink(join(process.cwd(),'.local','site-assets',`${id}.webp`));
  }
}
