const fs = require('fs');
const path = require('path');

const appJson = require('./app.json');

const config = appJson.expo || {};

const androidGoogleServices = path.join(__dirname, 'google-services.json');
const iosGoogleServices = path.join(__dirname, 'GoogleService-Info.plist');

config.android = config.android || {};
config.ios = config.ios || {};

if (fs.existsSync(androidGoogleServices)) {
  config.android.googleServicesFile = './google-services.json';
} else {
  delete config.android.googleServicesFile;
}

if (fs.existsSync(iosGoogleServices)) {
  config.ios.googleServicesFile = './GoogleService-Info.plist';
} else {
  delete config.ios.googleServicesFile;
}

const vapidPublicKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
if (vapidPublicKey) {
  config.notification = {
    ...(config.notification || {}),
    vapidPublicKey,
  };
}

module.exports = config;
