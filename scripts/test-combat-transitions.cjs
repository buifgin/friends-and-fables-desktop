// Keep environment-selected native regressions in the normal cross-platform gate.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const cases=[
 ['automatic-turn-control-smoke.cjs',{}],
 ...['guards','readiness','paint'].map(mode=>['combat-switch-smoke.cjs',{FABLES_COMBAT_SWITCH_FOCUS:mode}]),
 ['combat-chat-follow-smoke.cjs',{}],
 ...['reopen','reopen-missing','reopen-no-mount'].map(mode=>['combat-chat-follow-smoke.cjs',{FABLES_COMBAT_CHAT_FOCUS:mode}]),
];
for(const [fixture,environment] of cases){
 const result=spawnSync(process.execPath,[path.join(__dirname,'run-electron-test.cjs'),path.join(__dirname,'../tests/combat',fixture)],{stdio:'inherit',env:{...process.env,FABLES_COMBAT_SWITCH_FOCUS:'',FABLES_COMBAT_CHAT_FOCUS:'',...environment}});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
}
