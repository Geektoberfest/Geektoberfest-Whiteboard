import mongoose from 'mongoose';

const boardSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      unique: true,
      index: true,
    },
    elements: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  { timestamps: true },
);

export const Board = mongoose.model('Board', boardSchema);
