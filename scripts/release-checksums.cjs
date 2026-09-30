const { createHash } = require('node:crypto');
const { createReadStream } = require('node:fs');
const { writeFile } = require('node:fs/promises');
const path = require('node:path');
const { version } = require('../package.json');

(async () => {
  const target = process.argv[2];
  if (target && !['linux', 'windows'].includes(target)) throw new Error('Choose linux or windows, or omit the target for both.');
  const directory = path.join(__dirname, '..', 'out', 'releases');
  const binaries = {
    linux: `friends-and-fables-desktop-${version}-linux-x86_64.AppImage`,
    windows: `friends-and-fables-desktop-${version}-windows-x64.exe`,
  };
  const lines = [];
  for (const name of target ? [binaries[target]] : Object.values(binaries)) {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(path.join(directory, name))) hash.update(chunk);
    lines.push(`${hash.digest('hex')}  ${name}`);
  }
  const file = `SHA256SUMS${target ? `-${target}` : ''}`;
  await writeFile(path.join(directory, file), `${lines.join('\n')}\n`);
  console.log(`Wrote ${file} for version ${version}.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
