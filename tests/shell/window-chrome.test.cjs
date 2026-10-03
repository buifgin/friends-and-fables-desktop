const {test}=require('node:test'),assert=require('node:assert/strict');
const {mainWindowChrome}=require('../../dist/shell/window-chrome');
test('Windows decoration is opt-in and other platforms preserve native frames',()=>{assert.deepEqual(mainWindowChrome('win32',false),{frame:false,autoHideMenuBar:true});assert.equal(mainWindowChrome('win32',true).frame,true);assert.equal(mainWindowChrome('linux',false).frame,true);assert.equal(mainWindowChrome('darwin',false).frame,true)});

const {DEFAULT_APPEARANCE,validateAppearance}=require('../../dist/appearance/themes');
const {BUILT_IN_THEMES,applyLibraryTheme}=require('../../dist/appearance/theme-library');
test('New app preferences migrate safely and stay local when applying a theme',()=>{const legacy={...DEFAULT_APPEARANCE};delete legacy.nativeWindowsFrame;delete legacy.expandMessageInput;assert.equal(validateAppearance(legacy).nativeWindowsFrame,false);assert.equal(validateAppearance(legacy).expandMessageInput,false);assert.throws(()=>validateAppearance({...legacy,nativeWindowsFrame:'yes'}),/switch/);const local={...DEFAULT_APPEARANCE,nativeWindowsFrame:true,expandMessageInput:true};const themed=applyLibraryTheme(BUILT_IN_THEMES[0],local);assert.equal(themed.nativeWindowsFrame,true);assert.equal(themed.expandMessageInput,true)});

const {usesTrayForMinimize}=require('../../dist/shell/window-chrome');
test('Hyprland minimizes to tray while other desktops retain native minimization',()=>{
 assert.equal(usesTrayForMinimize('linux',{HYPRLAND_INSTANCE_SIGNATURE:'session'}),true);
 for(const platform of ['win32','darwin'])assert.equal(usesTrayForMinimize(platform,{HYPRLAND_INSTANCE_SIGNATURE:'inherited'}),false);
 assert.equal(usesTrayForMinimize('linux',{}),false);
 assert.equal(usesTrayForMinimize('linux',{HYPRLAND_INSTANCE_SIGNATURE:''}),false);
});
