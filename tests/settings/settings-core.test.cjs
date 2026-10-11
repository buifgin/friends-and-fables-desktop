const {test}=require('node:test'),assert=require('node:assert/strict');
const {settingsSection,settingsGeometry,desktopBarVisible,combatPreferences}=require('../../dist/settings/settings-core');
test('only exact known sections can route',()=>{for(const s of ['campaign','appearance','translation','instructions','music','combat','general'])assert.equal(settingsSection(s),s);for(const s of ['../','Translation',null,{},''])assert.throws(()=>settingsSection(s));});
test('left geometry shares inset and preserves nonnegative website viewport',()=>{for(const width of [240,900,1600]){const g=settingsGeometry(width,700,580,32);assert.equal(g.website.x,g.panel.width);assert.equal(g.website.width+g.panel.width,width);assert.equal(g.editor.y,32);assert.ok(g.editor.width>=0);assert.equal(g.panel.height,668);}});
test('fullscreen preference hides only while fullscreen and quick toggle recovers',()=>{assert.equal(desktopBarVisible(false,true,false),true);assert.equal(desktopBarVisible(true,true,false),false);assert.equal(desktopBarVisible(true,true,true),true);assert.equal(desktopBarVisible(true,false,false),true);});

test('combat payload validates booleans, campaign and dependency',()=>{
 const p={campaignId:'campaign-a',automaticDamage:true,hideIntermediateFranz:true};assert.deepEqual(combatPreferences(p),p);
 assert.equal(combatPreferences({...p,automaticDamage:false}).hideIntermediateFranz,false);
 for(const v of [null,[],{...p,campaignId:''},{...p,campaignId:'a/play'},{...p,automaticDamage:'true'},{...p,hideIntermediateFranz:1},{...p,extra:1}])assert.throws(()=>combatPreferences(v));
});
