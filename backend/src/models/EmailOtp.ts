import mongoose, { Document, Schema } from 'mongoose';

export interface IEmailOtp extends Document {
  email: string;
  otpHash: string;
  otpSalt: string;
  expiresAt: Date;
  attemptCount: number;
  maxAttempts: number;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const emailOtpSchema = new Schema<IEmailOtp>(
  {
    email: { type: String, required: true, index: true, lowercase: true, trim: true },
    otpHash: { type: String, required: true },
    otpSalt: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true, expires: 0 },
    attemptCount: { type: Number, required: true, default: 0 },
    maxAttempts: { type: Number, required: true, default: 5 },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

emailOtpSchema.index({ email: 1, createdAt: -1 });

const EmailOtp = mongoose.model<IEmailOtp>('EmailOtp', emailOtpSchema);

export default EmailOtp;
