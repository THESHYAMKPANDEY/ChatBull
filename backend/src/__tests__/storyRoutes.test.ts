import request from 'supertest';

jest.mock('../middleware/auth', () => ({
  verifyFirebaseToken: (_req: any, res: any, next: any) => {
    res.locals.firebaseUser = { uid: 'uid1', email: 'a@b.com' };
    next();
  },
}));

const UserMock: any = {
  findOne: jest.fn(),
};

const StoryMock: any = {
  create: jest.fn(),
  find: jest.fn(),
};

jest.mock('../models/User', () => ({ __esModule: true, default: UserMock }));
jest.mock('../models/Story', () => ({ __esModule: true, default: StoryMock }));

import { createApp } from '../app';

describe('story routes', () => {
  const app = createApp();

  beforeEach(() => {
    UserMock.findOne.mockReset();
    StoryMock.create.mockReset();
    StoryMock.find.mockReset();
  });

  it('POST /api/stories validates payload', async () => {
    UserMock.findOne.mockResolvedValueOnce({ _id: 'u1' });
    const res = await request(app).post('/api/stories').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/stories creates story', async () => {
    UserMock.findOne.mockResolvedValueOnce({ _id: 'u1' });
    const story: any = { _id: 's1', populate: jest.fn().mockResolvedValueOnce(undefined) };
    StoryMock.create.mockResolvedValueOnce(story);

    const res = await request(app)
      .post('/api/stories')
      .send({ mediaUrl: 'https://example.com/a.jpg', mediaType: 'image' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('success', true);
  });

  it('GET /api/stories returns stories', async () => {
    UserMock.findOne.mockResolvedValueOnce({ _id: 'u1' });

    const storyObj = { _id: 's1' };
    StoryMock.find.mockReturnValueOnce({
      sort: () => ({
        limit: () => ({
          populate: jest.fn().mockResolvedValueOnce([storyObj]),
        }),
      }),
    });

    const res = await request(app).get('/api/stories');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.stories)).toBe(true);
  });
});

