import test from 'node:test';
import assert from 'node:assert/strict';
import {handleDialogueKey} from '../data/npc-dialogue.ts';

test('dialog owns E and Space even when a dialog button has focus, without double activation',()=>{
 let advanced=0,closed=0,prevented=0,stopped=0;
 const send=(key:string,extra={})=>handleDialogueKey({key,repeat:false,isComposing:false,ctrlKey:false,altKey:false,metaKey:false,preventDefault(){prevented++;},stopPropagation(){stopped++;},...extra},()=>advanced++,()=>closed++);
 send('e');send('E');assert.equal(advanced,2);assert.equal(closed,0);
 send(' ');assert.equal(closed,1);assert.equal(advanced,2);
 send('Escape');assert.equal(closed,2);
 send('e',{repeat:true});assert.equal(advanced,2);
 send('e',{isComposing:true});send('e',{ctrlKey:true});send('Tab');send('Enter');
 assert.equal(advanced,2);assert.equal(closed,2);assert.equal(prevented,5);assert.equal(stopped,5);
});
