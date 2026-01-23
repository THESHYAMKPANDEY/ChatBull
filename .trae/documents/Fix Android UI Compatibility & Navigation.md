I have analyzed the codebase and identified critical UI compatibility issues for Android.

# Android UI Compatibility Plan

## 1. Fix Safe Area Handling (Notch/Status Bar)
- **Problem**: `AppHeader.tsx` uses a hardcoded `paddingTop: 50`, which will look incorrect on devices with different notch sizes (Pixel vs Samsung vs Tablets). `App.tsx` is missing the `SafeAreaProvider` context.
- **Solution**: 
    - Wrap the main App in `SafeAreaProvider`.
    - Update `AppHeader` to use `useSafeAreaInsets()` for dynamic top padding that respects the specific device's status bar height.

## 2. Fix Keyboard Obstruction (Login Screen)
- **Problem**: `LoginScreen.tsx` lacks `KeyboardAvoidingView`. On Android, the keyboard will cover the password field and login button, making it impossible to sign in on smaller screens.
- **Solution**: Wrap the login form in a `KeyboardAvoidingView` with `behavior="height"` (and a `ScrollView` if necessary) to ensure input fields remain visible while typing.

## 3. Implement Android Back Button
- **Problem**: The app uses a custom navigation state (`currentScreen`). It does not listen to the Android hardware back button. Pressing "Back" will likely close the app immediately instead of going back to the previous screen (e.g., from Chat -> Users).
- **Solution**: Add a `BackHandler` listener in `App.tsx` to handle navigation logic (e.g., if on 'chat', go to 'users'; if on 'users', exit app).

## 4. Verify Dependencies
- Ensure `react-native-safe-area-context` is correctly integrated.

This plan addresses the "comprehensive testing" requirements by fixing the structural issues that would fail such tests immediately.