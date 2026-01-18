import mongoose, { Document, Schema } from 'mongoose';

export interface IStory extends Document {
  author: mongoose.Types.ObjectId;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  viewers: mongoose.Types.ObjectId[];
  expiresAt: Date;
  createdAt: Date;
}

const storySchema = new Schema<IStory>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    viewers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      index: { expires: 0 }, // TTL index
    },
  },
  {
    timestamps: true,
  }
);

storySchema.index({ author: 1, createdAt: -1 });

const Story = mongoose.model<IStory>('Story', storySchema);

export default Story;
