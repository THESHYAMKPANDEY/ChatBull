# Calling Feature Testing (ZegoCloud)

## Preconditions
- ZegoCloud project is created and you have:
  - `EXPO_PUBLIC_ZEGO_APP_ID`
  - `EXPO_PUBLIC_ZEGO_APP_SIGN`
- Two test accounts (two different Firebase-authenticated users).
- Two devices (recommended) on stable Wi‑Fi.

## Configuration
- Create `mobile/.env` based on [mobile/.env.example](file:///d:/New%20folder%20(3)/Chatbull/mobile/.env.example).
- Ensure API uses HTTPS for production:
  - `EXPO_PUBLIC_API_BASE_URL=https://...`

## Build Requirements (Important)
`@zegocloud/zego-uikit-prebuilt-call-rn` uses native code and typically will not work in Expo Go.

Use an EAS dev build or a store build:
- Install EAS CLI: `npm i -g eas-cli`
- From `mobile/`:
  - `eas login`
  - `eas build:configure`
  - `eas build --profile development --platform android`

When the build completes, install the APK/AAB on your device(s).

## How to Start a Call
- Open a 1:1 chat.
- Tap the call button (📞) in the chat header.
- The app computes a deterministic `callID` from the two user IDs, so both users entering the call from the same chat will join the same room.

## How to Verify End-to-End
- On device A: open chat with device B user, tap 📞.
- On device B: open the same chat with device A user, tap 📞.
- Verify:
  - Both users join the same call room.
  - Video and audio are flowing both directions.
  - Hang up returns to chat.

## Troubleshooting
- “Missing ZegoCloud Configuration”:
  - Confirm `mobile/.env` exists and variables start with `EXPO_PUBLIC_`.
- Connects but no media:
  - Confirm camera/microphone permissions were granted.
  - Test on real devices (emulators often have audio/video limitations).

