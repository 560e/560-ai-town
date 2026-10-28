import test from 'node:test';
import assert from 'node:assert/strict';
import {navigatePanel,backPanel,type PanelHistory} from '../components/service/panel-navigation.ts';

test('nested service pages return within the same scene and saving does not reopen the submitted form',()=>{
 const initial:PanelHistory<string>={current:'board',past:[]};
 const form=navigatePanel(initial,'title');
 const saved=navigatePanel(form,'application',true);
 assert.equal(saved.current,'application');
 assert.equal(backPanel(saved).current,'board');
 assert.deepEqual(initial,{current:'board',past:[]});
});

test('catalog navigation returns to its NPC and duplicate pages do not trap Back',()=>{
 const initial:PanelHistory<string>={current:'guide',past:[]};
 const catalog=navigatePanel(initial,'catalog');
 assert.deepEqual(navigatePanel(catalog,'catalog'),catalog);
 assert.deepEqual(backPanel(catalog),initial);
 assert.deepEqual(backPanel(initial),initial);
});
