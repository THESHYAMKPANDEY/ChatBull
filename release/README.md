# Release Instructions

## Android Keystore

The debug.keystore is for development only. For production releases, you'll need to generate a proper release keystore.

### To generate a new release keystore:
```bash
keytool -genkeypair -v -storetype JKS -keystore release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

### To build for Android:
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Build for Android
eas build --platform android

# Build for specific workflow
eas build --platform android --profile=production
```

### To build for iOS:
```bash
eas build --platform ios

# You'll need Apple Developer account credentials
```

### To submit to stores:
- Android: Upload the .aab file to Google Play Console
- iOS: Upload via Xcode or Transporter app

## Security Note
The temporary keystore in this directory is for development purposes only and should not be used for production releases.