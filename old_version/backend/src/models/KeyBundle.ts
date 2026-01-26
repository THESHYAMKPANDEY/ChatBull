import mongoose, { Document, Schema } from 'mongoose';

export interface IKeyBundle extends Document {
  userId: mongoose.Types.ObjectId;
  identityKey: string; // base64 public key
  deviceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const keyBundleSchema = new Schema<IKeyBundle>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    identityKey: {
      type: String,
      required: true,
    },
    deviceId: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const KeyBundle = mongoose.model<IKeyBundle>('KeyBundle', keyBundleSchema);

export default KeyBundle;
