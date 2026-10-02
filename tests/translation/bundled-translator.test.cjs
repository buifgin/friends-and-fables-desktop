const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {BundledTranslator}=require('../../dist/translation/bundled-translator');
const {LocalTranslator}=require('../../dist/translation/local-translator');
const root=path.join(__dirname,'../fixtures'),fixture=path.join(root,'bundled-translator.cjs');
const create=(mode='')=>new BundledTranslator(root,{command:process.execPath,args:[fixture,mode],startupTimeoutMs:mode==='hang'?200:3000});
test('owned translator starts once, requires its private token, stops on parent EOF, and can restart',async()=>{
 const runtime=create();
 try{
  const [first,second]=await Promise.all([runtime.start(),runtime.start()]);assert.strictEqual(first,second);
  assert.match(first.token,/^[0-9a-f]{64}$/);
  const client=new LocalTranslator(first.port,2000,first.token);
  assert.equal(await client.available(),true);assert.deepEqual(await client.translate(['The door opens.']),['Пробный перевод.']);
  await assert.rejects(new LocalTranslator(first.port,100).available());
  await runtime.stop();await assert.rejects(client.available());
  const next=await runtime.start();assert.notEqual(first.token,next.token);assert.equal(await new LocalTranslator(next.port,2000,next.token).available(),true);
 }finally{await runtime.stop();}
});
test('startup failure, timeout, and cancellation settle without orphaning a service',async()=>{
 for(const mode of ['fail','hang']){
  const runtime=create(mode);try{await assert.rejects(runtime.start(),/included translator/);}finally{await runtime.stop();}
 }
 const runtime=create('hang'),starting=runtime.start();const rejection=assert.rejects(starting,/included translator/);await runtime.stop();await rejection;
});
