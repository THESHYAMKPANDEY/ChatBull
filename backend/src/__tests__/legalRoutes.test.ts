import request from 'supertest';

jest.mock('../middleware/auth', () => ({
  verifyFirebaseToken: (_req: any, res: any, next: any) => {
    res.locals.firebaseUser = { uid: 'uid1', email: 'a@b.com' };
    next();
  },
}));

const UserMock: any = { findOne: jest.fn(), deleteOne: jest.fn() };
const MessageMock: any = { deleteMany: jest.fn() };
const PrivateMessageMock: any = { deleteMany: jest.fn() };

jest.mock('../models/User', () => ({ __esModule: true, default: UserMock }));
jest.mock('../models/Message', () => ({ __esModule: true, default: MessageMock }));
jest.mock('../models/PrivateMessage', () => ({ __esModule: true, default: PrivateMessageMock }));

import { createApp } from '../app';

describe('legal routes', () => {
  const app = createApp();

  it('GET /api/legal/privacy returns policy', async () => {
    const res = await request(app).get('/api/legal/privacy');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('title', 'Privacy Policy');
  });
});

