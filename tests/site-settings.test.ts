import test from "node:test";
import assert from "node:assert/strict";
import {defaultSiteSettings,validateGroup} from "../lib/site-settings.ts";
test("site settings require matching filing numbers and safe links",()=>{
  assert.throws(()=>validateGroup("footer",{...defaultSiteSettings.footer,icp:"测试备案"}),/一起/);
  assert.throws(()=>validateGroup("footer",{...defaultSiteSettings.footer,icp:"测试备案",icpUrl:"javascript:alert(1)"}),/HTTPS/);
  assert.throws(()=>validateGroup("footer",{...defaultSiteSettings.footer,icp:"测试备案",icpUrl:"https://user:pass@example.com"}),/HTTPS/);
  assert.doesNotThrow(()=>validateGroup("footer",{...defaultSiteSettings.footer,icp:"测试备案",icpUrl:"https://example.com/record"}));
});
test("site settings reject remote images, unknown fields, and invalid lengths",()=>{
  assert.throws(()=>validateGroup("brand",{...defaultSiteSettings.brand,logo:"https://example.com/logo.png"}),/本站/);
  assert.throws(()=>validateGroup("brand",{...defaultSiteSettings.brand,secret:"do not expose"}),/未知/);
  assert.throws(()=>validateGroup("brand",{...defaultSiteSettings.brand,text:"字".repeat(25)}),/过长/);
  assert.throws(()=>validateGroup("brand",{...defaultSiteSettings.brand,text:" "}),/填写/);
  assert.throws(()=>validateGroup("brand",{...defaultSiteSettings.brand,title:"line\nbreak"}),/无效/);
});
