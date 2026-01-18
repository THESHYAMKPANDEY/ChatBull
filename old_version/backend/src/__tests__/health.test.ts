import request from 'supertest';
import { createApp } from '../app';

describe('health endpoints', () => {
  const app = createApp();

  it('GET /health returns OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'OK');
  });

  it('GET /api/health returns OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'OK');
    expect(res.body).toHaveProperty('service');
  });

  it('GET /health is not rate limited', async () => {
    for (let i = 0; i < 130; i++) {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    }
  });
});
