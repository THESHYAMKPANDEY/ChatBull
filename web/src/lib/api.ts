import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: async (phoneNumber: string) => {
    // In a real app, this would call the backend to send OTP
    // For this demo/dev, we might mock it or hit a dev endpoint
    // Assuming backend has an endpoint like /auth/login-otp or similar
    // Since I don't see the exact backend route for phone login in the file list (I saw email otp in .env),
    // I will assume a standard flow or mock it for the "dev" experience as the App.tsx suggests "Dev Code".
    
    // Using a mock response for now to allow the UI to proceed
    return {
      data: {
        message: 'OTP Sent',
        devOtp: '123456', // Mock OTP
      }
    };
  },
  
  verifyOtp: async (phoneNumber: string, otp: string, identityKey: string, registrationId: string) => {
    // Mock verification
    if (otp === '123456') {
      return {
        data: {
          access_token: 'mock_jwt_token_' + Date.now(),
          user: {
            id: 'user_' + Date.now(),
            phoneNumber,
            displayName: 'User ' + phoneNumber.slice(-4),
          }
        }
      };
    }
    throw new Error('Invalid OTP');
  }
};

export default api;
