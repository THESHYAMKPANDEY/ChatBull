import request from 'supertest';
import crypto from 'crypto';

const EmailOtpMock: any = {
  create: jest.fn(),
  findOne: jest.fn(),
};

jest.mock('../models/EmailOtp', () => ({ __esModule: true, default: EmailOtpMock }));

const sendOtpEmail = jest.fn();
jest.mock('../services/mailer', () => ({
  sendOtpEmail: (...args: any[]) => sendOtpEmail(...args),
  isMailerConfigured: () => true,
}));

jest.mock('../services/notifications', () => ({
  isFirebaseAdminReady: jest.fn(() => true),
}));

const getUserByEmail = jest.fn();
const createUser = jest.fn();
const createCustomToken = jest.fn(async () => 'custom-token');

jest.mock('firebase-admin', () => ({
  __esModule: true,
  default: {
    auth: () => ({
      getUserByEmail,
      createUser,
      createCustomToken,
    }),
  },
}));

import { createApp } from '../app';

describe('email otp routes', () => {
  const app = createApp();

  beforeEach(() => {
    EmailOtpMock.create.mockReset();
    EmailOtpMock.findOne.mockReset();
    sendOtpEmail.mockReset();
    getUserByEmail.mockReset();
    createUser.mockReset();
  });

  it('POST /api/auth/email-otp/send validates email', async () => {
    const res = await request(app).post('/api/auth/email-otp/send').send({ email: 'bad' });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/email-otp/send returns success', async () => {
    EmailOtpMock.findOne.mockReturnValueOnce({ sort: () => Promise.resolve(null) });
    EmailOtpMock.create.mockResolvedValueOnce({});
    sendOtpEmail.mockResolvedValueOnce(undefined);

    const res = await request(app).post('/api/auth/email-otp/send').send({ email: 'a@b.com' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  it('POST /api/auth/email-otp/verify rejects invalid payload', async () => {
    const res = await request(app).post('/api/auth/email-otp/verify').send({ email: 'a@b.com', otp: '12' });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/email-otp/verify returns custom token on success', async () => {
    const email = 'a@b.com';
    const otp = '123456';
    const otpSalt = crypto.randomBytes(16).toString('hex');
    const otpHash = crypto.createHash('sha256').update(`${otpSalt}:${otp}`).digest('hex');

    const record: any = {
      otpSalt,
      otpHash,
      email,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      attemptCount: 0,
      maxAttempts: 5,
      save: jest.fn().mockResolvedValueOnce(undefined),
    };

    EmailOtpMock.findOne.mockReturnValueOnce({ sort: () => Promise.resolve(record) });

    getUserByEmail.mockRejectedValueOnce({ code: 'auth/user-not-found' });
    createUser.mockResolvedValueOnce({ uid: 'uid1' });

    const res = await request(app).post('/api/auth/email-otp/verify').send({ email, otp });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('customToken', 'custom-token');
  });
});
