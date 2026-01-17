import request from 'supertest';

jest.mock('../middleware/auth', () => ({
  verifyFirebaseToken: (_req: any, res: any, next: any) => {
    res.locals.firebaseUser = { uid: 'uid1', email: 'a@b.com' };
    next();
  },
}));

import { createApp } from '../app';

describe('security routes', () => {
  const app = createApp();

  it('GET /api/security/status returns enabled', async () => {
    const res = await request(app).get('/api/security/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('enabled', true);
  });

  it('POST /api/security/screenshot-detected accepts event', async () => {
    const res = await request(app)
      .post('/api/security/screenshot-detected')
      .send({ timestamp: new Date().toISOString(), location: 'test' });
    expect(res.status).toBe(200);
  });
});

