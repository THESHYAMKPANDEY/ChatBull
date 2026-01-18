import mongoose, { Document, Schema } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  description?: string;
  members: mongoose.Types.ObjectId[];
  admins: mongoose.Types.ObjectId[];
  avatar?: string;
  lastMessage?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const groupSchema = new Schema<IGroup>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    members: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    admins: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    avatar: {
      type: String,
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
  },
  {
    timestamps: true,
  }
);

const Group = mongoose.model<IGroup>('Group', groupSchema);

export default Group;
