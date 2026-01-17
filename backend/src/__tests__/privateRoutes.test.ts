import request from 'supertest';

jest.mock('../middleware/auth', () => ({
  verifyFirebaseToken: (_req: any, res: any, next: any) => {
    res.locals.firebaseUser = { uid: 'uid1', email: 'a@b.com' };
    next();
  },
}));

jest.mock('uuid', () => ({
  v4: () => 'session-1',
}));

const UserMock: any = { findOne: jest.fn() };
const SessionMock: any = { create: jest.fn(), findOne: jest.fn(), deleteOne: jest.fn() };
const PrivateMessageMock: any = { deleteMany: jest.fn() };

jest.mock('../models/User', () => ({ __esModule: true, default: UserMock }));
jest.mock('../models/EphemeralSession', () => ({ __esModule: true, default: SessionMock }));
jest.mock('../models/PrivateMessage', () => ({ __esModule: true, default: PrivateMessageMock }));

import { createApp } from '../app';

describe('private routes', () => {
  const app = createApp();

  beforeEach(() => {
    UserMock.findOne.mockReset();
    SessionMock.create.mockReset();
    SessionMock.findOne.mockReset();
    SessionMock.deleteOne.mockReset();
    PrivateMessageMock.deleteMany.mockReset();
  });

  it('POST /api/private/start returns 404 if user missing', async () => {
    UserMock.findOne.mockResolvedValueOnce(null);
    const res = await request(app).post('/api/private/start').send({});
    expect(res.status).toBe(404);
  });

  it('POST /api/private/start creates session', async () => {
    UserMock.findOne.mockResolvedValueOnce({ _id: 'u1' });
    SessionMock.create.mockResolvedValueOnce({
      sessionId: 'session-1',
      ephemeralUserId: 'abc',
      expiresAt: new Date(),
    });
    const res = await request(app).post('/api/private/start').send({});
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('sessionId', 'session-1');
  });

  it('POST /api/private/end validates sessionId', async () => {
    UserMock.findOne.mockResolvedValueOnce({ _id: 'u1' });
    const res = await request(app).post('/api/private/end').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/private/end returns 404 if session missing', async () => {
    UserMock.findOne.mockResolvedValueOnce({ _id: 'u1' });
    SessionMock.findOne.mockResolvedValueOnce(null);
    const res = await request(app).post('/api/private/end').send({ sessionId: 'session-1' });
    expect(res.status).toBe(404);
  });

  it('POST /api/private/end wipes messages and ends session', async () => {
    UserMock.findOne.mockResolvedValueOnce({ _id: 'u1' });
    SessionMock.findOne.mockResolvedValueOnce({ _id: 's1' });
    SessionMock.deleteOne.mockResolvedValueOnce({});
    PrivateMessageMock.deleteMany.mockResolvedValueOnce({ deletedCount: 2 });

    const res = await request(app).post('/api/private/end').send({ sessionId: 'session-1' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('wipedMessagesCount', 2);
  });
});

