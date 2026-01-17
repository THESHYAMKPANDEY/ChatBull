import request from 'supertest';

jest.mock('../middleware/auth', () => ({
  verifyFirebaseToken: (_req: any, res: any, next: any) => {
    res.locals.firebaseUser = { uid: 'uid1', email: 'a@b.com' };
    next();
  },
}));

import { createApp } from '../app';

describe('ai routes', () => {
  const app = createApp();

  it('POST /api/ai/chat returns local reply when OPENAI_API_KEY missing', async () => {
    const old = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const res = await request(app).post('/api/ai/chat').send({ message: 'hello' });
    process.env.OPENAI_API_KEY = old;
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(typeof res.body.reply).toBe('string');
  });

  it('POST /api/ai/chat rejects empty message', async () => {
    const res = await request(app).post('/api/ai/chat').send({ message: '' });
    expect(res.status).toBe(400);
  });
});

