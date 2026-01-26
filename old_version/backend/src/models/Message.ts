import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'video' | 'document';
  isRead: boolean;
  isPrivate: boolean;
  replyTo?: {
    messageId: mongoose.Types.ObjectId;
    senderName: string;
    content: string;
  };
  reactions?: Map<string, string[]>;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Optional for group messages
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: false,
    },
    content: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'video', 'document'],
      default: 'text',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    replyTo: {
      messageId: {
        type: Schema.Types.ObjectId,
        ref: 'Message',
        required: false,
      },
      senderName: {
        type: String,
        required: false,
      },
      content: {
        type: String,
        required: false,
      },
    },
    reactions: {
      type: Map,
      of: [String],
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ groupId: 1, createdAt: 1 });
messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });
messageSchema.index({ receiver: 1, isRead: 1, createdAt: 1 });

const Message = mongoose.model<IMessage>('Message', messageSchema);

export default Message;
