const {readFile,mkdtemp,rm} = require('node:fs/promises');
const path=require('node:path');const os=require('node:os');
const {translationPlan,renderTranslation}=require('../dist/translation-core');
const {LocalTranslator}=require('../dist/local-translator');
const {TranslationCache}=require('../dist/translation-cache');
(async()=>{
 const samples=JSON.parse(await readFile(path.join(__dirname,'../tests/fixtures/translation-cases.json'),'utf8'));
 const directory=await mkdtemp(path.join(os.tmpdir(),'fables-translation-benchmark-'));
 const cache=new TranslationCache(path.join(directory,'cache.json')),engine=new LocalTranslator(5000);
 try{
  if(!await engine.available())throw Error('The local service needs an English → Russian model.');
  const rows=[];
  for(const sample of samples){
   const parts=translationPlan(sample.text,['Franz','Aria Moonwhisper']);
   const texts=parts.filter(part=>part.translate).map(part=>part.request??part.text);
   const start=performance.now(),result=texts.length?await engine.translate(texts):[];const serviceMs=performance.now()-start;
   texts.forEach((text,i)=>cache.set(text,result[i]));
   const cachedStart=performance.now();
   const translated=parts.map(part=>renderTranslation(part,part.translate?cache.get(part.request??part.text):undefined)).join('');
   rows.push({...sample,translated,serviceMs:Math.round(serviceMs),cacheMs:Number((performance.now()-cachedStart).toFixed(3))});
  }
  console.log(JSON.stringify({endpoint:'http://127.0.0.1:5000',source:'en',target:'ru',samples:rows},null,2));
 }finally{engine.abort();await cache.flush();await rm(directory,{recursive:true,force:true});}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
