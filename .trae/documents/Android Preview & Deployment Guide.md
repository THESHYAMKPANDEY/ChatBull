I have analyzed your project structure and identified the gaps between your current backend (`old_version/backend`) and the new features required by your mobile app.

Here is the comprehensive plan to address your request:

Before pushing any code changes to GitHub, implement a pre-push hook that automatically runs a comprehensive test suite to verify all functionality. The hook should:  1. Execute all unit tests, integration tests, and end-to-end tests in the project 2. Verify that all test cases pass with 100% success rate 3. Check code coverage meets the minimum required threshold (specify percentage) 4. Validate that all existing features are working as expected 5. Only allow the push to proceed if all tests pass successfully 6. Provide clear output showing test results and any failures 7. Include proper error handling for test execution failures  The implementation should use the project's existing test framework and be configured to run in all development environments consistently. Document the setup process in the project's README file.

### **Phase 1: Backend Feature Completion (Critical)**

The mobile app expects several features that are currently missing in the backend. I will implement them in `old_version/backend`:

1. **Stories Feature**:

   * Create `Story` model (expires after 24h).

   * Implement `GET /api/story/feed` and `POST /api/story`.
2. **Comments Feature**:

   * Create `Comment` model.

   * Implement endpoints to add and retrieve comments for posts.
3. **Saved Posts**:

   * Update `User` model to store saved post IDs.

   * Implement `POST /api/posts/:id/save`.
4. **Email OTP**:

   * Create `EmailOtp` model.

   * Implement `POST /api/auth/email-otp/send` and `verify`.

### **Phase 2: Android Readiness & Cross-Platform Check**

1. **Android Build**:

   * Since you use native modules (ZegoCloud, Encrypted Storage), you **cannot** use the standard Expo Go app.

   * I will verify `package.json` scripts to ensure `npx expo run:android` works.
2. **Web Build**:

   * I will add the `"build:web": "expo export -p web"` script to `mobile/package.json` so you can deploy to your custom domain.

### **Phase 3: Production Optimization & Deployment**

1. **Environment Variables**:

   * I will verify `appConfig.ts` is correctly reading from `process.env`.
2. **Render Deployment**:

   * You will deploy the updated backend to Render.
3. **Domain Setup**:

   * I will provide a guide on how to upload the web build to your hosting and connect the domain.

### **Execution Order**

1. **Fix Backend**: This is the most urgent task. Without it, the app will crash or show empty screens.
2. **Update Mobile Config**: Add build scripts.
3. **Verify**: I will run a build check.

**Shall I start by implementing the missing "Stories" and "Comments" features in the backend now?**
