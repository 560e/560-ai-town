import test from 'node:test';
import assert from 'node:assert/strict';
import {assetUploadInput,byteRange} from '../lib/academy-assets.ts';
test('academy assets reject active formats, mismatched bytes and unbounded uploads',()=>{
 assert.throws(()=>assetUploadInput({name:'x.svg',mime:'image/svg+xml',data:Buffer.from('<svg/>').toString('base64')}));
 assert.throws(()=>assetUploadInput({name:'x.mp4',mime:'video/mp4',data:Buffer.from('not video').toString('base64')}));
 assert.throws(()=>assetUploadInput({name:'../x.txt',mime:'text/plain',data:'aGVsbG8='}));
 assert.throws(()=>assetUploadInput({name:'x.txt',mime:'text/plain',data:'aGVsbG8=???'}));
 assert.throws(()=>assetUploadInput({name:'x.txt',mime:'text/plain',data:'aGVsbG8='}));
});
test('single byte ranges clamp ends and reject multi-range and invalid offsets',()=>{
 assert.deepEqual(byteRange('bytes=0-3',10),{start:0,end:3});
 assert.deepEqual(byteRange('bytes=5-',10),{start:5,end:9});
 assert.deepEqual(byteRange('bytes=-3',10),{start:7,end:9});
 assert.deepEqual(byteRange('bytes=0-999',10),{start:0,end:9});
 assert.equal(byteRange(null,10),null);
 for(const r of ['bytes=10-','bytes=4-2','bytes=0-1,3-4','bytes=-0','items=0-1'])assert.throws(()=>byteRange(r,10));
});
