import request from 'supertest';
import express from 'express';

const app = express();
app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));

describe('Health Check', () => {
  it('should return 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('OK');
  });
});
