import { appConfig } from '../config/appConfig';
import { auth } from '../config/firebase';

const API_URL = `${appConfig.API_BASE_URL}/api`;
const TIMEOUT_MS = 8000;

const logDev = (...args: any[]) => {
  if (__DEV__) console.log(...args);
};

const warnDev = (...args: any[]) => {
  if (__DEV__) console.warn(...args);
};

const errorDev = (...args: any[]) => {
  if (__DEV__) console.error(...args);
};

// Enhanced fetch wrapper with comprehensive error handling
const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  // Add timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  
  try {
    logDev(`🚀 API Request: ${API_URL}${endpoint}`);
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Handle different error statuses
      const errorData = await response.text();
      let errorMessage = `HTTP Error: ${response.status}`;
      let errorDetails: any = undefined;
      
      try {
        const parsedError = JSON.parse(errorData);
        errorMessage = parsedError.error || parsedError.message || errorMessage;
        errorDetails = parsedError.details;

        if (
          errorMessage.toLowerCase().includes('validation') &&
          Array.isArray(errorDetails) &&
          errorDetails.length > 0
        ) {
          const messages = errorDetails
            .map((d: any) => d?.msg)
            .filter(Boolean)
            .slice(0, 2);
          if (messages.length > 0) {
            errorMessage = `${errorMessage}: ${messages.join(', ')}`;
          }
        }
      } catch {
        // If error response isn't JSON, use the raw text
        errorMessage = errorData || errorMessage;
      }
      
      errorDev(`❌ API Error: ${endpoint}`, {
        status: response.status,
        message: errorMessage,
        details: errorDetails,
        url: response.url
      });
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    logDev(`✅ API Success: ${endpoint}`);
    return data;
    
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      errorDev('⏰ Request timeout:', endpoint);
      throw new Error('Request timed out. Please check your connection.');
    }
    
    if (error.name === 'TypeError' && error.message.includes('Network')) {
      errorDev('🌐 Network error:', error.message);
      throw new Error('Network request failed. Please check your WiFi connection.');
    }
    
    errorDev(`💥 API request failed: ${endpoint}`, error);
    throw error;
  }
};

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    warnDev('No current user, proceeding without auth header');
    return {};
  }

  try {
    // Force refresh token to ensure it's valid
    const idToken = await currentUser.getIdToken(true);
    
    return {
      Authorization: `Bearer ${idToken}`,
    };
  } catch (error) {
    errorDev('Auth token error:', error);
    return {};
  }
};

export const api = {
  // Health check endpoint
  healthCheck: async () => {
    try {
      logDev('🔍 Performing health check...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${appConfig.API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        logDev('✅ Health check passed');
        return { success: true, data };
      } else {
        errorDev('❌ Health check failed:', response.status);
        return { success: false, error: `Health check failed with status ${response.status}` };
      }
    } catch (error: any) {
      errorDev('💥 Health check error:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  },
  
  // Auth endpoints
  sendEmailOtp: async (email: string) => {
    return await apiRequest('/auth/email-otp/send', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  verifyEmailOtp: async (email: string, otp: string) => {
    return await apiRequest('/auth/email-otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  },

  syncUser: async (userData: {
    firebaseUid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    phoneNumber?: string;
  }) => {
    logDev('🔄 Starting user sync process...');
    
    // Perform health check before sync
    const health = await api.healthCheck();
    if (!health.success) {
      warnDev('⚠️ Backend health check failed, but proceeding with sync...');
    }
    
    const maxRetries = 2;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logDev(`🔄 Sync attempt ${attempt}/${maxRetries}`);
        
        const headers = await getAuthHeaders();
        
        const result = await apiRequest('/auth/sync', {
          method: 'POST',
          headers,
          body: JSON.stringify(userData),
        });
        
        logDev('✅ User sync successful!');
        return result;
        
      } catch (error: any) {
        lastError = error;
        errorDev(`❌ Sync attempt ${attempt} failed:`, error.message);
        
        // Don't retry on certain errors
        if (error.message.includes('401') || error.message.includes('403')) {
          warnDev('🔐 Authentication error - not retrying');
          throw error;
        }
        
        // Retry with exponential backoff
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          logDev(`⏳ Waiting ${delay}ms before retry ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed
    errorDev('💥 All sync attempts failed');
    throw lastError;
  },

  getStories: async () => {
    const headers = await getAuthHeaders();
    return await apiRequest('/stories', { headers });
  },

  createStory: async (storyData: { mediaUrl: string; mediaType: 'image' | 'video' }) => {
    const headers = await getAuthHeaders();
    return await apiRequest('/stories', {
      method: 'POST',
      headers,
      body: JSON.stringify(storyData),
    });
  },

  getUsers: async () => {
    const headers = await getAuthHeaders();
    
    return await apiRequest('/auth/users', {
      headers,
    });
  },

  logout: async () => {
    const headers = await getAuthHeaders();
    
    return await apiRequest('/auth/logout', {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
  },

  deleteAccount: async () => {
    const headers = await getAuthHeaders();
    
    return await apiRequest('/user/me', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({}),
    });
  },

  updateProfile: async (userData: {
    displayName?: string;
    photoURL?: string;
    phoneNumber?: string;
  }) => {
    const headers = await getAuthHeaders();
    
    return await apiRequest('/user/me', {
      method: 'PUT',
      headers,
      body: JSON.stringify(userData),
    });
  },

  // Posts / Feed
  getFeed: async () => {
    const headers = await getAuthHeaders();
    
    return await apiRequest('/posts/feed', {
      headers,
    });
  },

  createPost: async (postData: {
    content: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'file';
  }) => {
    const headers = await getAuthHeaders();
    
    return await apiRequest('/posts', {
      method: 'POST',
      headers,
      body: JSON.stringify(postData),
    });
  },

  togglePostLike: async (postId: string) => {
    const headers = await getAuthHeaders();
    
    return await apiRequest(`/posts/${postId}/like`, {
      method: 'POST',
      headers,
    });
  },

  // AI Chat
  aiChat: async (message: string) => {
    const headers = await getAuthHeaders();
    
    return await apiRequest('/ai/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({ message }),
    });
  },

  // Private Mode
  startPrivateSession: async (encryptionKey?: string) => {
    const headers = await getAuthHeaders();
    return await apiRequest('/private/start', {
      method: 'POST',
      headers,
      body: JSON.stringify({ encryptionKey }),
    });
  },

  endPrivateSession: async (sessionId: string) => {
    const headers = await getAuthHeaders();
    return await apiRequest('/private/end', {
      method: 'POST',
      headers,
      body: JSON.stringify({ sessionId }),
    });
  },
};
