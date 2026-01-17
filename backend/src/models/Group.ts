import mongoose, { Schema, Document } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  description?: string;
  avatar?: string;
  members: mongoose.Types.ObjectId[];
  admins: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  lastMessage?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
  },
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  admins: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
  },
}, {
  timestamps: true,
});

export default mongoose.model<IGroup>('Group', GroupSchema);
