import mongoose, { Document, Schema } from 'mongoose';

export interface ICall extends Document {
  caller: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  status: 'initiated' | 'ongoing' | 'completed' | 'missed' | 'rejected' | 'busy';
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  callType: 'audio' | 'video';
  roomId?: string; // For joining specific rooms if needed
}

const callSchema = new Schema<ICall>(
  {
    caller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['initiated', 'ongoing', 'completed', 'missed', 'rejected', 'busy'],
      default: 'initiated',
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number,
    },
    callType: {
      type: String,
      enum: ['audio', 'video'],
      default: 'audio',
    },
    roomId: {
      type: String,
    }
  },
  {
    timestamps: true,
  }
);

callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ receiver: 1, createdAt: -1 });

const Call = mongoose.model<ICall>('Call', callSchema);

export default Call;
