import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,realpathSync,statSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validRelease} from '../scripts/deploy/recovery.mjs';

test('recovery only accepts built releases inside this installation and its exact shared configuration',()=>{
  const root=mkdtempSync(join(tmpdir(),'town-recovery-'));
  try{
    const base=join(root,'.deployment'),release=join(base,'releases','version');
    mkdirSync(join(release,'.next'),{recursive:true});mkdirSync(join(release,'node_modules/next/dist/bin'),{recursive:true});mkdirSync(join(base,'shared'),{recursive:true});
    writeFileSync(join(release,'.next/BUILD_ID'),'build');writeFileSync(join(release,'node_modules/next/dist/bin/next'),'');writeFileSync(join(base,'shared/.env.local'),'');
    assert.equal(validRelease(base,release),false);
    // Junctions need no special Windows symlink privilege.
    mkdirSync(join(release,'.local'));
    writeFileSync(join(release,'.env.local'),'wrong configuration');
    assert.equal(validRelease(base,release),false);
    rmSync(join(release,'.env.local'));
    // Windows cannot create file symlinks without elevation; inject only link resolution.
    const fs={statSync,realpathSync:(p:string)=>realpathSync(p===join(release,'.env.local')?join(base,'shared/.env.local'):p)};
    assert.equal(validRelease(base,release,fs),true);
    assert.equal(validRelease(base,join(root,'outside')),false);
    rmSync(join(release,'.next/BUILD_ID'));assert.equal(validRelease(base,release),false);
  }finally{rmSync(root,{recursive:true,force:true});}
});
