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

const PostMock: any = {
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
  updateOne: jest.fn(),
};

jest.mock('../models/User', () => ({ __esModule: true, default: UserMock }));
jest.mock('../models/Post', () => ({ __esModule: true, default: PostMock }));

import { createApp } from '../app';

describe('post routes', () => {
  const app = createApp();

  beforeEach(() => {
    UserMock.findOne.mockReset();
    PostMock.create.mockReset();
    PostMock.find.mockReset();
    PostMock.countDocuments.mockReset();
    PostMock.findById.mockReset();
    PostMock.updateOne.mockReset();
  });

  it('POST /api/posts validates payload', async () => {
    UserMock.findOne.mockResolvedValueOnce({ _id: 'u1' });
    const res = await request(app).post('/api/posts').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/posts creates post', async () => {
    UserMock.findOne.mockResolvedValueOnce({ _id: 'u1' });
    const post: any = { _id: 'p1', populate: jest.fn().mockResolvedValueOnce(undefined) };
    PostMock.create.mockResolvedValueOnce(post);
    const res = await request(app)
      .post('/api/posts')
      .send({ content: 'hi' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('success', true);
  });

  it('GET /api/posts/feed returns mapped like fields', async () => {
    UserMock.findOne.mockResolvedValueOnce({ _id: 'u1' });
    const postObj = {
      toObject: () => ({ _id: 'p1', likes: ['u1', 'u2'] }),
      likes: ['u1', 'u2'],
    };
    PostMock.find.mockReturnValueOnce({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            populate: jest.fn().mockResolvedValueOnce([postObj]),
          }),
        }),
      }),
    });
    PostMock.countDocuments.mockResolvedValueOnce(1);

    const res = await request(app).get('/api/posts/feed');
    expect(res.status).toBe(200);
    expect(res.body.posts[0]).toHaveProperty('likeCount', 2);
    expect(res.body.posts[0]).toHaveProperty('likedByMe', true);
  });

  it('GET /api/posts/me returns user posts', async () => {
    UserMock.findOne.mockResolvedValueOnce({ _id: 'u1' });
    const postObj = {
      toObject: () => ({ _id: 'p1', likes: ['u1'] }),
      likes: ['u1'],
    };
    PostMock.find.mockReturnValueOnce({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            populate: jest.fn().mockResolvedValueOnce([postObj]),
          }),
        }),
      }),
    });
    PostMock.countDocuments.mockResolvedValueOnce(1);

    const res = await request(app).get('/api/posts/me');
    expect(res.status).toBe(200);
    expect(res.body.posts[0]).toHaveProperty('likedByMe', true);
  });

  it('POST /api/posts/:postId/like toggles like', async () => {
    UserMock.findOne.mockResolvedValueOnce({ _id: 'u1' });
    const updatedDoc = { toObject: () => ({ _id: 'p1', likes: ['u1'] }), likes: ['u1'] };
    PostMock.findById
      .mockImplementationOnce(async () => ({ _id: 'p1', likes: [] }))
      .mockImplementationOnce(() => ({ populate: jest.fn().mockResolvedValueOnce(updatedDoc) }));
    PostMock.updateOne.mockResolvedValueOnce({});

    const res = await request(app).post('/api/posts/p1/like').send({});
    expect(res.status).toBe(200);
    expect(res.body.post).toHaveProperty('likedByMe', true);
  });
});
