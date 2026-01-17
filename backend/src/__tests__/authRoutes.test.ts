import request from 'supertest';

jest.mock('../middleware/auth', () => ({
  verifyFirebaseToken: (req: any, res: any, next: any) => {
    res.locals.firebaseUser = { uid: 'uid1', email: 'a@b.com', name: 'Alice' };
    next();
  },
}));

const UserMock: any = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
};

jest.mock('../models/User', () => ({
  __esModule: true,
  default: UserMock,
}));

import { createApp } from '../app';

describe('auth routes', () => {
  const app = createApp();

  beforeEach(() => {
    UserMock.findOne.mockReset();
    UserMock.find.mockReset();
    UserMock.create.mockReset();
    UserMock.findOneAndUpdate.mockReset();
  });

  it('POST /api/auth/sync creates user when missing', async () => {
    UserMock.findOne.mockResolvedValueOnce(null);
    UserMock.create.mockResolvedValueOnce({
      _id: 'u1',
      firebaseUid: 'uid1',
      email: 'a@b.com',
      displayName: 'Alice',
      photoURL: '',
      isOnline: true,
    });

    const res = await request(app).post('/api/auth/sync').send({ displayName: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body?.user?.firebaseUid).toBe('uid1');
  });

  it('GET /api/auth/profile/:firebaseUid forbids other users', async () => {
    const res = await request(app).get('/api/auth/profile/uid2');
    expect(res.status).toBe(403);
  });

  it('GET /api/auth/profile/:firebaseUid returns 404 when user missing', async () => {
    UserMock.findOne.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/auth/profile/uid1');
    expect(res.status).toBe(404);
  });

  it('POST /api/auth/logout returns success', async () => {
    UserMock.findOneAndUpdate.mockResolvedValueOnce({});
    const res = await request(app).post('/api/auth/logout').send({});
    expect(res.status).toBe(200);
  });
});

