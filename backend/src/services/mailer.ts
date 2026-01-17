import nodemailer from 'nodemailer';

export const isMailerConfigured = (): boolean => {
  return !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
};

export const sendOtpEmail = async (toEmail: string, otp: string): Promise<void> => {
  if (!isMailerConfigured()) {
    throw new Error('Email service not configured');
  }

  const host = process.env.SMTP_HOST as string;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER as string;
  const pass = process.env.SMTP_PASS as string;
  const from = process.env.SMTP_FROM || user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const appName = process.env.APP_NAME || 'ChatBull';
  const ttlMinutes = Number(process.env.EMAIL_OTP_TTL_MINUTES || '10');

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: `${appName} verification code`,
    text: `Your ${appName} verification code is ${otp}. It expires in ${ttlMinutes} minutes.`,
  });
};

