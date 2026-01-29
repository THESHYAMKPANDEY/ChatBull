import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';
import { appConfig } from '../config/appConfig';
import { auth } from '../config/firebase';
import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

const getFsEncodingBase64 = () => {
  const fsAny = FileSystem as any;
  return fsAny?.EncodingType?.Base64 ?? 'base64';
};

const getFsCacheDir = () => {
  const fsAny = FileSystem as any;
  return fsAny?.cacheDirectory || fsAny?.documentDirectory || '';
};
export type PickedMedia = {
  uri: string;
  type: 'image' | 'video' | 'file';
  mimeType?: string;
  name?: string;
};

// Function to take a photo using camera
export const takePhoto = async (): Promise<PickedMedia | null> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Denied', 'Sorry, we need camera permissions to take photos.');
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
    return {
      uri: result.assets[0].uri,
      type: 'image',
      name: result.assets[0].fileName || `photo_${Date.now()}.jpg`,
      mimeType: 'image/jpeg'
    };
  }
  return null;
};

// Function to take a video using camera
export const takeVideo = async (): Promise<PickedMedia | null> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Denied', 'Sorry, we need camera permissions to record videos.');
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
    return {
      uri: result.assets[0].uri,
      type: 'video',
      name: result.assets[0].fileName || `video_${Date.now()}.mp4`,
      mimeType: 'video/mp4'
    };
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

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
    return {
      uri: result.assets[0].uri,
      type: 'image',
      name: result.assets[0].fileName || `image_${Date.now()}.jpg`,
      mimeType: 'image/jpeg'
    };
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

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
    return {
      uri: result.assets[0].uri,
      type: 'video',
      name: result.assets[0].fileName || `video_${Date.now()}.mp4`,
      mimeType: 'video/mp4'
    };
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
      const type = asset.mimeType?.startsWith('image/') ? 'image' : 
                   asset.mimeType?.startsWith('video/') ? 'video' : 'file';
      
      return {
        uri: asset.uri,
        type: type as 'image' | 'video' | 'file',
        name: asset.name,
        mimeType: asset.mimeType
      };
    }
    return null;
  } catch (error) {
    console.error('Document picker error:', error);
    return null;
  }
};

// Function to upload file to backend (which forwards to Cloudinary)
export const uploadFile = async (media: PickedMedia): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> => {
  const formData = new FormData();
  
  // Get file name from URI if not provided
  const actualFileName = media.name || media.uri.split('/').pop() || 'file';
  
  // Add file to form data
  formData.append('file', {
    uri: media.uri,
    name: actualFileName,
    type: media.mimeType || getFileType(media.uri),
  } as any);

  try {
    const token = await auth.currentUser?.getIdToken?.();
    if (!token) {
      return { success: false, error: 'Not authenticated. Please login again.' };
    }

    const response = await fetch(`${appConfig.API_BASE_URL}/api/media/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
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

const readFileBytes = async (media: PickedMedia): Promise<Uint8Array> => {
  if (Platform.OS === 'web') {
    const response = await fetch(media.uri);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  const base64 = await FileSystem.readAsStringAsync(media.uri, { encoding: getFsEncodingBase64() as any });
  return util.decodeBase64(base64);
};

const writeEncryptedTempFile = async (data: Uint8Array, name: string): Promise<string> => {
  const base64 = util.encodeBase64(data);
  const fileName = `${name || 'file'}_${Date.now()}.enc`;
  const cacheDir = getFsCacheDir();
  if (!cacheDir) {
    throw new Error('File system cache directory not available');
  }
  const fileUri = `${cacheDir}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: getFsEncodingBase64() as any });
  return fileUri;
};

export const uploadEncryptedFile = async (
  media: PickedMedia
): Promise<{ success: boolean; url?: string; error?: string; key?: string; nonce?: string }> => {
  try {
    const rawBytes = await readFileBytes(media);
    const key = nacl.randomBytes(32);
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const cipher = nacl.secretbox(rawBytes, nonce, key);

    const token = await auth.currentUser?.getIdToken?.();
    if (!token) {
      return { success: false, error: 'Not authenticated. Please login again.' };
    }

    const formData = new FormData();
    const actualFileName = media.name || media.uri.split('/').pop() || 'file';

    if (Platform.OS === 'web') {
      const buffer = (cipher.buffer as ArrayBuffer).slice(cipher.byteOffset, cipher.byteOffset + cipher.byteLength);
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      formData.append('file', blob, `${actualFileName}.enc`);
    } else {
      const fileUri = await writeEncryptedTempFile(cipher, actualFileName);
      formData.append('file', {
        uri: fileUri,
        name: `${actualFileName}.enc`,
        type: 'application/octet-stream',
      } as any);
    }

    const response = await fetch(`${appConfig.API_BASE_URL}/api/media/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText || `Upload failed with status ${response.status}` };
    }

    const result = await response.json();
    if (result.success) {
      return {
        success: true,
        url: result.url,
        key: util.encodeBase64(key),
        nonce: util.encodeBase64(nonce),
      };
    }

    return { success: false, error: result.error || 'Upload failed' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Encryption upload failed' };
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
