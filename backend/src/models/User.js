import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { pickUserColor } from '../utils/colors.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 40,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    color: {
      type: String,
      required: true,
      default: () => pickUserColor(crypto.randomUUID()),
    },
  },
  { timestamps: true },
);

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return { id: this._id.toString(), name: this.name, email: this.email, color: this.color };
};

export const User = mongoose.model('User', userSchema);
