const uploader = {
  upload: jest.fn(async () => ({ secure_url: 'https://x', public_id: 'p' })),
  destroy: jest.fn(async () => ({ result: 'ok' })),
};

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader,
  },
}));

describe('cloudinary service', () => {
  beforeEach(() => {
    uploader.upload.mockClear();
    uploader.destroy.mockClear();
  });

  it('isCloudinaryConfigured returns false when env missing', async () => {
    jest.resetModules();
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    const mod = await import('../services/cloudinary');
    expect(mod.isCloudinaryConfigured()).toBe(false);
  });

  it('uploadToCloudinary passes merged options', async () => {
    jest.resetModules();
    const mod = await import('../services/cloudinary');
    await mod.uploadToCloudinary('file', { folder: 'custom' } as any);
    expect(uploader.upload).toHaveBeenCalledWith('file', expect.objectContaining({ folder: 'custom', resource_type: 'auto' }));
  });

  it('deleteFromCloudinary calls destroy', async () => {
    jest.resetModules();
    const mod = await import('../services/cloudinary');
    await mod.deleteFromCloudinary('pid');
    expect(uploader.destroy).toHaveBeenCalledWith('pid');
  });
});

