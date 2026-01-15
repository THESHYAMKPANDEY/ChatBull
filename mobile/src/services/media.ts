import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { appConfig } from '../config/appConfig';

// Function to pick an image from device
export const pickImage = async (): Promise<string | null> => {
  // Request permission for iOS
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to access images.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
    return result.assets[0].uri;
  }
  return null;
};

// Function to pick a video from device
export const pickVideo = async (): Promise<string | null> => {
  // Request permission for iOS
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to access videos.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
    return result.assets[0].uri;
  }
  return null;
};

// Function to pick any document/file
export const pickDocument = async (): Promise<string | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'video/*', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    });

    if (result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error('Document picker error:', error);
    return null;
  }
};

// Function to upload file to backend (which forwards to Cloudinary)
export const uploadFile = async (fileUri: string, fileName?: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> => {
  const formData = new FormData();
  
  // Get file name from URI if not provided
  const actualFileName = fileName || fileUri.split('/').pop() || 'file';
  
  // Add file to form data
  formData.append('file', {
    uri: fileUri,
    name: actualFileName,
    type: getFileType(fileUri),
  } as any);

  try {
    const response = await fetch(`${appConfig.API_BASE_URL}/api/media/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload error response:', errorText);
      return {
        success: false,
        error: `Upload failed with status ${response.status}: ${errorText}`,
      };
    }

    const result = await response.json();

    if (result.success) {
      return {
        success: true,
        url: result.url,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Upload failed',
      };
    }
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('Network')) {
      console.error('Network error during upload:', error.message);
      return {
        success: false,
        error: 'Network request failed. Please check your connection and try again.',
      };
    }
    console.error('File upload error:', error);
    return {
      success: false,
      error: error.message || 'Network error occurred',
    };
  }
};

// Helper to determine file type based on extension
const getFileType = (fileUri: string): string => {
  const extension = fileUri.toLowerCase().split('.').pop() || '';
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
  const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv'];
  const docExtensions = ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx'];

  if (imageExtensions.includes(extension)) {
    return 'image/' + (extension === 'jpg' ? 'jpeg' : extension);
  } else if (videoExtensions.includes(extension)) {
    return 'video/' + extension;
  } else if (docExtensions.includes(extension)) {
    if (extension === 'pdf') return 'application/pdf';
    if (extension === 'txt') return 'text/plain';
    if (extension === 'doc') return 'application/msword';
    if (extension === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return 'application/octet-stream';
  }

  return 'application/octet-stream';
};
