// Run on native Windows after packaging; the runtime comes from extraResources.
const assert=require('node:assert/strict'),path=require('node:path'),http=require('node:http');
const {BundledTranslator}=require('../dist/bundled-translator');
const {LocalTranslator}=require('../dist/local-translator');
const {translationPlan,renderTranslation}=require('../dist/translation-core');
const root=process.env.FABLES_BUNDLED_TRANSLATOR_ROOT||path.join(__dirname,'../out/releases/win-unpacked/resources/translator');
const runtime=new BundledTranslator(root,process.env.FABLES_TEST_WINE_COMMAND ? {
 command:process.env.FABLES_TEST_WINE_COMMAND,
 args:[path.join(root,'python.exe'),'-I','-B','-u','Z:'+path.join(root,'service.py').replaceAll('/','\\')],
} : {});
(async()=>{
 const endpoint=await runtime.start(),client=new LocalTranslator(endpoint.port,30000,endpoint.token);
 assert.equal(await client.available(),true);
 const sample='Mira uses Second Wind. The lantern lights the quiet road.';
 const parts=translationPlan(sample,['Mira']),requests=parts.filter(part=>part.translate).map(part=>part.request??part.text);
 const result=await client.translate(requests);let index=0;
 const translated=parts.map(part=>renderTranslation(part,part.translate?result[index++]:undefined)).join('');
 assert.match(translated,/Mira/);assert.match(translated,/Второе дыхание/);assert.match(translated,/[А-Яа-я]/);
 assert(!/ZXQ|Second Wind/.test(translated));
 await assert.rejects(new LocalTranslator(endpoint.port,1000).available());
 await new Promise((resolve,reject)=>{
  const req=http.get({host:'127.0.0.1',port:endpoint.port,path:'/languages',headers:{Authorization:`Bearer ${endpoint.token}`,Origin:'https://play.fables.gg'}},res=>{res.resume();try{assert.equal(res.statusCode,403);resolve();}catch(e){reject(e);}});req.on('error',reject);
 });
 console.log('PASS: packaged Windows model translates offline, preserves glossary/name markers, and refuses unauthenticated and browser requests.');
})().then(()=>runtime.stop()).catch(async error=>{console.error(error.message);await runtime.stop();process.exitCode=1;});
