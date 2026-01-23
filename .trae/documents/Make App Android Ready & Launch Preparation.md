I have analyzed your project and identified the necessary steps to make it Android-ready and prepared for the Play Store.

# Plan to Launch on Play Store

## 1. Fix Configuration Issues (Critical)
- **Update Package Name**: Your `app.json` uses `com.chatbull.app` but your Firebase `google-services.json` is configured for `com.socialchat.app`. This mismatch will cause build failures. I will update `app.json` to match your Firebase config (`com.socialchat.app`) so the app builds correctly.
- **Add Version Code**: Play Store requires an integer `versionCode`. I will add this to `app.json`.
- **Fix Notification Config**: Remove the invalid `vapidPublicKey` from the `notification` section in `app.json` (detected by expo-doctor).

## 2. Fix Dependencies & Tests
- **Downgrade Jest**: Expo requires specific versions of Jest. I will align `jest` and `@types/jest` to the supported versions to ensure stability.
- **Fix Failing Tests**: The `Retry.test.ts` unit test is failing. I will debug and fix the test logic to ensure your codebase is verified.

## 3. Generate Android Project
- **Run Prebuild**: I will run `npx expo prebuild --platform android`. This generates the native `android` folder, effectively making your app "Android Ready" and allowing us to inspect the native Gradle configuration.

## 4. Documentation
- **Create Launch Guide**: I will create a `LAUNCH_GUIDE.md` file. This will be your step-by-step manual for the actual release, covering:
    - How to build the production APK/AAB using EAS.
    - How to set up the Google Play Console.
    - How to sign your app (Keystore).
    - How to upload and release.

Once you approve this plan, I will execute these changes and verify the build.