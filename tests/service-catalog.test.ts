import test from 'node:test';
import assert from 'node:assert/strict';
import {validateServiceCatalog,publicServiceCatalog,onServiceBoard,emptyTitle,initialServiceContent,titlePolicy} from '../lib/service.ts';
const catalog={categories:[{id:'cat_learning',name:'学习类',enabled:true},{id:'cat_private',name:'内部类',enabled:false}],districts:['civic-hall']};
test('catalog validates identifiers, duplicates, names and known districts without granting capabilities',()=>{
 assert.deepEqual(validateServiceCatalog(catalog),catalog);
 for(const value of [{...catalog,categories:[...catalog.categories,catalog.categories[0]]},{...catalog,categories:[{id:'all',name:'全部',enabled:true}]},{...catalog,districts:['unknown']},{...catalog,districts:['civic-hall','civic-hall']},{...catalog,permissions:['admin']}])assert.throws(()=>validateServiceCatalog(value));
 const base=emptyTitle();assert.equal(titlePolicy(base),titlePolicy({...base,category:'cat_learning'}));
});
test('public catalog preserves configured order, omits hidden names, and supports an entirely closed board',()=>{
 const content={...initialServiceContent,catalog};const filters=publicServiceCatalog(content);
 assert.deepEqual(filters.categories,[{id:'cat_learning',name:'学习类'}]);assert.deepEqual(filters.districts,[{id:'civic-hall',name:'AI服务中心'}]);
 const title={...emptyTitle(),visible:true,category:'cat_learning'};assert.ok(onServiceBoard(title,content));
 assert.ok(onServiceBoard({...title,category:''},content));assert.equal(onServiceBoard({...title,category:'cat_private'},content),false);assert.equal(onServiceBoard({...title,district:'learning-campus'},content),false);
 assert.equal(onServiceBoard(title,{...content,catalog:{categories:[],districts:[]}}),false);
});
