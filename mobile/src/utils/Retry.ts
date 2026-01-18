export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds before the first retry (default: 1000) */
  initialDelayMs?: number;
  /** Multiplier for the delay after each failure (default: 2) */
  backoffFactor?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelayMs?: number;
  /** Function to determine if the error is retriable */
  shouldRetry?: (error: any) => boolean;
  /** Callback executed before each retry attempt */
  onRetry?: (attempt: number, error: any, nextDelay: number) => void;
}

export class RetryError extends Error {
  constructor(
    public readonly originalError: any,
    public readonly attempts: number
  ) {
    super(`Operation failed after ${attempts} attempts. Last error: ${originalError?.message || String(originalError)}`);
    this.name = 'RetryError';
  }
}

/**
 * Executes an async operation with exponential backoff retry logic.
 * 
 * @param operation The async function to execute
 * @param options Configuration options for the retry mechanism
 * @returns The result of the operation
 * @throws RetryError if all attempts fail
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    backoffFactor = 2,
    maxDelayMs = 30000,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let attempt = 1;
  let currentDelay = initialDelayMs;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      // Check if we should stop retrying
      if (attempt >= maxAttempts) {
        throw new RetryError(error, attempt);
      }

      if (!shouldRetry(error)) {
        throw error; // Rethrow immediately if not retriable
      }

      // Notify about retry
      if (onRetry) {
        onRetry(attempt, error, currentDelay);
      }

      // Wait for backoff duration
      await new Promise(resolve => setTimeout(resolve, currentDelay));

      // Update state for next attempt
      attempt++;
      currentDelay = Math.min(currentDelay * backoffFactor, maxDelayMs);
    }
  }
}
