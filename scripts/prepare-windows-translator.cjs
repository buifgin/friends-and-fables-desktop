const {spawnSync}=require('node:child_process');
const path=require('node:path');
if(process.argv.includes('--if-windows')&&process.platform!=='win32')process.exit(0);
const result=spawnSync(process.platform==='win32'?'python':'python3',[path.join(__dirname,'prepare-windows-translator.py')],{stdio:'inherit'});
if(result.error)console.error('Python 3 is needed only to prepare the Windows package:',result.error.message);
process.exit(result.status??1);
