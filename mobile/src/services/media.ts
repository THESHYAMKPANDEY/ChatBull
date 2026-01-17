import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { appConfig } from '../config/appConfig';
import { auth } from '../config/firebase';

export type PickedMedia = {
  uri: string;
  name: string;
  mimeType: string;
  kind: 'image' | 'video' | 'file';
};

export const takePhoto = async (): Promise<PickedMedia | null> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Denied', 'Sorry, we need camera permissions to take photos.');
    return null;
  }

  const imagesType =
    (ImagePicker as any).MediaType?.Images ?? (ImagePicker as any).MediaTypeOptions?.Images;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: imagesType,
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
    const asset = result.assets[0];
    const name = asset.fileName || asset.uri.split('/').pop() || `photo-${Date.now()}.jpg`;
    const mimeType = asset.mimeType || 'image/jpeg';
    return { uri: asset.uri, name, mimeType, kind: 'image' };
  }
  return null;
};

export const takeVideo = async (): Promise<PickedMedia | null> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Denied', 'Sorry, we need camera permissions to record videos.');
    return null;
  }

  const videosType =
    (ImagePicker as any).MediaType?.Videos ?? (ImagePicker as any).MediaTypeOptions?.Videos;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: videosType,
    quality: 0.8,
  });

  if (!result.canceled) {
    const asset = result.assets[0];
    const name = asset.fileName || asset.uri.split('/').pop() || `video-${Date.now()}.mp4`;
    const mimeType = asset.mimeType || 'video/mp4';
    return { uri: asset.uri, name, mimeType, kind: 'video' };
  }
  return null;
};

// Function to pick an image from device
export const pickImage = async (): Promise<PickedMedia | null> => {
  // Request permission for iOS
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to access images.');
    return null;
  }

  const imagesType =
    (ImagePicker as any).MediaType?.Images ?? (ImagePicker as any).MediaTypeOptions?.Images;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: imagesType,
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
    const asset = result.assets[0];
    const name = asset.fileName || asset.uri.split('/').pop() || `image-${Date.now()}.jpg`;
    const mimeType = asset.mimeType || 'image/jpeg';
    return { uri: asset.uri, name, mimeType, kind: 'image' };
  }
  return null;
};

// Function to pick a video from device
export const pickVideo = async (): Promise<PickedMedia | null> => {
  // Request permission for iOS
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to access videos.');
    return null;
  }

  const videosType =
    (ImagePicker as any).MediaType?.Videos ?? (ImagePicker as any).MediaTypeOptions?.Videos;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: videosType,
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
    const asset = result.assets[0];
    const name = asset.fileName || asset.uri.split('/').pop() || `video-${Date.now()}.mp4`;
    const mimeType = asset.mimeType || 'video/mp4';
    return { uri: asset.uri, name, mimeType, kind: 'video' };
  }
  return null;
};

// Function to pick any document/file
export const pickDocument = async (): Promise<PickedMedia | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'video/*', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    });

    if (result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const name = asset.name || asset.uri.split('/').pop() || `file-${Date.now()}`;
      const mimeType = asset.mimeType || getFileType(asset.uri);
      const isImage = mimeType.startsWith('image/');
      const isVideo = mimeType.startsWith('video/');
      const kind: PickedMedia['kind'] = isImage ? 'image' : isVideo ? 'video' : 'file';
      return { uri: asset.uri, name, mimeType, kind };
    }
    return null;
  } catch (error) {
    console.error('Document picker error:', error);
    return null;
  }
};

// Function to upload file to backend (which forwards to Cloudinary)
export const uploadFile = async (picked: PickedMedia): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> => {
  const formData = new FormData();
  
  formData.append('file', {
    uri: picked.uri,
    name: picked.name,
    type: picked.mimeType,
  } as any);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    const currentUser = auth.currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken();
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${appConfig.API_BASE_URL}/api/media/upload`, {
      method: 'POST',
      body: formData,
      headers,
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
