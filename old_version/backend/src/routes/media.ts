import { Router, Request, Response } from 'express';
import multer from 'multer';
import { uploadBufferToCloudinary, isCloudinaryConfigured } from '../services/cloudinary';
import { logger } from '../utils/logger';

const router = Router();

// Set up multer for file uploads (Memory Storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and common document types
    if (file.mimetype.startsWith('image/') || 
        file.mimetype.startsWith('video/') ||
        file.mimetype === 'application/pdf' ||
        file.mimetype.includes('document') ||
        file.mimetype.includes('text')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, PDFs, and documents are allowed.'));
    }
  },
});

/**
 * POST /api/media/upload
 * Upload media file to Cloudinary
 * Requires: multipart/form-data with 'file' field
 * Returns: { success: boolean, url: string, publicId: string, metadata: object }
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    // Check if Cloudinary is configured
    if (!isCloudinaryConfigured()) {
      res.status(503).json({ 
        success: false,
        error: 'Cloudinary not configured. Missing API credentials in environment.'
      });
      return;
    }

    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({ 
        success: false,
        error: 'No file uploaded. Make sure to send file in "file" field.' 
      });
      return;
    }

    // Upload to Cloudinary using buffer
    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'chatbull/media', // Organize under media subfolder
      resource_type: 'auto', // Auto-detect image/video/raw
    });

    res.status(200).json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes,
      resourceType: result.resource_type,
      metadata: {
        width: result.width,
        height: result.height,
        duration: result.duration,
      }
    });
  } catch (error: any) {
    logger.error('Media upload error', { message: error?.message || String(error) });
    
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to upload file to Cloudinary' 
    });
  }
});

/**
 * POST /api/media/upload-multiple
 * Upload multiple media files to Cloudinary
 * Requires: multipart/form-data with 'files' field (array)
 */
router.post('/upload-multiple', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    // Check if Cloudinary is configured
    if (!isCloudinaryConfigured()) {
      res.status(503).json({ 
        success: false,
        error: 'Cloudinary not configured. Missing API credentials in environment.'
      });
      return;
    }

    // Check if files were uploaded
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      res.status(400).json({ 
        success: false,
        error: 'No files uploaded. Make sure to send files in "files" field.' 
      });
      return;
    }

    const files = req.files as Express.Multer.File[];
    
    // Upload all files to Cloudinary using buffers
    const uploadPromises = files.map(file => 
      uploadBufferToCloudinary(file.buffer, {
        folder: 'chatbull/media',
        resource_type: 'auto',
      })
    );

    const results = await Promise.all(uploadPromises);

    const urls = results.map(result => ({
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes,
      resourceType: result.resource_type,
    }));

    res.status(200).json({
      success: true,
      count: urls.length,
      files: urls,
    });
  } catch (error: any) {
    logger.error('Multiple media upload error', { message: error?.message || String(error) });
    
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to upload files to Cloudinary' 
    });
  }
});

/**
 * GET /api/media/status
 * Check if media upload service is configured
 */
router.get('/status', (req: Request, res: Response) => {
  const configured = isCloudinaryConfigured();
  res.status(200).json({
    configured,
    provider: configured ? 'Cloudinary' : 'Not configured',
    message: configured 
      ? 'Cloudinary is properly configured for media uploads'
      : 'Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env'
  });
});

export default router;
