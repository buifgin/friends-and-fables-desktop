const {test}=require('node:test'),assert=require('node:assert/strict');
const {DEFAULT_MUSIC,audioUrl,validateMusic}=require('../dist/music-settings');
test('Music preferences validate track links, selection and playback bounds',()=>{
 const track={id:'track-1',title:'  Tavern  ',url:'https://audio.example/tavern.ogg?token=one'};
 const settings={...DEFAULT_MUSIC,tracks:[track],selected:track.id,volume:0,muted:true,loop:true};
 const valid=validateMusic(settings);assert.equal(valid.tracks[0].title,'Tavern');assert.equal(valid.volume,0);
 settings.tracks[0].title='Changed';assert.equal(valid.tracks[0].title,'Tavern','Returned settings do not alias input.');
 assert.equal(audioUrl(' https://audio.example/music.mp3 '),'https://audio.example/music.mp3');
 for(const url of ['http://audio.example/music.mp3','file:///etc/passwd','javascript:alert(1)','data:audio/wav,aaa','https://user:secret@audio.example/music.mp3','https://audio.example/'+ 'a'.repeat(2050)])assert.throws(()=>audioUrl(url));
 for(const patch of [{volume:NaN},{volume:-.1},{volume:1.1},{muted:'true'},{loop:1},{selected:'missing'},
  {tracks:[track,track]},{tracks:[{...track,id:'../other'}]},{tracks:[{...track,title:''}]},
  {tracks:Array.from({length:51},(_,i)=>({...track,id:String(i)}))}])assert.throws(()=>validateMusic({...valid,...patch}));
 assert.deepEqual(validateMusic(DEFAULT_MUSIC),DEFAULT_MUSIC);
});
