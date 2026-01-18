import mongoose, { Document, Schema } from 'mongoose';

export interface IEphemeralSession extends Document {
  sessionId: string;
  ephemeralUserId: string;
  owner: mongoose.Types.ObjectId;
  expiresAt: Date;
  encryptionKey?: string;
  isActive: boolean;
  createdAt: Date;
}

const ephemeralSessionSchema = new Schema<IEphemeralSession>(
  {
    sessionId: { type: String, required: true, unique: true },
    ephemeralUserId: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    encryptionKey: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// TTL Index for auto-deletion
ephemeralSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IEphemeralSession>('EphemeralSession', ephemeralSessionSchema);
