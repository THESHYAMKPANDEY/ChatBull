# Changelog

All notable changes to the ChatBull project will be documented in this file.

## [Unreleased] - 2026-01-17

### Added
- **JANEAI Integration**: Renamed "MetaAI" to "JANEAI".
- **Voice Capabilities**: Added Speech-to-Text and Text-to-Speech support in `AIChatScreen`.
- **Deployment Guide**: Comprehensive guide for deploying to Render with GoDaddy custom domain (`docs/DEPLOYMENT_GODADDY.md`).
- **Deployment Readiness**: Added `docs/DEPLOYMENT_READINESS.md` report.
- **Production Checklist**: Added to `docs/FEATURE_CHECKLIST.md`.
- **App Header**: Created reusable `AppHeader` component for consistent UI.

### Changed
- **Mobile Architecture**: Disabled `newArchEnabled` in `app.json` to fix Expo Go compatibility.
- **Media Uploads**: Enhanced error handling and security in `media.ts`.
- **Project Structure**: Removed duplicate `ChatBull/` folder nesting.
- **UI Improvements**: Standardized headers across Feed, Users, and Profile screens.

### Fixed
- **Expo Go Crash**: Resolved crash on startup by disabling new architecture.
- **500 Error**: Fixed internal server error on media uploads by ensuring upload directories exist.
- **Linting**: Fixed TypeScript compilation errors in backend and mobile.
