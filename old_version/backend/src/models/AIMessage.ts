import mongoose, { Document, Schema } from 'mongoose';

export interface IAIMessage extends Document {
  userId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant' | 'system';
  content: string;
  expiresAt?: Date;
  createdAt: Date;
}

const aiMessageSchema = new Schema<IAIMessage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: false,
      default: () => {
        const raw = process.env.AI_MESSAGE_TTL_DAYS;
        const days = raw ? Number.parseInt(raw, 10) : 365;
        if (!Number.isFinite(days) || days <= 0) return undefined;
        return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      },
    },
  },
  {
    timestamps: true,
  }
);

aiMessageSchema.index({ userId: 1, createdAt: -1 });
aiMessageSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: 'date' } } }
);

const AIMessage = mongoose.model<IAIMessage>('AIMessage', aiMessageSchema);

export default AIMessage;
