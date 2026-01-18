import mongoose, { Document, Schema } from 'mongoose';

export interface ISecurityEvent extends Document {
  type: 'screenshot_detected';
  firebaseUid: string;
  userId?: mongoose.Types.ObjectId;
  location?: string;
  clientTimestamp?: Date;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const securityEventSchema = new Schema<ISecurityEvent>(
  {
    type: {
      type: String,
      enum: ['screenshot_detected'],
      required: true,
    },
    firebaseUid: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    location: {
      type: String,
      required: false,
      maxlength: 200,
    },
    clientTimestamp: {
      type: Date,
      required: false,
    },
    ip: {
      type: String,
      required: false,
      maxlength: 128,
    },
    userAgent: {
      type: String,
      required: false,
      maxlength: 512,
    },
  },
  { timestamps: true },
);

securityEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const SecurityEvent = mongoose.model<ISecurityEvent>('SecurityEvent', securityEventSchema);

export default SecurityEvent;

