import mongoose, { Document, Schema } from 'mongoose';

export interface IGroupKey extends Document {
  groupId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  encryptedKey: string; // base64
  nonce: string; // base64
  senderId?: mongoose.Types.ObjectId;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const groupKeySchema = new Schema<IGroupKey>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    encryptedKey: {
      type: String,
      required: true,
    },
    nonce: {
      type: String,
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

groupKeySchema.index({ groupId: 1, userId: 1 }, { unique: true });

const GroupKey = mongoose.model<IGroupKey>('GroupKey', groupKeySchema);

export default GroupKey;
