import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {managementEntries} from '../lib/server/management-entry.ts';
import {ensureManagementEntries} from '../scripts/management-entry.mjs';

test('management entry configuration rejects missing, weak and duplicate routes',()=>{
  const before={manage:process.env.TOWN_MANAGE_ENTRY,system:process.env.TOWN_SYSTEM_ENTRY};
  try{
    delete process.env.TOWN_MANAGE_ENTRY;delete process.env.TOWN_SYSTEM_ENTRY;
    assert.equal(managementEntries(),null);
    process.env.TOWN_MANAGE_ENTRY='admin';process.env.TOWN_SYSTEM_ENTRY='manage';
    assert.equal(managementEntries(),null);
    process.env.TOWN_MANAGE_ENTRY=`gate-${'a'.repeat(32)}`;process.env.TOWN_SYSTEM_ENTRY=process.env.TOWN_MANAGE_ENTRY;
    assert.equal(managementEntries(),null);
    process.env.TOWN_SYSTEM_ENTRY=`gate-${'b'.repeat(32)}`;
    assert.equal(managementEntries()?.manage,`/gate-${'a'.repeat(32)}`);
  }finally{for(const [key,value]of [['TOWN_MANAGE_ENTRY',before.manage],['TOWN_SYSTEM_ENTRY',before.system]]){if(value===undefined)delete process.env[key!];else process.env[key!]=value;}}
});

test('local entry provisioning uses distinct persistent random paths without changing existing settings',()=>{
  const dir=mkdtempSync(join(tmpdir(),'town-entry-'));
  const before={manage:process.env.TOWN_MANAGE_ENTRY,system:process.env.TOWN_SYSTEM_ENTRY};
  try{
    delete process.env.TOWN_MANAGE_ENTRY;delete process.env.TOWN_SYSTEM_ENTRY;
    const file=join(dir,'.env.local');writeFileSync(file,'KEEP_EXISTING=value\n');
    assert.equal(ensureManagementEntries(dir),2);
    const content=readFileSync(file,'utf8');
    const values=[...content.matchAll(/^TOWN_(?:MANAGE|SYSTEM)_ENTRY=(gate-[a-f0-9]{32})$/gm)].map(match=>match[1]);
    assert.equal(values.length,2);assert.notEqual(values[0],values[1]);
    assert.ok(content.startsWith('KEEP_EXISTING=value\n'));
    assert.equal(ensureManagementEntries(dir),0);assert.equal(readFileSync(file,'utf8'),content);
  }finally{rmSync(dir,{recursive:true,force:true});for(const [key,value]of [['TOWN_MANAGE_ENTRY',before.manage],['TOWN_SYSTEM_ENTRY',before.system]]){if(value===undefined)delete process.env[key!];else process.env[key!]=value;}}
});
