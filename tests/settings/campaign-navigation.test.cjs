const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { buildSync } = require('esbuild');
const output = buildSync({ entryPoints: [path.join(__dirname, '../../src/settings/campaign-navigation.ts')], bundle: true, platform: 'node', format: 'cjs', write: false }).outputFiles[0].text;
const compiled = { exports: {} };
new Function('module', 'exports', output)(compiled, compiled.exports);
const { parseCampaignNavigationRequest: parse, authorizeCampaignNavigation: authorize } = compiled.exports;
const destinations = ['appearance', 'translation', 'instructions', 'music', 'combat', 'general'];
const context = { contentsId: 5, url: 'https://play.fables.gg/01a0d854-78d5-7064-ae41-f63d561c8e01/play', document: 3, request: 8 };
const capability = { ...context, ticket: 'opening-8', destinations };
const request = (section = 'general', ticket = 'opening-8') => `fables-desktop://settings/select-campaign-section?section=${section}&ticket=${ticket}`;

test('Campaign links request only fixed existing local destinations', () => {
  for (const section of destinations) {
    assert.deepEqual(parse(request(section)), { section, ticket: 'opening-8' });
    assert.deepEqual(authorize(request(section), capability, context), { section, ticket: 'opening-8' });
  }
});

test('navigation parser rejects extra payloads, ambiguous keys and arbitrary routes', () => {
  for (const raw of [null, {}, '', request('campaign'), request('General'), request('../general'), request('settings-save'),
    request() + '&extra=1', request() + '&section=music', request() + '&ticket=other', request() + '#fragment', request() + '\n',
    request().replace('settings/', 'settings:123/'), request().replace('settings/', 'user@settings/'),
    request().replace('settings/', 'settings/extra/'), request().replace('fables-desktop:', 'https:'),
    request().replace('settings/', 'other/'), request('', ''), request('general', 'a%20b'), request('general', 'a'.repeat(129)),
    request().replace('section=general', 'section=general&value=%7B%22save%22:true%7D')]) assert.equal(parse(raw), null, String(raw));
});

test('a ticket authorizes no other contents, document, URL, operation or unavailable destination', () => {
  assert.equal(authorize(request(), null, context), null);
  assert.equal(authorize(request('general', 'old-opening'), capability, context), null);
  assert.equal(authorize(request(), { ...capability, destinations: ['music'] }, context), null);
  for (const changed of [{ contentsId: 6 }, { document: 4 }, { request: 9 }, { url: context.url + '?new-document' },
    { url: context.url.replace('01a0d854', '02a0d854') }, { url: 'https://play.fables.gg/' },
    { url: context.url.replace('play.fables.gg', 'foreign.example') }, { url: context.url.replace('https:', 'http:') },
    { url: context.url.replace('https://', 'https://user:password@') }]) assert.equal(authorize(request(), capability, { ...context, ...changed }), null);
});

test('even a matching forged context must be the exact HTTPS UUID campaign-play route', () => {
  for (const url of ['https://play.fables.gg/', 'https://play.fables.gg/------------------------------------/play', 'https://play.fables.gg/abc/play',
    context.url + '/extra', context.url.replace('https://', 'https://user@'), context.url.replace('play.fables.gg', 'other.example')]) {
    const current = { ...context, url };
    assert.equal(authorize(request(), { ...capability, ...current }, current), null, url);
  }
});
