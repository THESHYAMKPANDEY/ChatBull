import mongoose, { Document, Schema } from 'mongoose';

export interface IEphemeralSession extends Document {
  sessionId: string;
  ephemeralUserId: string;
  owner: mongoose.Types.ObjectId;
  createdAt: Date;
  expiresAt: Date;
  encryptionKey?: string; // Optional: If client provides a public key
  isActive: boolean;
}

const ephemeralSessionSchema = new Schema<IEphemeralSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ephemeralUserId: {
      type: String,
      required: true,
      index: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    encryptionKey: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL Index: Automatically delete documents after 'expiresAt' time
ephemeralSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const EphemeralSession = mongoose.model<IEphemeralSession>('EphemeralSession', ephemeralSessionSchema);

export default EphemeralSession;
