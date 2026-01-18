# Chatbull 🐂

> Secure, private, and real-time social messaging platform.

## 🚀 Features

- **Real-time Chat**: Instant messaging with Socket.IO.
- **Private Mode**: Ephemeral, anonymous chat sessions with end-to-end encryption.
- **Stories**: Share moments with friends (24h expiry).
- **AI Assistant**: Smart conversational AI integrated into the chat.
- **Secure**: JWT authentication, Helmet security headers, and encrypted private chats.

## 🛠 Tech Stack

- **Mobile**: React Native (Expo), TypeScript
- **Backend**: Node.js, Express, Socket.IO, TypeScript, MongoDB
- **Infrastructure**: Render (Deployment), Firebase (Auth & Push Notifications)

## 📦 Installation

### Backend

```bash
cd backend
npm install
npm run build
npm start
```

### Mobile

```bash
cd mobile
npm install
npx expo start
```

## 🔒 Security

- All private messages are end-to-end encrypted (client-side key exchange).
- No message logs are persisted for Private Mode sessions.
- Rate limiting and secure headers enabled.

## 🚢 Deployment

Deployment is managed via Render. See `render.yaml` for configuration.

## 📄 License

MIT
