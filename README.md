# Social Chat App

A secure, real-time chat application built with React Native (Expo) and Node.js/Express backend.

## Features

### Core Chat Features
- Real-time messaging using Socket.IO
- User authentication with Firebase
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
- React Native with Expo
- TypeScript
- Socket.IO Client
- Firebase Authentication
- React Navigation
- Screenshot prevention library

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
- Node.js (v16 or higher)
- npm or yarn
- MongoDB Atlas account
- Firebase project
- Cloudinary account (for media storage)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd social-chat-app/backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
MONGODB_URI=your_mongodb_connection_string
PORT=5000
FIREBASE_SERVICE_ACCOUNT_JSON=your_firebase_service_account_json_as_single_line
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

4. Start the backend server:
```bash
npm run dev
```

### Mobile App Setup

1. Navigate to the mobile directory:
```bash
cd social-chat-app/mobile
```

2. Install dependencies:
```bash
npm install
```

3. Install additional required packages:
```bash
npx expo install @react-native-async-storage/async-storage
```

4. Create a `.env` file with your Firebase configuration:
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
# For device access, use your computer's IP address instead of localhost
EXPO_PUBLIC_API_BASE_URL=http://your_computer_ip_address:5000
```

5. Start the development server:
```bash
npx expo start
```

### For Physical Device Testing

To test on a physical device:
1. Ensure both your computer and device are on the same WiFi network
2. Replace `localhost` in `EXPO_PUBLIC_API_BASE_URL` with your computer's IP address
3. Example: `http://192.168.1.xxx:5000`
4. Scan the QR code with Expo Go app on your device

### Running Both Servers

1. Terminal 1 - Backend:
```bash
cd social-chat-app/backend
npm run dev
```

2. Terminal 2 - Mobile:
```bash
cd social-chat-app/mobile
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
- `src/screens/` - UI screens (Login, Chat, Private Mode, etc.)
- `src/services/` - API clients and utilities (Firebase, Media, Security)
- `src/config/` - Configuration files (Firebase setup)
- `src/components/` - Reusable UI components

## API Endpoints

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

## Privacy Controls

- **Private Mode**: Anonymous chat with automatic message deletion
- **Account Deletion**: Complete removal of user data from system
- **Data Encryption**: Messages encrypted in transit
- **Compliance**: Privacy policy outlining data practices

## Running Tests

Coming soon - unit and integration tests for all major functionality.

## Deployment

### Backend Deployment
Deploy to platforms like Heroku, AWS, or DigitalOcean with:
- MongoDB Atlas for database
- Cloudinary for media storage
- Firebase for authentication

### Mobile Deployment
Use Expo Application Services (EAS) for building and deploying:
```bash
eas build --platform android
eas build --platform ios
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact the development team or create an issue in the GitHub repository.
