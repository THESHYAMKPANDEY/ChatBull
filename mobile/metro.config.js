const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Enable experimental toReversed function support
defaultConfig.resolver.unstable_enableSymlinks = false;

module.exports = {
  ...defaultConfig,
  resolver: {
    ...defaultConfig.resolver,
    assetExts: [...defaultConfig.resolver.assetExts, 'bin'],
  },
  transformer: {
    ...defaultConfig.transformer,
    unstable_allowRequireContext: true,
  },
};