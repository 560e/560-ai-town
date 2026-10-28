import test from "node:test";
import assert from "node:assert/strict";
import {townDistance} from '../data/town-scale.ts';
import {roads,townConfig} from "../data/town-config.ts";
import {boundaryOpacity,vehicleTypes} from "../data/traffic.ts";
import {readMusicSettings,musicLevel} from "../data/audio-settings.ts";
import {readFileSync} from "node:fs";
test("roads stay inside the unified base and cars fade before any body protrudes",()=>{
 const maxX=Math.max(...townConfig.outline.map(p=>p[0]));for(const r of roads)assert.ok(Math.abs(r.position[0])+r.size[0]/2+.2<maxX);
 for(let type=0;type<vehicleTypes.length;type++)for(const heading of [0,.4,Math.PI/2,Math.PI])for(let x=townDistance(56);x<townDistance(81);x+=.2){const opacity=boundaryOpacity({x,heading,type});assert.ok(opacity>=0&&opacity<=1);const v=vehicleTypes[type],half=Math.abs(Math.sin(heading))*v.length/2+Math.abs(Math.cos(heading))*v.width/2;if(x+half>=townDistance(66))assert.equal(opacity,0);assert.equal(boundaryOpacity({x:-x,heading,type}),opacity);}
});
test("audio starts off even with a saved enabled preference, preserves volume, and ducks for dialogue",()=>{
 assert.deepEqual(readMusicSettings(null),{enabled:false,volume:12});assert.deepEqual(readMusicSettings("bad"),{enabled:false,volume:12});assert.deepEqual(readMusicSettings('{"enabled":false,"volume":32}'),{enabled:false,volume:32});assert.equal(readMusicSettings('{"volume":200}').volume,100);assert.equal(readMusicSettings('{"volume":-5}').volume,0);assert.deepEqual(readMusicSettings('{"enabled":true,"volume":25}'),{enabled:false,volume:25});assert.equal(musicLevel(18,false),.18);assert.equal(musicLevel(18,true),.18*.26);assert.equal(musicLevel(0,true),0);
 const info=JSON.parse(readFileSync(new URL("../public/audio/coast-info.json",import.meta.url),"utf8"));assert.equal(info.durationSeconds,72);assert.ok(info.peak<.9&&info.peak>.1);assert.ok(info.rms<.06&&info.rms>.03);
});
