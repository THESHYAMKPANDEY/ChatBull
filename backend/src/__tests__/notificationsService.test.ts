describe('notifications service', () => {
  it('initializeFirebaseAdmin returns false when env missing', async () => {
    jest.resetModules();
    jest.doMock('firebase-admin', () => ({
      __esModule: true,
      default: {
        apps: [],
        credential: { cert: jest.fn() },
        initializeApp: jest.fn(),
        messaging: jest.fn(),
      },
    }));

    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const mod = await import('../services/notifications');
    expect(mod.initializeFirebaseAdmin()).toBe(false);
    expect(mod.isFirebaseAdminReady()).toBe(false);
  });

  it('initializeFirebaseAdmin sets ready when env provided', async () => {
    jest.resetModules();
    const initializeApp = jest.fn();
    const cert = jest.fn();

    jest.doMock('firebase-admin', () => ({
      __esModule: true,
      default: {
        apps: [],
        credential: { cert },
        initializeApp,
        messaging: jest.fn(),
      },
    }));

    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      project_id: 'p',
      client_email: 'x@y.com',
      private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
    });

    const mod = await import('../services/notifications');
    expect(mod.initializeFirebaseAdmin()).toBe(true);
    expect(mod.isFirebaseAdminReady()).toBe(true);
    expect(initializeApp).toHaveBeenCalled();
  });

  it('sendPushNotification fails when not initialized', async () => {
    jest.resetModules();
    jest.doMock('firebase-admin', () => ({
      __esModule: true,
      default: {
        apps: [],
        credential: { cert: jest.fn() },
        initializeApp: jest.fn(),
        messaging: jest.fn(),
      },
    }));
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const mod = await import('../services/notifications');
    const res = await mod.sendPushNotification('t', 'a', 'b');
    expect(res.success).toBe(false);
  });
});

