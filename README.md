# ChatBull - Secure Social AI Chat

A secure, real-time chat application built with React Native (Expo) and Node.js/Express backend, featuring **JANEAI** (Voice-enabled AI Assistant).

## Features

### JANEAI (New!)
- **Voice Interaction**: Speak to JANEAI and hear responses (Speech-to-Text & Text-to-Speech).
- **AI Chat**: Powered by OpenAI for intelligent assistance.
- **Smart Assistant**: Helps with app features, debugging, and general queries.

### Core Chat Features
- Real-time messaging using Socket.IO
- User authentication with Firebase (OTP/Email)
- Private chat rooms
- Media sharing (images, videos, documents)
- Online/offline status indicators
- Typing indicators

### Security Features
- Screenshot prevention in chat and private mode screens
- Secure session management
- Privacy controls
- Anonymous private mode with automatic message deletion
- Security monitoring for screenshot detection

### Privacy Features
- Private mode with anonymous identities
- Automatic message deletion after 24 hours in private mode
- Ability to delete account and all associated data
- Privacy policy compliance

## Tech Stack

### Frontend (Mobile)
- React Native with Expo (Managed Workflow)
- TypeScript
- Socket.IO Client
- Firebase Authentication
- Expo AV & Expo Speech (Voice)
- React Navigation

### Backend
- Node.js with Express
- TypeScript
- MongoDB with Mongoose ODM
- Socket.IO for real-time communication
- Cloudinary for media storage
- Firebase Admin SDK for push notifications

### Security
- Helmet for security headers
- Express rate limiting
- Input validation with express-validator
- CORS configuration
- Environment-based configuration

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- MongoDB Atlas account
- Firebase project
- Cloudinary account (for media storage)
- OpenAI API Key (for JANEAI)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
MONGODB_URI=your_mongodb_connection_string
PORT=10000
FIREBASE_SERVICE_ACCOUNT_JSON=your_firebase_service_account_json_as_single_line
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
OPENAI_API_KEY=your_openai_key
```

4. Start the backend server:
```bash
npm run dev
```

### Mobile App Setup

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your configuration:
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
# For device access, use your computer's IP address instead of localhost
EXPO_PUBLIC_API_BASE_URL=http://your_computer_ip_address:10000
```

4. Start the development server:
```bash
npx expo start
```
*Note: We use `newArchEnabled: false` in `app.json` for maximum compatibility.*

### Running Both Servers

1. Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

2. Terminal 2 - Mobile:
```bash
cd mobile
npx expo start
```

## Architecture

### Backend Structure
- `src/controllers/` - Business logic controllers
- `src/models/` - Database models (User, Message, PrivateMessage)
- `src/routes/` - API route definitions
- `src/socket/` - Socket.IO handlers for real-time features
- `src/services/` - External service integrations (Cloudinary, Firebase)
- `src/middleware/` - Validation and authentication middleware
- `src/utils/` - Utility functions (logging, helpers)

### Mobile Structure
- `src/screens/` - UI screens (Login, Chat, Private Mode, JANEAI, etc.)
- `src/services/` - API clients and utilities (Firebase, Media, Security)
- `src/config/` - Configuration files (Firebase setup)
- `src/components/` - Reusable UI components

## API Endpoints

### JANEAI
- `POST /api/ai/chat` - Chat with JANEAI
- `POST /api/ai/transcribe` - Speech-to-Text

### Authentication
- `POST /api/auth/sync` - Sync user with backend
- `GET /api/auth/profile/:firebaseUid` - Get user profile
- `GET /api/auth/users` - Get all users
- `POST /api/auth/logout` - Logout user

### User Management
- `DELETE /api/user/me` - Delete user account
- `PUT /api/user/me` - Update user profile

### Media
- `POST /api/media/upload` - Upload media file
- `POST /api/media/upload-multiple` - Upload multiple files

### Legal & Security
- `GET /api/legal/privacy` - Privacy policy
- `POST /api/security/screenshot-detected` - Screenshot detection logging

## Security Features Implementation

1. **Screenshot Prevention**: Uses `react-native-screenshot-prevent` library to prevent screenshots in sensitive areas
2. **Anonymous Private Mode**: Generates temporary aliases and deletes messages after 24 hours
3. **Input Validation**: Comprehensive validation using express-validator
4. **Rate Limiting**: Prevents abuse with express-rate-limit
5. **Security Headers**: Helmet adds various security headers
6. **Data Deletion**: Complete data removal on account deletion

## Privacy & Ephemeral Mode
The new "Private Tab" features true ephemeral messaging:
- **Session-Based**: Each private session generates a unique, temporary ID (`ephemeralUserId`) and session ID.
- **Auto-Deletion (TTL)**: MongoDB TTL indexes automatically wipe sessions and messages after 6 hours.
- **Secure Wipe**: Ending a session triggers an atomic deletion of all associated messages and media.
- **Media**: Private media uploads are tagged as 'ephemeral' and wiped on session end.
- **Audit Logs**: Deletion events are logged (metadata only) for compliance.

**Note**: While we strive for privacy, we cannot prevent physical recording devices. Do not use this platform for illegal activities. We cooperate with lawful requests.

## Premium Features
- **Verified Badge**: Golden tick for premium users.
- **Gated Features**: High-quality uploads, Story Highlights (coming soon).

### Seeding Premium Users
To seed the initial premium users (Amit & Shyam), run:
```bash
# In backend directory
npx ts-node scripts/seedUsers.ts
```
Ensure `MONGODB_URI` is set in your `.env`.

## 🔐 Security & Secrets
- **NEVER commit .env files.**
- Use `scrub_secrets.sh` if you accidentally commit keys.
- **Rotation**: If a key is leaked, revoke it immediately in the provider dashboard (Firebase/MongoDB) and update Render env vars.

## 📦 Deployment
- **Backend**: See [DEPLOYMENT_GODADDY.md](docs/DEPLOYMENT_GODADDY.md) for detailed deployment instructions including GoDaddy custom domain setup.
- **Mobile**: Use `eas build` or `npx expo publish`.


## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact the development team or create an issue in the GitHub repository.
