const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

config.resolver.assetExts = [...config.resolver.assetExts, 'bin'];
config.transformer.unstable_allowRequireContext = true;

module.exports = config;
