# ChatBull Enterprise 🐂

> **Secure, Private, and Real-Time Communication Platform**

ChatBull is a production-ready enterprise messaging solution designed for secure, ephemeral, and real-time communication. Built with privacy and scalability at its core, it powers seamless interaction across mobile and web platforms.

---

## 🚀 Key Features

*   **Real-time Messaging**: Low-latency chat powered by Socket.IO.
*   **Private Mode**: End-to-end encrypted ephemeral sessions with zero data persistence.
*   **Multimedia Sharing**: Secure image and video sharing with automatic cleanup.
*   **AI Integration**: Smart conversational assistant for enhanced user productivity.
*   **Enterprise Security**:
    *   JWT-based authentication.
    *   Strict rate limiting and brute-force protection.
    *   Helmet-hardened HTTP headers.
    *   Input sanitization against XSS and NoSQL injection.

---

## 🛠 Technology Stack

### Backend
*   **Runtime**: Node.js v22+
*   **Framework**: Express.js (TypeScript)
*   **Database**: MongoDB (Atlas)
*   **Real-time**: Socket.IO
*   **Infrastructure**: Render (Production), Firebase (Auth & Push)

### Mobile
*   **Framework**: React Native (Expo SDK 50+)
*   **Language**: TypeScript
*   **Build System**: EAS (Expo Application Services)

---

## 📦 Production Installation

### Backend

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/YourCompany/ChatBull.git
    cd ChatBull/backend
    ```

2.  **Install dependencies**:
    ```bash
    npm install --production
    ```

3.  **Environment Configuration**:
    Create a `.env` file based on `.env.example` with your production credentials.

4.  **Start the Server**:
    ```bash
    npm start
    ```

### Mobile

1.  **Navigate to mobile directory**:
    ```bash
    cd ../mobile
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Build for Production**:
    *   **Android**: `eas build -p android --profile production`
    *   **iOS**: `eas build -p ios --profile production`

---

## 🔒 Security & Compliance

ChatBull adheres to strict security standards:
*   **Data Privacy**: No private message logs are stored on servers.
*   **Encryption**: All sensitive data is encrypted in transit (TLS) and at rest.
*   **Access Control**: Role-based access control via Firebase Authentication.

---

## 📄 License

Copyright (c) 2026 ChatBull Inc. All Rights Reserved.

This project is proprietary software. Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited without the express written permission of ChatBull Inc.

---

## 📞 Support

For enterprise support or inquiries, please contact:
*   **Email**: support@chatbull.enterprise
*   **Website**: [https://chatbull.enterprise](https://chatbull.enterprise)
