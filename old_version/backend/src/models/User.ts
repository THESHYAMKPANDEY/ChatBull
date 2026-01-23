import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  firebaseUid: string;
  email?: string;
  displayName: string;
  username?: string;
  bio?: string;
  photoURL?: string;
  phoneNumber?: string;
  deviceToken?: string;
  savedPosts?: mongoose.Types.ObjectId[];
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
      required: false,
      unique: true,
      sparse: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    bio: {
      type: String,
      default: '',
      maxlength: 150,
    },
    savedPosts: [{
      type: Schema.Types.ObjectId,
      ref: 'Post'
    }],
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

userSchema.index({ isOnline: 1, lastSeen: -1 });

const User = mongoose.model<IUser>('User', userSchema);

export default User;
