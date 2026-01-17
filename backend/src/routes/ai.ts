import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { verifyFirebaseToken } from '../middleware/auth';
import { validate } from '../middleware/validation';

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

router.post('/chat', verifyFirebaseToken, chatValidationRules, validate, async (req: Request, res: Response) => {
  try {
    const { message } = req.body as { message: string };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(200).json({ success: true, reply: localReply(message) });
      return;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are JANEAI, a helpful assistant for a social chat app. Keep responses short and practical.',
          },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
      }),
    });

    const data = (await response.json()) as any;
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!response.ok || !reply) {
      res.status(200).json({ success: true, reply: localReply(message) });
      return;
    }

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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ success: false, error: 'Speech recognition not configured on server.' });
      return;
    }

    const fileBuffer = await fs.promises.readFile(req.file.path);
    const form = new FormData();
    const mimeType = req.file.mimetype || 'audio/mp4';
    form.append('file', new Blob([fileBuffer], { type: mimeType }), req.file.originalname || 'audio.m4a');
    form.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });

    const data = (await response.json()) as any;
    if (!response.ok) {
      res.status(500).json({ success: false, error: data?.error?.message || 'Transcription failed' });
      return;
    }

    res.status(200).json({ success: true, text: data?.text || '' });
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
