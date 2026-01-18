module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?|@expo-google-fonts|@react-navigation|@unimodules|unimodules|sentry-expo|native-base|react-native-svg|expo-crypto|tweetnacl|tweetnacl-util)'
  ],
  setupFilesAfterEnv: ['./jest.setup.js'],
};
