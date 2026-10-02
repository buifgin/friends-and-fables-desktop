module.exports = {
  packagerConfig: {
    asar: true,
    extraResource: process.platform === 'win32' ? ['build/translator'] : [],
    executableName: 'friends-and-fables-desktop',
    ignore: [
      /^\/\.codex(?:\/|$)/,
      /(?:^|\/)AGENTS\.md$/,
      /^\/src(?:\/|$)/,
      /^\/translator(?:\/|$)/,
      /^\/\.cache(?:\/|$)/,
      /^\/docs(?:\/|$)/,
      /^\/tests(?:\/|$)/,
      /^\/references(?:\/|$)/,
      /^\/scripts(?:\/|$)/,
      /^\/tsconfig\.json$/,
      /^\/forge\.config\.cjs$/,
      /^\/electron-builder\.config\.cjs$/,
      /^\/build(?:\/|$)/,
      /^\/packaging(?:\/|$)/,
      /^\/\.github(?:\/|$)/,
      /^\/compose\.translate\.yaml$/,
    ],
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['linux', 'win32'],
    },
  ],
};
