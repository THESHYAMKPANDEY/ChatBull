import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { verifyFirebaseToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import User from '../models/User';
import AIMessage from '../models/AIMessage';
import { generateChatbullReply } from '../services/chatbot';

const router = Router();

const aiUploadsDir = path.join(process.cwd(), 'uploads', 'ai');
if (!fs.existsSync(aiUploadsDir)) {
  fs.mkdirSync(aiUploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, aiUploadsDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `audio-${uniqueSuffix}${path.extname(file.originalname) || '.m4a'}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const chatValidationRules = [
  body('message')
    .isString()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('message must be 1-2000 characters'),
];

const localReply = (message: string): string => {
  const text = message.trim().toLowerCase();

  if (text.includes('hello') || text.includes('hi')) return 'Hey! How can I help you today?';
  if (text.includes('private') && text.includes('mode')) return 'Private mode creates an ephemeral session and wipes messages later.';
  if (text.includes('post') && (text.includes('image') || text.includes('video'))) {
    return 'To post media, attach a photo/video, then tap Post. You can share posts from the ↗ button.';
  }
  if (text.includes('theme') || text.includes('dark')) return 'You can toggle theme in Settings → Theme.';

  return 'I can help with features, bugs, and how-to. Ask me anything about ChatBull.';
};

router.get('/history', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser as { uid: string };
    const user = await User.findOne({ firebaseUid: firebaseUser.uid });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const messages = await AIMessage.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(50); // Last 50 messages

    // Transform for frontend
    const history = messages.map(m => ({
      id: m._id,
      role: m.role === 'assistant' ? 'ai' : m.role, // Map 'assistant' -> 'ai' for frontend
      content: m.content,
      createdAt: m.createdAt
    }));

    res.status(200).json(history);
  } catch (error) {
    console.error('Get AI history error:', error);
    res.status(500).json({ success: false, error: 'Failed to load history' });
  }
});

router.post('/chat', verifyFirebaseToken, chatValidationRules, validate, async (req: Request, res: Response) => {
  try {
    const { message } = req.body as { message: string };
    const firebaseUser = (res.locals as any).firebaseUser as { uid: string };
    const user = await User.findOne({ firebaseUid: firebaseUser.uid });
    
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    await AIMessage.create({
      userId: user._id,
      role: 'user',
      content: message
    });

    const recentMessages = await AIMessage.find({ userId: user._id })
      .sort({ createdAt: 1 })
      .limit(20);

    const contextMessages = recentMessages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    const { reply } = generateChatbullReply({ message, history: contextMessages });

    await AIMessage.create({
      userId: user._id,
      role: 'assistant',
      content: reply
    });

    res.status(200).json({ success: true, reply });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(200).json({ success: true, reply: 'I had trouble responding. Try again.' });
  }
});

router.post('/transcribe', verifyFirebaseToken, upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No audio uploaded. Use multipart field "audio".' });
      return;
    }

    res.status(503).json({ success: false, error: 'Speech recognition is disabled in local chatbot mode.' });
  } catch (error: any) {
    console.error('AI transcribe error:', error);
    res.status(500).json({ success: false, error: error.message || 'Transcription failed' });
  } finally {
    if (req.file?.path) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch {}
    }
  }
});

export default router;
