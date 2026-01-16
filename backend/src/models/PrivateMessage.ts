import mongoose, { Document, Schema } from 'mongoose';

export interface IPrivateMessage extends Document {
  sessionId: string;
  ephemeralUserId: string; // Sender's ephemeral ID
  recipientEphemeralId?: string; // Optional: for direct private messages
  content: string; // Encrypted or plain text
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'file';
  isEncrypted: boolean;
  createdAt: Date;
  expiresAt: Date; // synced with session expiry
}

const privateMessageSchema = new Schema<IPrivateMessage>(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    ephemeralUserId: {
      type: String,
      required: true,
      index: true,
    },
    recipientEphemeralId: {
      type: String,
      default: null,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video', 'file'],
      default: null,
    },
    isEncrypted: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL Index: Automatically delete documents after 'expiresAt' time
privateMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PrivateMessage = mongoose.model<IPrivateMessage>('PrivateMessage', privateMessageSchema);

export default PrivateMessage;
