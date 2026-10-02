const {rm}=require('node:fs/promises');
const path=require('node:path');

// dist contains only generated TypeScript output. Rebuilding must not keep
// removed modules or preloads that could hide broken resource paths.
async function cleanDist(root=path.resolve(__dirname,'..')) {
 await rm(path.join(root,'dist'),{recursive:true,force:true});
}
module.exports={cleanDist};
if(require.main===module) cleanDist().catch(error=>{console.error(error);process.exitCode=1;});
