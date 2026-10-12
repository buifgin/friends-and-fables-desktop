const {test}=require('node:test'),assert=require('node:assert/strict');
const {settingsSection,settingsGeometry,desktopBarVisible,combatPreferences}=require('../../dist/settings/settings-core');
test('only exact known sections can route',()=>{for(const s of ['campaign','appearance','translation','instructions','music','combat','general'])assert.equal(settingsSection(s),s);for(const s of ['../','Translation',null,{},''])assert.throws(()=>settingsSection(s));});
test('left geometry shares inset and preserves nonnegative website viewport',()=>{for(const width of [240,900,1600]){const g=settingsGeometry(width,700,580,32);assert.equal(g.website.x,g.panel.width);assert.equal(g.website.width+g.panel.width,width);assert.equal(g.editor.y,32);assert.ok(g.editor.width>=0);assert.equal(g.panel.height,668);}});
test('fullscreen preference hides only while fullscreen and quick toggle recovers',()=>{assert.equal(desktopBarVisible(false,true,false),true);assert.equal(desktopBarVisible(true,true,false),false);assert.equal(desktopBarVisible(true,true,true),true);assert.equal(desktopBarVisible(true,false,false),true);});

test('combat payload validates booleans, campaign and dependency',()=>{
 const p={campaignId:'campaign-a',automaticDamage:true,hideIntermediateFranz:true,hideDamagePrompt:true};assert.deepEqual(combatPreferences(p),p);
 assert.equal(combatPreferences({...p,automaticDamage:false}).hideIntermediateFranz,false);
 for(const v of [null,[],{...p,campaignId:''},{...p,campaignId:'a/play'},{...p,automaticDamage:'true'},{...p,hideIntermediateFranz:1},{...p,hideDamagePrompt:1},{...p,extra:1}])assert.throws(()=>combatPreferences(v));
});

test('legacy three-key combat snapshot migrates prompt flag off, auto off clears both',()=>{
 assert.deepEqual(combatPreferences({campaignId:'legacy',automaticDamage:true,hideIntermediateFranz:true}),{campaignId:'legacy',automaticDamage:true,hideIntermediateFranz:true,hideDamagePrompt:false});
 assert.deepEqual(combatPreferences({campaignId:'legacy',automaticDamage:false,hideIntermediateFranz:true,hideDamagePrompt:true}),{campaignId:'legacy',automaticDamage:false,hideIntermediateFranz:false,hideDamagePrompt:false});
 assert.throws(()=>combatPreferences({campaignId:'legacy',automaticDamage:true,hideIntermediateFranz:true,hideDamagePrompt:undefined}));
});

test('native Campaign colors match bundled Settings across all presets and custom contrast',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),{settingsPalette}=require('../../dist/settings/settings-palette');
 for(const settings of [{preset:'website'},{preset:'amoled'},{preset:'black'},{preset:'light'},{preset:'custom',customColor:'#173e69'},{preset:'custom',customColor:'#ffeccc'}]){
  const properties={},root={setAttribute(){},removeAttribute(){},style:{setProperty:(name,value)=>properties[name]=value}};
  const sheet={cssRules:[],insertRule(rule){this.cssRules.push(rule)},deleteRule(index){this.cssRules.splice(index,1)}};
  const owner={sheet,hasAttribute:()=>false,setAttribute(){}};
  const context={window:{},document:{documentElement:root,querySelector:()=>owner}};
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../../assets/shared/settings-theme.js'),'utf8'),context);
  context.window.settingsTheme.apply(settings);
  const p=settingsPalette(settings);
  for(const [native,bundled]of Object.entries({background:'bg',foreground:'fg',border:'border',accent:'accent',panel:'panel',selected:'selected'}))assert.equal(p[native],properties['--ui-'+bundled],`${settings.preset}:${native}`);
 }
});
