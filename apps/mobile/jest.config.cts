/// <reference types="jest" />
/// <reference types="node" />
module.exports = {
  displayName: 'mobile',
  preset: 'jest-expo',
  resolver: 'react-native-worklets/jest/resolver',
  moduleFileExtensions: ['ts', 'js', 'html', 'tsx', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  moduleNameMapper: {
    '[.]svg$': '@nx/expo/plugins/jest/svg-mock',
    // Reanimated's own documented Jest mock: sidesteps needing real native
    // bindings (and the reanimated/worklets peer version mismatch) in tests.
    '^react-native-reanimated$': 'react-native-reanimated/mock',
  },
  transform: {
    '[.][jt]sx?$': [
      'babel-jest',
      {
        configFile: __dirname + '/.babelrc.js',
      },
    ],
    '^.+[.](bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp|ttf|otf|m4v|mov|mp4|mpeg|mpg|webm|aac|aiff|caf|m4a|mp3|wav|html|pdf|obj)$':
      require.resolve('jest-expo/src/preset/assetFileTransformer.js'),
  },
  // jest-expo's default pattern doesn't reach `@ui-kitten` under pnpm's nested
  // node_modules layout, so its untranspiled-JSX build output never gets
  // transformed. Same list as the preset default, with `@ui-kitten` added.
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|@ui-kitten|moti))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  coverageDirectory: '../../coverage/apps/mobile',
};
