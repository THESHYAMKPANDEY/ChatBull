# Social Chat App - Setup & Verification Guide

## Project Overview
This is a React Native (Expo) + Node.js + MongoDB + Firebase social chat application with the following features:
- Real-time chat with Socket.IO
- Firebase Authentication
- Private anonymous chat mode
- Media sharing capabilities
- Social feed functionality
- Security features (screenshot prevention)
- Privacy controls

## Environment Configuration

### Backend (.env)
Ensure your backend `.env` file contains:
```
MONGODB_URI=your_mongodb_connection_string
PORT=5000
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Mobile (.env)
Ensure your mobile `.env` file contains:
```
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
EXPO_PUBLIC_API_BASE_URL=http://your_computer_ip:5000  # For device access
```

## Running the Application

### Backend Server
```bash
cd social-chat-app/backend
npm run dev
```

### Mobile App
```bash
cd social-chat-app/mobile
npx expo start
```

## Key Fixes Applied

1. **Firebase Auth Persistence**: Configured proper authentication persistence using underlying platform mechanisms
2. **Network Configuration**: Updated API configuration to handle different environments and device connectivity
3. **Error Handling**: Enhanced API service with comprehensive error handling and network failure detection
4. **Media Service**: Improved error handling for file uploads
5. **Environment Configuration**: Better handling of local vs production environments

## Stability Checks Performed

- ✅ Backend server runs without errors
- ✅ MongoDB connection established
- ✅ Firebase Admin SDK initialized
- ✅ Socket.IO ready for connections
- ✅ Mobile app bundle builds successfully
- ✅ Metro bundler running
- ✅ All API endpoints accessible

## For Device Testing

To test on a physical device:
1. Ensure both your computer and device are on the same WiFi network
2. Update `EXPO_PUBLIC_API_BASE_URL` in mobile `.env` to your computer's IP address
3. Example: `http://192.168.1.xxx:5000`
4. Scan the QR code with Expo Go app on your device

## Building for Production

To build APK for Android:
```bash
cd social-chat-app/mobile
npx expo prebuild
eas build --platform android
```

To build for iOS:
```bash
eas build --platform ios
```

## Troubleshooting

### Common Issues:

1. **Network Request Failed**:
   - Check that backend server is running
   - Verify API URL configuration
   - Ensure ports are not blocked by firewall

2. **Firebase Auth Issues**:
   - Verify Firebase project configuration
   - Check that `FIREBASE_SERVICE_ACCOUNT_JSON` is set in your environment variables
   - Confirm environment variables are set correctly

3. **Database Connection Issues**:
   - Verify MongoDB connection string
   - Check that MongoDB cluster is accessible

4. **Socket Connection Issues**:
   - Ensure backend server is running
   - Check that CORS settings allow connections

## Security Features

- Screenshot prevention in chat and private mode screens
- Automatic message deletion in private mode after 24 hours
- JWT-based authentication with Firebase
- Input validation and sanitization
- Rate limiting on API endpoints