import request from 'supertest';

jest.mock('../middleware/auth', () => ({
  verifyFirebaseToken: (_req: any, res: any, next: any) => {
    res.locals.firebaseUser = { uid: 'uid1', email: 'a@b.com' };
    next();
  },
}));

const cloudinaryMock: any = {
  isCloudinaryConfigured: jest.fn(() => true),
  uploadToCloudinary: jest.fn(async () => ({
    secure_url: 'https://example.com/x',
    public_id: 'pid',
    format: 'txt',
    bytes: 1,
    resource_type: 'raw',
    width: undefined,
    height: undefined,
    duration: undefined,
  })),
};

jest.mock('../services/cloudinary', () => cloudinaryMock);

import { createApp } from '../app';

describe('media routes', () => {
  const app = createApp();

  beforeEach(() => {
    cloudinaryMock.isCloudinaryConfigured.mockReset();
    cloudinaryMock.uploadToCloudinary.mockClear();
  });

  it('GET /api/media/status returns configured status', async () => {
    cloudinaryMock.isCloudinaryConfigured.mockReturnValueOnce(false);
    const res = await request(app).get('/api/media/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('configured', false);
  });

  it('POST /api/media/upload returns 400 when no file', async () => {
    cloudinaryMock.isCloudinaryConfigured.mockReturnValueOnce(true);
    const res = await request(app).post('/api/media/upload');
    expect(res.status).toBe(400);
  });

  it('POST /api/media/upload uploads and returns url', async () => {
    cloudinaryMock.isCloudinaryConfigured.mockReturnValueOnce(true);
    const res = await request(app)
      .post('/api/media/upload')
      .attach('file', Buffer.from('hello'), { filename: 'x.txt', contentType: 'text/plain' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('url', 'https://example.com/x');
  });
});

