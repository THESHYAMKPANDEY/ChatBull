import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://chatbull.onrender.com/api';

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
    void phoneNumber;
    return {
      data: {
        message: 'OTP Sent',
        devOtp: '123456',
      }
    };
  },

  loginWithEmail: async (email: string, password: string) => {
    if (email && password) {
         await new Promise(resolve => setTimeout(resolve, 500));
         
         return {
              data: {
                   access_token: 'mock_jwt_token_' + Date.now(),
                   user: {
                        id: 'user_' + Date.now(),
                        email: email,
                        displayName: email.split('@')[0],
                   }
              }
         };
    }
    throw new Error('Invalid credentials');
  },
  
  verifyOtp: async (phoneNumber: string, otp: string, identityKey: string, registrationId: string) => {
    void identityKey;
    void registrationId;
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
  },
  sendEmailOtp: async (email: string) => {
    return api.post('/auth/email-otp/send', { email });
  },
  verifyEmailOtp: async (email: string, otp: string) => {
    return api.post('/auth/email-otp/verify', { email, otp });
  }
};

export default api;
