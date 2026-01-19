# Calling Architecture & Implementation Guide

## Overview
This document outlines the architecture for the cross-platform calling feature in ChatBull, covering Web, Mobile, and Backend components. The solution utilizes WebRTC for peer-to-peer media streaming and Socket.IO for signaling.

## 1. Architecture

### Backend (Signaling Server)
- **Tech**: Node.js, Express, Socket.IO
- **Role**: Relays SDP offers/answers and ICE candidates between peers. Does not process media.
- **Files**:
  - `src/socket/callHandler.ts`: Manages call events (`call:start`, `call:signal`, `call:end`).
  - `src/models/Call.ts`: Stores call logs for analytics.

### Web Client
- **Tech**: React, Native WebRTC API (`RTCPeerConnection`)
- **Features**: Audio/Video, Screen Sharing, Local Recording.
- **Files**:
  - `src/lib/CallManager.ts`: Singleton managing WebRTC state.
  - `src/components/CallModal.tsx`: UI for calls.

### Mobile Client (React Native)
- **Tech**: React Native, `react-native-webrtc`
- **Status**: Currently configured for ZegoCloud. To switch to the custom WebRTC implementation (matching Web), follow the guide below.

---

## 2. Web Implementation Details

### Screen Sharing
Implemented using `navigator.mediaDevices.getDisplayMedia()`.
- **Flow**:
  1. User clicks "Share Screen".
  2. Browser prompts to select window/tab.
  3. `CallManager` replaces the video track in the existing `RTCPeerConnection`.
  4. Remote peer automatically receives the new stream.

### Call Recording
Implemented using `MediaRecorder`.
- **Flow**:
  1. User clicks "Record".
  2. `MediaRecorder` captures the **remote stream**.
  3. On stop, a `.webm` file is generated and downloaded locally.
  4. *Note*: For full session recording (local + remote), a mixed AudioContext would be required.

### Network Quality
Monitors `RTCPeerConnection.getStats()` every 2 seconds.
- Checks `currentRoundTripTime` (RTT) of the active candidate pair.
- **Thresholds**:
  - Good: RTT < 200ms
  - Poor: RTT < 500ms
  - Bad: RTT > 500ms

---

## 3. Mobile Implementation Guide (React Native)

To align the mobile app with the new WebRTC backend, replace the ZegoCloud implementation with `react-native-webrtc`.

### Step 1: Install Dependencies
```bash
npm install react-native-webrtc socket.io-client
```

### Step 2: Configure Permissions
**Android (`android/app/src/main/AndroidManifest.xml`)**:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

**iOS (`ios/Podfile`)**:
```ruby
# Add permission descriptions in Info.plist
```

### Step 3: Implement `CallService.ts`
Create a service similar to `web/src/lib/CallManager.ts` but adapt imports:

```typescript
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
} from 'react-native-webrtc';

// Replace navigator.mediaDevices.getUserMedia with:
const stream = await mediaDevices.getUserMedia({
  audio: true,
  video: true
});
```

### Step 4: Build UI
Use `<RTCView />` component:

```tsx
import { RTCView } from 'react-native-webrtc';

// ...
<RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} />
<RTCView streamURL={localStream.toURL()} style={styles.localVideo} />
```

---

## 4. Security & Compliance

### Encryption
- **WebRTC**: Mandates DTLS-SRTP (Datagram Transport Layer Security over Secure Real-time Transport Protocol). All media is encrypted end-to-end by default.
- **Signaling**: Socket.IO connection should be secured via TLS (WSS/HTTPS) in production.

### Data Protection (GDPR)
- **Consent**: Call recording feature requires user action to start.
- **Storage**: Recordings are stored locally on the user's device (client-side), ensuring the server never touches the media content, simplifying GDPR compliance.

## 5. Scalability & Performance
- **Current Setup**: Mesh topology (P2P). Good for 1:1 calls.
- **Future Scale**: For group calls (>3 users), integrate an **SFU (Selective Forwarding Unit)** like **mediasoup** or **LiveKit** to reduce bandwidth usage on clients.
