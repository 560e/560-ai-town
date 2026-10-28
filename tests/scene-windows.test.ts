import test from 'node:test';
import assert from 'node:assert/strict';
import {districtEntries,districtPresentation,districtPanelIntent} from '../data/district-entries.ts';
test('only implemented independent scenes navigate; five introduction districts open in place',()=>{
 assert.equal(districtPresentation('civic-hall'),'scene');
 assert.equal(districtPresentation('learning-campus'),'scene');
 for(const id of ['office-campus','creative-street','ai-community','town-square','task-square'])assert.equal(districtPresentation(id),'panel');
 assert.equal(districtPresentation('unknown'),null);
 assert.equal(districtEntries.filter(e=>districtPresentation(e.id)==='panel').length,5);
});
test('legacy panel intent accepts only known introduction districts, not arbitrary URLs or scenes',()=>{
 assert.equal(districtPanelIntent('creative-street'),'creative-street');
 for(const input of [undefined,['creative-street'],'https://example.com','civic-hall','learning-campus',''])assert.equal(districtPanelIntent(input),null);
});
