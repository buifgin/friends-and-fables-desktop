module.exports = {
  packagerConfig: {
    asar: true,
    executableName: 'friends-and-fables-desktop',
    ignore: [
      /^\/src(?:\/|$)/,
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
