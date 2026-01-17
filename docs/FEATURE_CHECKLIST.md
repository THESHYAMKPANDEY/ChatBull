# ChatBull — Feature Checklist (Product + Implementation)

This is a “what exists” checklist based on the current codebase (mobile + backend), including what is complete, partial, UI-only, mocked, or not started.

## Legend

- ✅ End-to-end: implemented and wired (mobile ↔ backend and/or realtime) with production-ready behavior
- 🟡 Partial: implemented but limited / missing persistence / missing enforcement / needs config
- 🧩 UI-only: screen/UI exists but backend/realtime logic is placeholder
- 🧪 Mocked: intentional mock/stub (e.g., WebRTC UI without real media transport)
- ⛔ Not started: not present

## Architecture At A Glance

- **Mobile (Expo React Native)** authenticates with **Firebase Auth** and then calls the backend with a **Firebase ID token** attached as `Authorization: Bearer <token>`.
- **Backend (Express + TypeScript)** verifies Firebase tokens, stores “app users” in **MongoDB**, and exposes REST APIs for feed/posts/stories/media/private sessions + Socket.IO for realtime chat.
- **Realtime**
  - Normal chat uses Socket.IO on the root namespace: message send/receive, typing, basic presence.
  - Private mode uses Socket.IO namespace `/private` with anonymous aliases and session cleanup.
- **Media**
  - Mobile picks files via Expo pickers, uploads to backend as `multipart/form-data`.
  - Backend streams to Cloudinary and returns a hosted URL.

## Core App

| Feature | Mobile | Backend | Realtime | Notes |
|---|---:|---:|---:|---|
| App shell + screen routing | ✅ | — | — | Manual routing in [App.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/App.tsx) |
| Bottom navigation (tabs) | ✅ | — | — | [BottomTabBar.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/components/BottomTabBar.tsx) |
| Light/Dark theme toggle (persisted) | ✅ | — | — | [theme.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/config/theme.tsx), Settings in [ProfileScreen.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/screens/ProfileScreen.tsx) |
| Backend health checks | — | ✅ | — | `/health`, `/api/health`, `/health/extended` in [index.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/index.ts) |

### Core App Details

- **Screens in the mobile app**: [screens](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/screens/) (`UsersListScreen`, `ChatScreen`, `FeedScreen`, `PrivateModeScreen`, `AIChatScreen`, `ProfileScreen`, `LoginScreen`, `CallScreen`).
- **Routing approach**: local state machine (`currentScreen`) rather than React Navigation stacks in [App.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/App.tsx).
- **Config fallback**: mobile uses Render backend by default via [appConfig.ts](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/config/appConfig.ts) and `.env` via [mobile .env.example](file:///d:/New%20folder%20(3)/Chatbull/mobile/.env.example).

## Authentication & User Accounts

| Feature | Mobile | Backend | Realtime | Notes |
|---|---:|---:|---:|---|
| Firebase auth (email/password) | ✅ | 🟡 | — | Firebase client auth; backend trusts Firebase ID token |
| User sync into MongoDB | ✅ | ✅ | — | `POST /api/auth/sync` ([auth.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/auth.ts)) |
| List users for chat discovery | ✅ | ✅ | — | `GET /api/auth/users` |
| Logout | ✅ | ✅ | — | `POST /api/auth/logout` |
| Email verification gate | 🟡 | — | — | Implemented as app gate in [LoginScreen.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/screens/LoginScreen.tsx) (relies on Firebase email verification link) |
| Phone OTP verification (SMS) | 🟡 | — | — | Implemented via `expo-firebase-recaptcha` in [LoginScreen.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/screens/LoginScreen.tsx); requires Firebase Phone provider + may require dev build depending on device/runtime |
| Profile update (displayName/photo/phone) | 🟡 | ✅ | — | Backend: `PUT /api/user/me`; UI is minimal today |
| Delete account + cleanup | ✅ | ✅ | — | Mobile triggers delete; backend deletes user + messages in [user.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/user.ts) |

### Auth Details (Deep)

- **Backend trust model**
  - Backend does not store passwords; it verifies Firebase ID tokens in [auth middleware](file:///d:/New%20folder%20(3)/Chatbull/backend/src/middleware/auth.ts).
  - Sync endpoint requires Firebase user to have an **email** (Mongo `User.email` is required): [User.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/models/User.ts), sync logic: [auth.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/auth.ts).
- **User record fields (MongoDB)**
  - `firebaseUid` (unique), `email` (unique), `displayName` (required), `photoURL`, `phoneNumber`, online status fields, and soft-delete markers: [User.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/models/User.ts).
- **Mobile auth flow**
  - Email/password is handled by Firebase JS SDK; after login the app calls `api.syncUser(...)`: [LoginScreen.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/screens/LoginScreen.tsx), [api.ts](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/services/api.ts).
- **Email verification**
  - Uses Firebase email verification link (not a numeric OTP code); enforced by UI gating: [LoginScreen.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/screens/LoginScreen.tsx).
- **Phone OTP (SMS)**
  - Uses Firebase phone provider + recaptcha; attaches phone to the existing Firebase user via `linkWithPhoneNumber`: [LoginScreen.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/screens/LoginScreen.tsx).
  - Requires enabling **Phone** sign-in in Firebase Console.

## Chat (Normal Mode)

| Feature | Mobile | Backend | Realtime | Notes |
|---|---:|---:|---:|---|
| 1:1 chat UI | ✅ | ✅ | ✅ | [ChatScreen.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/screens/ChatScreen.tsx), sockets in [chatHandler.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/socket/chatHandler.ts) |
| Message send/receive (text) | ✅ | ✅ | ✅ | Socket event `message:send` creates Mongo `Message` |
| Chat history load (last 100) | ✅ | ✅ | ✅ | `messages:get` |
| Typing indicator | ✅ | ✅ | ✅ | `typing:start/stop` |
| Online/offline status (basic) | ✅ | 🟡 | ✅ | Socket tracks connections + updates `User.isOnline` |
| Read receipts (basic) | ✅ | ✅ | 🟡 | Backend sets `isRead`; client shows status |
| Message reactions | 🟡 | 🟡 | ✅ | Client has reaction manager; backend broadcasts reactions but does not persist them |
| Reply-to messages | 🟡 | ⛔ | 🟡 | UI has `replyingTo`, but persistence/wire is incomplete |
| Push notifications | ⛔ | 🟡 | — | Firebase Admin init exists; full push workflow not wired in UI |

### Chat Details (Deep)

- **Socket events (normal chat)**
  - Join/presence: `user:join`, `user:online`, `user:offline`, `user:subscribe-status`, `user:status-update`: [chatHandler.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/socket/chatHandler.ts)
  - Messaging: `message:send`, `message:receive`, `message:sent`: [chatHandler.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/socket/chatHandler.ts)
  - History: `messages:get`, `messages:history`: [chatHandler.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/socket/chatHandler.ts)
  - Typing: `typing:start`, `typing:stop`: [chatHandler.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/socket/chatHandler.ts)
  - Read receipts: `messages:read` sets `Message.isRead`: [chatHandler.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/socket/chatHandler.ts)
  - Reactions: `message:reaction:add/remove` are broadcast (not persisted): [chatHandler.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/socket/chatHandler.ts), client manager: [messageReactions.ts](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/services/messageReactions.ts)
- **Message storage**
  - Messages are stored in Mongo model [Message.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/models/Message.ts).
  - Private messages use [PrivateMessage.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/models/PrivateMessage.ts) with expiry behavior.
- **Delivery/read status**
  - Mobile also has a “message status system” utility, but backend currently does not emit `message:delivered` / `message:read` events (it uses `messages:read`): [messageStatus.ts](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/services/messageStatus.ts).

## Media (Chat + Feed + Stories)

| Feature | Mobile | Backend | Realtime | Notes |
|---|---:|---:|---:|---|
| Pick photo/video from library | ✅ | — | — | [media.ts](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/services/media.ts) |
| Capture photo/video from camera | ✅ | — | — | Camera + Library choice integrated in Feed/Chat/Stories |
| Pick files (pdf/doc/text) | ✅ | — | — | Expo Document Picker |
| Upload media to Cloudinary | ✅ | ✅ | — | `POST /api/media/upload` in [media.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/media.ts) |
| Media upload status endpoint | — | ✅ | — | `GET /api/media/status` |

### Media Details (Deep)

- **Pickers**
  - Photos/videos via Expo ImagePicker; documents via Expo DocumentPicker: [media.ts](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/services/media.ts).
  - Feed/Chat/Stories prompt Camera vs Library for an Instagram-style flow.
- **Upload pipeline**
  - Mobile uploads `multipart/form-data` with `file` field to backend.
  - Backend uses `multer` to stage a temp file, then uploads to Cloudinary and returns `{ url, publicId, metadata }`: [backend media.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/media.ts).
- **Cloudinary configuration**
  - Backend reads Cloudinary config from env; status endpoint exists for debugging: [backend media.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/media.ts), Cloudinary wrapper: [cloudinary.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/services/cloudinary.ts).

## Social Feed (Posts)

| Feature | Mobile | Backend | Realtime | Notes |
|---|---:|---:|---:|---|
| View global feed | ✅ | ✅ | — | `GET /api/posts/feed` |
| Create post (text) | ✅ | ✅ | — | `POST /api/posts` |
| Create post (photo/video/file) | ✅ | ✅ | — | Upload media → attach URL to post |
| Share post externally (system share) | ✅ | — | — | Share button uses OS share sheet |
| Likes | 🧩 | ⛔ | ⛔ | UI toggle only; no persistence |
| Comments | 🧩 | ⛔ | ⛔ | Placeholder alert only |
| Saved/bookmarks | 🧩 | ⛔ | ⛔ | Placeholder alert only |
| Post moderation/reporting | ⛔ | 🟡 | — | General report endpoint exists under security, not wired to posts |

### Feed / Posts Details (Deep)

- **Post schema**
  - Stored in Mongo via [Post.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/models/Post.ts) with `content`, optional `mediaUrl` + `mediaType`, timestamps.
- **Endpoints**
  - `GET /api/posts/feed` for global feed.
  - `POST /api/posts` to create a post (text + optional `mediaUrl`/`mediaType`).
  - Backend implementation in [post.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/post.ts).
- **Current limitations**
  - Like/comment/save are not persisted (UI toggles only) in [FeedScreen.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/screens/FeedScreen.tsx).

## Stories (24-hour)

| Feature | Mobile | Backend | Realtime | Notes |
|---|---:|---:|---:|---|
| Create story (photo/video) | ✅ | ✅ | — | Upload media → `POST /api/stories` |
| Story tray list (active stories) | ✅ | ✅ | — | `GET /api/stories` |
| Story viewer | ✅ | — | — | Viewer is client-only; reads list from API |
| Auto-expire after 24h | — | ✅ | — | TTL index via `expiresAt` in [Story.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/models/Story.ts) |

### Stories Details (Deep)

- **Backend behavior**
  - Stories expire automatically using MongoDB TTL on `expiresAt`: [Story.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/models/Story.ts).
  - `GET /api/stories` filters to non-expired.
  - `POST /api/stories` stores `mediaUrl`, `mediaType`, and author: [story.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/story.ts).
- **Mobile behavior**
  - Tray shows one story per author (deduped on client) and viewer cycles through that author’s story list.

## Private Mode (Ephemeral / Anonymous)

| Feature | Mobile | Backend | Realtime | Notes |
|---|---:|---:|---:|---|
| Start private mode | ✅ | ✅ | ✅ | `POST /api/private/start` + `/private` socket namespace |
| Anonymous alias identity | ✅ | — | ✅ | Alias generated server-side in [privateHandler.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/socket/privateHandler.ts) |
| Private lobby broadcast | ✅ | — | ✅ | `private:broadcast` |
| Direct private messages by alias | ✅ | ✅ | ✅ | Stored in `PrivateMessage` (expires) |
| Delete private data on exit | ✅ | ✅ | ✅ | `private:exit` deletes messages + session |
| End private session via REST | 🟡 | ✅ | — | `POST /api/private/end` exists; UI mainly uses sockets |

### Private Mode Details (Deep)

- **Anonymous identity**
  - Server generates alias like `SwiftFox123` and keeps it in memory for the socket session: [privateHandler.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/socket/privateHandler.ts).
- **Private sessions**
  - REST endpoint starts a server-side “ephemeral session” with TTL: [private routes](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/private.ts), model: [EphemeralSession.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/models/EphemeralSession.ts).
- **Data deletion semantics**
  - On `private:exit` and on disconnect, server deletes all private messages for the session: [privateHandler.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/socket/privateHandler.ts).

## AI Chat

| Feature | Mobile | Backend | Realtime | Notes |
|---|---:|---:|---:|---|
| AI chat screen (“MetaAI”) | ✅ | — | — | [AIChatScreen.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/screens/AIChatScreen.tsx) |
| AI chat endpoint | — | ✅ | — | `POST /api/ai/chat` in [ai.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/ai.ts) |
| Uses OpenAI when configured | — | ✅ | — | `OPENAI_API_KEY` enables OpenAI; otherwise safe fallback reply |

### AI Details (Deep)

- **Fallback-first design**
  - If OpenAI isn’t configured, backend returns deterministic “helpful app assistant” replies so the feature still works: [ai.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/ai.ts).
- **OpenAI configuration**
  - Env vars expected on backend: `OPENAI_API_KEY` and optional `OPENAI_MODEL`.

## Security / Privacy / Legal

| Feature | Mobile | Backend | Realtime | Notes |
|---|---:|---:|---:|---|
| Screenshot event telemetry | 🟡 | ✅ | — | Client logs on app background; backend accepts logs |
| Content/session reporting | 🟡 | ✅ | — | [security.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/security.ts) (limited wiring in UI) |
| Privacy Policy endpoint | ✅ | ✅ | — | Mobile links to `/api/legal/privacy` |
| “Secure view” true screenshot blocking | ⛔ | — | — | Not real OS-level prevention; current approach is “best-effort” telemetry |

### Security / Legal Details (Deep)

- **Screenshot telemetry**
  - Mobile implementation is “best-effort” and logs events when the app backgrounds: [security.ts](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/services/security.ts).
  - Backend records events via `/api/security/screenshot-detected`: [security routes](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/security.ts).
- **Privacy policy**
  - Served as JSON from `/api/legal/privacy`: [legal.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/legal.ts).

## Calls (Audio/Video)

| Feature | Mobile | Backend | Realtime | Notes |
|---|---:|---:|---:|---|
| Call UI | 🧪 | ⛔ | ⛔ | [CallScreen.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/screens/CallScreen.tsx) is a placeholder; WebRTC commented out |
| WebRTC calling | ⛔ | ⛔ | ⛔ | Requires dev build + signaling server work |

### Calls Details (Deep)

- The current call screen is intentionally a UI + mocked signaling placeholder (no media streams).
- Real calls would require:
  - `react-native-webrtc` in a dev build (not Expo Go)
  - signaling events (offer/answer/ice) on backend sockets
  - TURN server config (there are placeholders in `.env.example`)

## Admin / Moderation / Analytics

| Feature | Mobile | Backend | Realtime | Notes |
|---|---:|---:|---:|---|
| Admin panel | ⛔ | ⛔ | ⛔ | Not present |
| User blocking | ⛔ | ⛔ | ⛔ | Not present |
| Reporting dashboards | ⛔ | ⛔ | ⛔ | Not present |
| Analytics | ⛔ | ⛔ | ⛔ | Not present |

## Quick “What’s missing if you want Instagram-level polish”

- Persist likes/comments/saves in backend + UI lists
- Real story progression UI (tap to advance, progress bar, pause/hold)
- True screenshot prevention (platform-native secure views) via dev build
- Push notifications (message, story, post) end-to-end
- Proper auth flows: email link sign-in, phone OTP full enforcement, account recovery
- Moderation: report flows wired to UI, admin tools, blocking/muting
- Calls: real WebRTC + TURN + signaling + permissions + UI states

## Appendix A — REST API Catalog (Backend)

All routes are mounted under `/api` in [index.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/index.ts).

### Auth

- `POST /api/auth/sync` (Firebase token required) → create/update Mongo user: [auth.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/auth.ts)
- `GET /api/auth/users` (Firebase token required) → list users: [auth.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/auth.ts)
- `POST /api/auth/logout` (Firebase token required) → mark offline: [auth.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/auth.ts)

### User

- `PUT /api/user/me` (Firebase token required) → update profile: [user.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/user.ts)
- `DELETE /api/user/me` (Firebase token required) → delete account + data: [user.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/user.ts)

### Feed / Posts

- `GET /api/posts/feed` (Firebase token required) → global feed: [post.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/post.ts)
- `POST /api/posts` (Firebase token required) → create post: [post.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/post.ts)

### Stories

- `GET /api/stories` (Firebase token required) → list active stories: [story.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/story.ts)
- `POST /api/stories` (Firebase token required) → create story: [story.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/story.ts)

### Private Mode

- `POST /api/private/start` (Firebase token required) → create ephemeral session: [private.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/private.ts)
- `POST /api/private/end` (Firebase token required) → end session + delete data: [private.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/private.ts)

### Media

- `POST /api/media/upload` (Firebase token not required by current route) → upload file to Cloudinary: [media.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/media.ts)
- `GET /api/media/status` → Cloudinary configured status: [media.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/media.ts)

### AI

- `POST /api/ai/chat` (Firebase token required) → reply with OpenAI or fallback: [ai.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/ai.ts)

### Security / Legal

- `POST /api/security/screenshot-detected` → log screenshot telemetry: [security.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/security.ts)
- `POST /api/security/report` → report content/session (rate limited): [security.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/security.ts)
- `GET /api/legal/privacy` → privacy policy: [legal.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/legal.ts)

## Appendix B — Socket.IO Event Catalog

### Normal chat namespace (root)

Implemented in [chatHandler.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/socket/chatHandler.ts) and used by [ChatScreen.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/screens/ChatScreen.tsx).

- `user:join` (client → server) `{ userId }`
- `user:online` / `user:offline` (server → all) `{ userId }`
- `messages:get` (client → server) `{ userId, otherUserId }`
- `messages:history` (server → client) `Message[]`
- `message:send` (client → server) `{ senderId, receiverId, content, messageType, isPrivate }`
- `message:receive` (server → receiver) `Message`
- `message:sent` (server → sender) `Message`
- `typing:start` / `typing:stop` (client ↔ server) `{ senderId, receiverId }`
- `messages:read` (client → server) `{ senderId, receiverId }`

### Private namespace (`/private`)

Implemented in [privateHandler.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/socket/privateHandler.ts) and used by [PrivateModeScreen.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/screens/PrivateModeScreen.tsx).

- `private:join` (client → server) callback returns `{ sessionId, alias }`
- `private:broadcast` (client ↔ server) lobby messages
- `private:send` / `private:receive` for direct alias-based messaging
- `private:users` to list online aliases
- `private:exit` to delete session data

## Appendix C — Mobile Services (What’s Implemented vs Mocked)

- API client with token injection, health-check, retries: [api.ts](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/services/api.ts)
- Media picker + upload helper: [media.ts](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/services/media.ts)
- Message reactions manager: [messageReactions.ts](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/services/messageReactions.ts)
- Message status manager: 🟡 partially aligned with backend events: [messageStatus.ts](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/services/messageStatus.ts)
- Connection manager: 🧪 mocked NetInfo (dependency not installed): [connectionManager.ts](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/services/connectionManager.ts)

## Appendix D — Release Readiness / Production Checklist

This is a practical “what must be configured + what must be true” checklist before you publish the app.

### 1) Secrets & Environment Variables

**Backend (Render / production)**

- **MongoDB**
  - `MONGODB_URI` must be set and reachable (Atlas recommended).
- **Cloudinary (media uploads)**
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
  - Verify using: `GET /api/media/status` (should show configured/ready): [media.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/media.ts)
- **OpenAI (AI chatbot, optional)**
  - `OPENAI_API_KEY` (optional)
  - `OPENAI_MODEL` (optional)
  - If not set, AI endpoint falls back to a safe local reply: [ai.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/ai.ts)
- **Firebase Admin**
  - Token verification uses Firebase Admin in backend auth middleware: [auth.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/middleware/auth.ts)
  - If you add push notifications later, you must configure Firebase Admin service account credentials.

**Mobile (Expo / production)**

- `EXPO_PUBLIC_API_BASE_URL` should point to your production backend URL (Render): [appConfig.ts](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/config/appConfig.ts)
- Firebase “public” config should be set using `EXPO_PUBLIC_FIREBASE_*` env vars or bundled config: [firebase.ts](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/config/firebase.ts)
- For local development examples: [mobile .env.example](file:///d:/New%20folder%20(3)/Chatbull/mobile/.env.example)

### 2) Firebase Console Settings (Must-Do)

- Authentication → Sign-in methods
  - Enable **Email/Password** (current flow).
  - Enable **Phone** (required for SMS OTP step).
- Email templates
  - Configure sender name + verification email template (branding).

### 3) Auth Verification Rules (Product Choices)

- Email verification
  - Current behavior: app gates login until Firebase `emailVerified === true`: [LoginScreen.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/screens/LoginScreen.tsx)
  - If you want “numeric email OTP codes”, you need a custom backend OTP system (Firebase email verification uses links).
- Phone OTP verification
  - Current behavior: links phone number to the same Firebase user (`linkWithPhoneNumber`): [LoginScreen.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/screens/LoginScreen.tsx)
  - Product choice: keep “Skip for now” or remove it to enforce phone verification.

### 4) Backend Stability & Security Checks

- **CORS / proxy**
  - Backend uses `trust proxy` and permissive mobile-friendly CORS: [index.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/index.ts)
- **Rate limiting**
  - Global limiter is enabled; verify it doesn’t block high-frequency usage.
- **Media upload behavior**
  - Backend uses `multer` + temp file staging then Cloudinary upload: [media.ts](file:///d:/New%20folder%20(3)/Chatbull/backend/src/routes/media.ts)
  - If uploads fail, confirm Cloudinary env vars and verify the service has filesystem access for temp uploads.

### 5) Mobile Runtime Notes (Expo Go vs Dev Build)

- **Phone OTP (reCAPTCHA)**
  - Works best in a dev build in some environments; Expo Go can be inconsistent depending on device/runtime policy.
- **Calls (WebRTC)**
  - Current `CallScreen` is mocked; real calls require a dev build + `react-native-webrtc` + signaling: [CallScreen.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/screens/CallScreen.tsx)
- **Screenshot blocking**
  - Current approach is telemetry/best-effort; true screenshot blocking requires native secure views: [security.ts](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/services/security.ts)

### 6) Functional QA Checklist (Minimum)

- Signup → verify email → login.
- Phone OTP verify (one country/number).
- Users list loads (auth required).
- Chat send/receive + history.
- Media upload (photo + video) from camera + library.
- Feed create post + show in feed.
- Stories create + view.
- Private mode join + send + exit (data deletion expected).

### 7) Known Partial / Placeholder Areas (Expected Behavior)

- Likes/comments/saves are not persisted (UI-only in Feed).
- Message reactions are broadcast but not stored in DB.
- Message status manager event names don’t fully match backend events.
- Connection manager is currently mocked NetInfo (no real offline detection).
