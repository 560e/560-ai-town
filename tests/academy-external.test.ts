import test from 'node:test';
import assert from 'node:assert/strict';
import {validateExternalCourse} from '../lib/academy-validation.ts';
const course={title:'AI入门',summary:'学习工具使用',url:'https://school.example/course/1',coverAssetId:null,sort:0,published:true};
test('external courses accept only absolute web destinations without credentials',()=>{
 assert.equal(validateExternalCourse(course).url,course.url);
 for(const url of ['javascript:alert(1)','data:text/html,hi','//example.com','/account','https://a:b@example.com','https://example.com/\nfoo'])assert.throws(()=>validateExternalCourse({...course,url}));
});
test('external courses enforce bounded text, integer order, revision and explicit visibility',()=>{
 assert.throws(()=>validateExternalCourse({...course,title:''}));
 assert.throws(()=>validateExternalCourse({...course,sort:1.2}));
 assert.throws(()=>validateExternalCourse({...course,published:'true'}));
 assert.throws(()=>validateExternalCourse({...course,id:'11111111-1111-4111-8111-111111111111'}));
 assert.throws(()=>validateExternalCourse({...course,units:[]}));
 assert.equal(validateExternalCourse({...course,published:false,summary:'',url:''}).published,false);
});
