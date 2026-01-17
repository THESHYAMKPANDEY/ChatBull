import mongoose, { Document, Schema } from 'mongoose';

export interface IStory extends Document {
  author: mongoose.Types.ObjectId;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  expiresAt: Date;
}

const storySchema = new Schema<IStory>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, required: true, enum: ['image', 'video'] },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: true,
      expires: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IStory>('Story', storySchema);

