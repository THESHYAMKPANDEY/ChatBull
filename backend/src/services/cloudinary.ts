import { v2 as cloudinary } from 'cloudinary';
import { UploadApiOptions } from 'cloudinary';

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload file to Cloudinary
 * @param filePath Path to the local file to upload
 * @param options Cloudinary upload options
 * @param isPrivate If true, upload to a private folder and add 'private' tag
 * @returns Cloudinary response object with secure_url, public_id, etc.
 */
export const uploadToCloudinary = async (
  filePath: string,
  options: Partial<UploadApiOptions> = {},
  isPrivate: boolean = false
) => {
  try {
    // Set default options
    const uploadOptions: UploadApiOptions = {
      folder: isPrivate ? 'social-chat-app/private' : 'social-chat-app', // Separate private folder
      resource_type: 'auto', // Automatically detect image/video/raw
      tags: isPrivate ? ['private', 'ephemeral'] : [],
      ...options,
    };

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);
    return result;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Upload multiple files to Cloudinary
 */
export const uploadMultipleToCloudinary = async (
  filePaths: string[],
  options: Partial<UploadApiOptions> = {}
) => {
  try {
    const uploadPromises = filePaths.map(filePath => 
      cloudinary.uploader.upload(filePath, {
        folder: 'social-chat-app',
        resource_type: 'auto',
        ...options,
      })
    );

    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Cloudinary multiple upload error:', error);
    throw error;
  }
};

/**
 * Delete file from Cloudinary
 * @param publicId Public ID of the file to delete
 * @returns Cloudinary response
 */
export const deleteFromCloudinary = async (publicId: string) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

/**
 * Check if Cloudinary is properly configured
 */
export const isCloudinaryConfigured = (): boolean => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

export default cloudinary;
