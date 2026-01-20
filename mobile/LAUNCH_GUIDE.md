# Android Launch Guide for ChatBull

This guide covers everything you need to do to launch ChatBull on the Google Play Store.

## 1. Prerequisites
- **Google Play Developer Account**: You need to register at [Google Play Console](https://play.google.com/console) (One-time $25 fee).
    - **Tip**: Use the **same Google Account** that you use for Firebase. This makes linking Firebase Analytics, App Check, and Cloud Messaging much easier later on.
- **EAS CLI**: Ensure you have the Expo Application Services CLI installed (`npm install -g eas-cli`).
- **Expo Account**: You need an account on [expo.dev](https://expo.dev) to use EAS Build.

## 2. Configuration Status (Completed)
We have already performed the following "Android Ready" checks:
- **Package Name**: Set to `com.socialchat.app` (matches your Firebase configuration).
- **Version Code**: Set to `1`. Increment this number in `app.json` for every new update you release.
- **Permissions**: Configured for Camera, Microphone, Contacts, and FaceID.
- **Native Code**: Generated via `npx expo prebuild`.

## 3. Building for Production

We recommend using **EAS Build** for the easiest deployment process. It handles key signing and certificate management automatically.

1.  **Login to EAS**:
    ```bash
    eas login
    ```

2.  **Configure Build Profile**:
    Your `eas.json` is already set up. To build a production Android App Bundle (AAB) required for the Play Store:
    ```bash
    eas build --platform android --profile production
    ```
    *Note: If asked to generate a new Keystore, say **YES**. EAS will store it securely for you.*

3.  **Download Build**:
    Once the build finishes, you will get a link to download the `.aab` file.

## 4. Google Play Console Setup

1.  **Create App**:
    - Go to Play Console > **Create App**.
    - App Name: **ChatBull** (or your desired name).
    - Default Language: English.
    - App Type: App.
    - Free/Paid: Free.

2.  **Set up your store listing**:
    - **Short Description**: A brief summary of your app.
    - **Full Description**: Detailed features (Chat, Calls, Secure, etc.).
    - **Graphics**:
        - App Icon (512x512 png)
        - Feature Graphic (1024x500 png)
        - Phone Screenshots (at least 2)

3.  **Privacy Policy**:
    - You must provide a valid URL to your privacy policy.
    - Your app config points to `${apiBaseUrl}/api/legal/privacy`. Ensure this endpoint is live and accessible.

## 5. Releasing to Testing (Recommended)

Before going live to everyone, release to "Internal Testing" or "Closed Testing".

1.  Select **Testing** > **Internal testing**.
2.  **Create new release**.
3.  Upload the `.aab` file you downloaded from EAS.
4.  **Sign and Review**.

## 6. Going Live (Production)

1.  Once you have tested the app, go to **Production** > **Create new release**.
2.  Add from Library (select the AAB you uploaded to testing) or upload a new one.
3.  Update Release Notes.
4.  **Start Rollout to Production**.
    - Google will review your app (can take 1-7 days).

## 7. Common Issues & Troubleshooting

- **Firebase Issues**: If Google Login or notifications fail, ensure the SHA-1 fingerprint of your **Production Keystore** (managed by EAS) is added to your Firebase Console Project Settings.
    - You can find these credentials in Expo Dashboard > Credentials > Android.
- **Update rejected**: Check your email for specific reasons. Common reasons include missing privacy policy or insufficient permission justification.

## 8. Next Steps
- Run `eas build --platform android --profile production` now to start your first build!
