import request from 'supertest';

jest.mock('../middleware/auth', () => ({
  verifyFirebaseToken: (_req: any, res: any, next: any) => {
    res.locals.firebaseUser = { uid: 'uid1', email: 'a@b.com' };
    next();
  },
}));

const UserMock: any = {
  findOne: jest.fn(),
  deleteOne: jest.fn(),
};
const MessageMock: any = {
  deleteMany: jest.fn(),
};
const PrivateMessageMock: any = {
  deleteMany: jest.fn(),
};

jest.mock('../models/User', () => ({ __esModule: true, default: UserMock }));
jest.mock('../models/Message', () => ({ __esModule: true, default: MessageMock }));
jest.mock('../models/PrivateMessage', () => ({ __esModule: true, default: PrivateMessageMock }));

import { createApp } from '../app';

describe('user routes', () => {
  const app = createApp();

  beforeEach(() => {
    UserMock.findOne.mockReset();
    UserMock.deleteOne.mockReset();
    MessageMock.deleteMany.mockReset();
    PrivateMessageMock.deleteMany.mockReset();
  });

  it('PUT /api/user/me updates profile', async () => {
    const user = {
      _id: 'u1',
      email: 'a@b.com',
      displayName: 'A',
      photoURL: '',
      phoneNumber: '',
      save: jest.fn().mockResolvedValueOnce(undefined),
    };
    UserMock.findOne.mockResolvedValueOnce(user);

    const res = await request(app).put('/api/user/me').send({ displayName: 'New Name' });
    expect(res.status).toBe(200);
    expect(user.save).toHaveBeenCalled();
  });

  it('DELETE /api/user/me deletes account', async () => {
    const user = {
      _id: 'u1',
      email: 'a@b.com',
      displayName: 'A',
      isDeleted: false,
      deletedAt: null,
      save: jest.fn().mockResolvedValueOnce(undefined),
    };
    UserMock.findOne.mockResolvedValueOnce(user);
    MessageMock.deleteMany.mockResolvedValueOnce({});
    PrivateMessageMock.deleteMany.mockResolvedValueOnce({});
    UserMock.deleteOne.mockResolvedValueOnce({});

    const res = await request(app).delete('/api/user/me').send({});
    expect(res.status).toBe(200);
  });
});

