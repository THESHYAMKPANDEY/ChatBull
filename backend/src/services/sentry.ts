import * as Sentry from '@sentry/node';

export const initSentry = () => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  const tracesSampleRateRaw = process.env.SENTRY_TRACES_SAMPLE_RATE;
  const tracesSampleRate = tracesSampleRateRaw ? Number(tracesSampleRateRaw) : 0;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
  });
};

export default Sentry;

