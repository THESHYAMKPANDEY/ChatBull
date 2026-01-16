import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  firebaseUid: string;
  email: string;
  displayName: string;
  username?: string;
  photoURL?: string;
  phoneNumber?: string;
  deviceToken?: string;
  isPremium?: boolean;
  isDeleted?: boolean;
  deletedAt?: Date;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      unique: false,  // Set to false to avoid the constraint issue
      sparse: true,   // Only enforce uniqueness where the field exists
      lowercase: true,
      trim: true,
    },
    photoURL: {
      type: String,
      default: '',
    },
    phoneNumber: {
      type: String,
      default: '',
    },
    deviceToken: {
      type: String,
      default: '',
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model<IUser>('User', userSchema);

export default User;
