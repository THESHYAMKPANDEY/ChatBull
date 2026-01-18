import mongoose, { Document, Schema } from 'mongoose';

export interface IPrivateMessage extends Document {
  sessionId: string;
  senderAlias: string;
  receiverAlias: string;
  content: string;
  createdAt: Date;
  expiresAt: Date;
}

const privateMessageSchema = new Schema<IPrivateMessage>(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    senderAlias: {
      type: String,
      required: true,
    },
    receiverAlias: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      index: { expires: 0 }, // TTL index - auto delete when expired
    },
  },
  {
    timestamps: true,
  }
);

const PrivateMessage = mongoose.model<IPrivateMessage>('PrivateMessage', privateMessageSchema);

export default PrivateMessage;
