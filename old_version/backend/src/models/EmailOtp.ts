import mongoose, { Document, Schema } from 'mongoose';

export interface IEmailOtp extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  createdAt: Date;
}

const emailOtpSchema = new Schema<IEmailOtp>(
  {
    email: {
      type: String,
      required: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  }
);

const EmailOtp = mongoose.model<IEmailOtp>('EmailOtp', emailOtpSchema);

export default EmailOtp;
