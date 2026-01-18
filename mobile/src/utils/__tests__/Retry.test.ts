import { withRetry, RetryError } from '../Retry';

describe('withRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return result immediately if operation succeeds', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    const result = await withRetry(operation);
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const promise = withRetry(operation, { initialDelayMs: 100 });
    
    // Fast-forward timers for the retries
    await jest.advanceTimersByTimeAsync(100); // 1st retry delay
    await jest.advanceTimersByTimeAsync(200); // 2nd retry delay (backoff)

    const result = await promise;
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should throw RetryError after max attempts reached', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('persistent fail'));
    
    const promise = withRetry(operation, { 
      maxAttempts: 3,
      initialDelayMs: 10
    });

    // Advance enough time for all retries
    await jest.advanceTimersByTimeAsync(1000);

    await expect(promise).rejects.toThrow(RetryError);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should stop retrying if shouldRetry returns false', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('fatal error'));
    const shouldRetry = jest.fn().mockReturnValue(false);

    await expect(withRetry(operation, { shouldRetry }))
      .rejects.toThrow('fatal error');
    
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should respect maxDelayMs', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('fail'));
    const onRetry = jest.fn();

    const promise = withRetry(operation, {
      maxAttempts: 5,
      initialDelayMs: 100,
      backoffFactor: 10, // 100 -> 1000 -> 10000 -> ...
      maxDelayMs: 500, // Cap at 500
      onRetry
    });

    await jest.advanceTimersByTimeAsync(5000);
    try { await promise; } catch (e) {}

    // Check the delay passed to onRetry callback
    // Attempt 1: fails, waits 100. onRetry called with 100.
    // Attempt 2: fails, waits min(1000, 500) = 500.
    // Attempt 3: fails, waits min(5000, 500) = 500.
    
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error), 100);
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error), 500);
    expect(onRetry).toHaveBeenNthCalledWith(3, 3, expect.any(Error), 500);
  });
});
