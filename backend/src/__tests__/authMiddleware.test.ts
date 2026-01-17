import { verifyFirebaseToken } from '../middleware/auth';

jest.mock('../services/notifications', () => ({
  isFirebaseAdminReady: jest.fn(() => true),
}));

const verifyIdToken = jest.fn();

jest.mock('firebase-admin', () => ({
  __esModule: true,
  default: {
    auth: () => ({
      verifyIdToken,
    }),
  },
}));

const makeRes = () => {
  const res: any = {};
  res.locals = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('verifyFirebaseToken', () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
  });

  it('returns 401 when Authorization is missing', async () => {
    const req: any = { headers: {}, body: {}, url: '/x' };
    const res = makeRes();
    const next = jest.fn();

    await verifyFirebaseToken(req, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization is not Bearer', async () => {
    const req: any = { headers: { authorization: 'Token abc' }, body: {}, url: '/x' };
    const res = makeRes();
    const next = jest.fn();

    await verifyFirebaseToken(req, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token verification fails', async () => {
    verifyIdToken.mockRejectedValueOnce(new Error('bad token'));
    const req: any = { headers: { authorization: 'Bearer bad' }, body: {}, url: '/x' };
    const res = makeRes();
    const next = jest.fn();

    await verifyFirebaseToken(req, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches firebaseUser and calls next on success', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'uid1', email: 'a@b.com' });
    const req: any = { headers: { authorization: 'Bearer good' }, body: {}, url: '/x' };
    const res = makeRes();
    const next = jest.fn();

    await verifyFirebaseToken(req, res as any, next);
    expect(res.locals.firebaseUser).toEqual({ uid: 'uid1', email: 'a@b.com' });
    expect(next).toHaveBeenCalled();
  });
});

