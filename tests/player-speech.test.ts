import test from "node:test";
import assert from "node:assert/strict";
import {prepareSpeech,limitSpeech,speechCharacters,SPEECH_LIMIT} from "../data/player-speech.ts";
import {createTownRuntime,nearestNpc} from "../data/town-runtime.ts";
test("player speech trims blank input and counts complete emoji and Chinese characters",()=>{
 assert.equal(prepareSpeech(" \n\t "),"");assert.equal(prepareSpeech("  你好\n小镇  "),"你好 小镇");assert.equal(speechCharacters("你好👨‍👩‍👧‍👦").length,3);assert.equal(speechCharacters(limitSpeech("👨‍👩‍👧‍👦".repeat(70))).length,SPEECH_LIMIT);assert.equal(limitSpeech("你好".repeat(40)).length,60);assert.equal(prepareSpeech('<b>你好</b>'),'<b>你好</b>');
});
test("typing suppresses nearby NPC interaction until the composer closes",()=>{
 const world=createTownRuntime();world.player.walking=true;world.player.x=41;world.player.z=5;world.npcs[0].x=41;world.npcs[0].z=3;assert.ok(nearestNpc(world));world.player.typing=true;assert.equal(nearestNpc(world),null);world.player.typing=false;assert.ok(nearestNpc(world));
});
