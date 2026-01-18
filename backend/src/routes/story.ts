import express from 'express';
import { Request, Response } from 'express';

const router = express.Router();

// Get all stories
router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Get all stories' });
});

// Feed endpoint (Mobile app expects this)
router.get('/feed', (req: Request, res: Response) => {
  res.json({ stories: [] }); // Return empty list for now
});

// Create a story
router.post('/', (req: Request, res: Response) => {
  res.json({ message: 'Create a story' });
});

export default router;
