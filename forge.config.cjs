module.exports = {
  packagerConfig: {
    asar: true,
    executableName: 'friends-and-fables-desktop',
    ignore: [
      /^\/src(?:\/|$)/,
      /^\/docs(?:\/|$)/,
      /^\/tsconfig\.json$/,
      /^\/forge\.config\.cjs$/,
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
