import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
  },
  { timestamps: true },
);

roomSchema.methods.canBeJoinedBy = function canBeJoinedBy(userId) {
  if (this.visibility === 'public') return true;
  const id = userId.toString();
  return this.owner.toString() === id || this.members.some((member) => member._id.toString() === id);
};

roomSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    code: this.code,
    visibility: this.visibility,
    owner: this.owner.toString(),
    members: this.members.map((member) => member._id.toString()),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Room = mongoose.model('Room', roomSchema);
