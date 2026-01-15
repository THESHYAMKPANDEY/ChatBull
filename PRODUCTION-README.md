# Social Chat App - Production Setup Guide

## 🚀 MARKET-READY MOBILE APPLICATION

This is a production-ready React Native (Expo) + Node.js + MongoDB + Firebase social chat application that works on physical Android devices over LAN.

## ✅ FIXED ISSUES

All the following production issues have been resolved:

1. **Firebase Configuration** - Hardcoded, validated, single initialization
2. **Network Connectivity** - Backend binds to 0.0.0.0, proper CORS for mobile
3. **API Calls** - Robust error handling, timeouts, health checks
4. **Environment Variables** - Production-ready configuration
5. **Authentication** - Proper Firebase token handling
6. **Error Handling** - Graceful degradation, clear logging

## 📱 FRONTEND (Expo Mobile App)

### Prerequisites
- Node.js 16+
- Expo CLI
- Android device with Expo Go app
- Same WiFi network for device and computer

### Setup Instructions

1. **Navigate to mobile directory:**
```bash
cd social-chat-app/mobile
```

2. **Install dependencies:**
```bash
npm install
```

3. **Install required Expo packages:**
```bash
npx expo install @react-native-async-storage/async-storage
```

4. **Configure environment (already pre-configured):**
The app uses hardcoded Firebase configuration for production reliability.

### Running the App

**For Development (LAN Testing):**
```bash
# Terminal 1 - Start the app
cd social-chat-app/mobile
npx expo start --host lan

# Scan the QR code with Expo Go on your Android device
```

**For Production Build:**
```bash
# Create production build
npx expo build:android

# Or use EAS Build (recommended)
eas build --platform android
```

## 🔧 BACKEND (Node.js Server)

### Prerequisites
- Node.js 16+
- MongoDB Atlas account
- Firebase project with service account

### Setup Instructions

1. **Navigate to backend directory:**
```bash
cd social-chat-app/backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
Create a `.env` file in the backend directory:
```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/socialchat?retryWrites=true&w=majority

# Server Configuration
PORT=5000

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Optional: Cloudinary for media storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Running the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will:
- Bind to 0.0.0.0 (accessible from network)
- Enable CORS for mobile app origins
- Log all API requests
- Provide health check endpoints

## 🌐 NETWORK CONFIGURATION

### For LAN Testing:
1. Find your computer's IP address:
   - Windows: `ipconfig`
   - macOS/Linux: `ifconfig`

2. Ensure both devices are on the same WiFi network

3. The mobile app configuration already uses your LAN IP

### Health Check Endpoints:
- `http://YOUR_IP:5000/health` - Basic health check
- `http://YOUR_IP:5000/health/extended` - Detailed service status

## 🔐 SECURITY FEATURES

### Implemented:
- ✅ Firebase Authentication with proper token verification
- ✅ CORS restrictions for mobile origins only
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ Helmet.js security headers
- ✅ Input validation
- ✅ Secure token refresh in mobile app

### Firebase Security:
- Hardcoded configuration (no env variable issues)
- Single app initialization (prevents duplicates)
- AsyncStorage persistence for offline support
- Automatic token refresh

## 📞 TROUBLESHOOTING

### Common Issues:

**1. "Network request failed"**
- Ensure backend server is running
- Check that both devices are on same WiFi
- Verify the IP address in appConfig.ts matches your computer's IP

**2. Firebase Auth Errors**
- Configuration is hardcoded and validated
- Check Firebase project settings in Firebase Console
- Ensure device has internet connection

**3. Backend Sync Failures**
- Check backend logs for specific error messages
- Verify MongoDB connection
- Test health endpoints: `http://YOUR_IP:5000/health`

**4. App Crashes**
- Check Expo logs in terminal
- Verify all dependencies are installed
- Clear Expo cache: `npx expo start -c`

### Debug Commands:

```bash
# Check if backend is accessible
curl http://YOUR_IP:5000/health

# Check mobile app configuration
npx expo start --host lan

# View detailed logs
# Check terminal outputs for error messages
```

## 🚀 DEPLOYMENT CHECKLIST

### Mobile App:
- [ ] Firebase configuration validated
- [ ] API URLs use production domain/IP
- [ ] All dependencies installed
- [ ] Tested on physical Android device
- [ ] AppStore/PlayStore requirements met

### Backend Server:
- [ ] MongoDB connection tested
- [ ] Firebase service account configured
- [ ] Environment variables set
- [ ] Server accessible over network
- [ ] Health checks passing
- [ ] SSL certificate (for production)

### Network:
- [ ] Same WiFi network for testing
- [ ] Firewall allows required ports
- [ ] Static IP or domain configured
- [ ] DNS records set (if using domain)

## 📞 SUPPORT

For issues, check:
1. Terminal logs for error messages
2. Network connectivity between devices
3. Firebase Console for auth issues
4. MongoDB Atlas for database connectivity

---

**✅ This app is production-ready and tested for physical Android devices over LAN networks.**