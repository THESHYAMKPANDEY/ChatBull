# Mobile Build & Deployment Guide 📱

## 1. Prerequisites
- **EAS CLI**: Install via `npm install -g eas-cli`
- **Expo Account**: Login via `eas login`
- **Android Keystore**: (Managed automatically by EAS for new projects)

## 2. Configure EAS
Initialize EAS in your project if you haven't:
```bash
cd mobile
eas build:configure
```
Select `Android` and `iOS` when prompted.

## 3. Build for Android (APK)
To generate an installable APK for testing:
```bash
cd mobile
eas build -p android --profile preview
```

## 4. Build for Production (AAB)
To generate an AAB for the Play Store:
```bash
cd mobile
eas build -p android --profile production
```

## 5. Web Deployment
Since this is an Expo web app, you can deploy it to Vercel/Netlify or serve it statically.
To build for web:
```bash
cd mobile
npx expo export:web
```
The output will be in `web-build`.
