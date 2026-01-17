import mongoose, { Schema, Document } from 'mongoose';

export interface IEphemeralSession extends Document {
  sessionId: string;
  ephemeralUserId: string;
  owner: mongoose.Types.ObjectId;
  expiresAt: Date;
  encryptionKey?: string;
  isActive: boolean;
  createdAt: Date;
}

const EphemeralSessionSchema: Schema = new Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  ephemeralUserId: {
    type: String,
    required: true,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index
  },
  encryptionKey: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

export default mongoose.model<IEphemeralSession>('EphemeralSession', EphemeralSessionSchema);
