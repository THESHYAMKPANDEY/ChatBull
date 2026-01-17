import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { uploadToCloudinary, isCloudinaryConfigured } from '../services/cloudinary';
import fs from 'fs';
import { verifyFirebaseToken } from '../middleware/auth';

const router = Router();

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create temp uploads directory
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage: storage,
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
router.post('/upload', verifyFirebaseToken, upload.single('file'), async (req: Request, res: Response) => {
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

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.path, {
      folder: 'social-chat-app/media', // Organize under media subfolder
      resource_type: 'auto', // Auto-detect image/video/raw
    });

    // Clean up temp file (optional - we could do this later)
    await fs.promises.unlink(req.file.path);

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
    console.error('Media upload error:', error);
    
    // Clean up temp file if exists
    if (req.file) {
      await fs.promises.unlink(req.file.path).catch(() => undefined);
    }

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
router.post('/upload-multiple', verifyFirebaseToken, upload.array('files', 10), async (req: Request, res: Response) => {
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
    
    // Upload all files to Cloudinary
    const uploadPromises = files.map(file => 
      uploadToCloudinary(file.path, {
        folder: 'social-chat-app/media',
        resource_type: 'auto',
      })
    );

    const results = await Promise.all(uploadPromises);

    // Clean up temp files
    await Promise.all(files.map((file) => fs.promises.unlink(file.path).catch(() => undefined)));

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
    console.error('Multiple media upload error:', error);
    
    // Clean up temp files if any exist
    if (req.files) {
      await Promise.all(
        (req.files as Express.Multer.File[]).map((file) => fs.promises.unlink(file.path).catch(() => undefined))
      );
    }

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
