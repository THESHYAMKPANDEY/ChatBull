import mongoose, { Schema, Document } from 'mongoose';

export interface IAIMessage extends Document {
  userId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

const aiMessageSchema = new Schema<IAIMessage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IAIMessage>('AIMessage', aiMessageSchema);
