import test from "node:test";
import assert from "node:assert/strict";
import glyphs from "../data/sign-glyphs.json" with {type:"json"};
import {buildings} from "../data/district-plan.ts";
import {districtSigns} from "../data/district-signs.ts";
import {entranceCouplets} from "../data/entrance-design.ts";
import {townConfig} from "../data/town-config.ts";

test("local relief font covers every building sign, district plaque and entrance couplet",()=>{
 const labels=[...buildings.flatMap(b=>b.name?[b.name]:[]),...Object.values(districtSigns).map(s=>s.text),...entranceCouplets.map(c=>c.text),townConfig.name,"AI教学楼","学习任务","创作挑战","社区活动"];
 for(const label of labels)for(const character of label.replace(/[\s☕]/gu,""))assert.ok(Object.hasOwn(glyphs,character),`${label}: missing relief glyph ${character}`);
});
