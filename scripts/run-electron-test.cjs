// Chromium can keep profile files locked on Windows until its process exits.
// Own the test profile in this parent, and remove it after Electron is gone.
const {spawn}=require('node:child_process');
const {mkdtemp,rm}=require('node:fs/promises');
const os=require('node:os'),path=require('node:path');
(async()=>{
 const profile=await mkdtemp(path.join(os.tmpdir(),'fables-electron-test-'));
 let code=1;
 try{
  const child=spawn(require('electron'),[path.resolve(process.argv[2])],{stdio:'inherit',windowsHide:true,
   env:{...process.env,FABLES_TEST_PROFILE_DIR:profile}});
  code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',value=>resolve(value??1));});
 }finally{await rm(profile,{recursive:true,force:true,maxRetries:20,retryDelay:100});}
 process.exitCode=code;
})().catch(error=>{console.error(error.message);process.exitCode=1;});
