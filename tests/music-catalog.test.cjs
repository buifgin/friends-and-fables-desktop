const {test}=require('node:test'),assert=require('node:assert/strict');
const {MUSIC_CATALOG,catalogAttribution}=require('../dist/music-catalog');
const {validateMusic,DEFAULT_MUSIC}=require('../dist/music-settings');
test('Bundled catalog has unique official audio links, source pages, license credits and searchable metadata',()=>{
 assert.equal(MUSIC_CATALOG.length,266);const ids=new Set(),urls=new Set();
 for(const track of MUSIC_CATALOG){
  assert(!ids.has(track.id));assert(!urls.has(track.url));ids.add(track.id);urls.add(track.url);
  assert.equal(new URL(track.url).hostname,'www.scottbuckley.com.au');assert.equal(new URL(track.url).protocol,'https:');assert.match(new URL(track.url).pathname,/\.mp3$/);
  assert.equal(new URL(track.source).hostname,'www.scottbuckley.com.au');assert.equal(track.licenseUrl,'https://creativecommons.org/licenses/by/4.0/');
  assert.equal(track.artist,'Scott Buckley');assert.equal(track.license,'CC BY 4.0');assert.match(catalogAttribution(track),/Scott Buckley/);assert(catalogAttribution(track).includes(track.source));
  assert(Array.isArray(track.moods)&&Array.isArray(track.genres)&&Array.isArray(track.instruments));assert.equal(validateMusic({...DEFAULT_MUSIC,tracks:[track],selected:track.id}).tracks[0].url,track.url);
 }
 assert(MUSIC_CATALOG.some(track=>track.moods.includes('militaristic')));assert(MUSIC_CATALOG.some(track=>track.genres.includes('folk')));
 assert(MUSIC_CATALOG.filter(track=>track.moods.length+track.genres.length>0).length>=260,'Keep source metadata where the artist provides it.');
});
