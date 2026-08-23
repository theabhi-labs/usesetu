import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Role } from '../types/auth.types';

export interface IUser extends Document {
  name: string;
  email: string;
  mobile: string;
  password: string;
  role: Role;

  isEmailVerified: boolean;
  isActive: boolean;

  // OTP
  otp?: string;
  otpExpiry?: Date;

  // Password reset
  passwordResetToken?: string;
  passwordResetExpiry?: Date;

  // Account lockout
  failedLoginAttempts: number;
  lockUntil?: Date;

  // Refresh token rotation
  tokenVersion: number;

  // Profile
  avatar?: {
    url: string;
    fileId: string;
  };

  lastLoginAt?: Date;
  lastLoginIp?: string;
  cardVerificationToken?: string;

  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidate: string): Promise<boolean>;
  isLocked(): boolean;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Invalid Indian mobile number'],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: Object.values(Role), default: Role.CUSTOMER, index: true },

    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false },

    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },

    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },

    tokenVersion: { type: Number, default: 0 },

    avatar: {
      url: { type: String },
      fileId: { type: String },
    },

    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
    cardVerificationToken: { type: String, unique: true, sparse: true },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, isActive: 1 });

userSchema.pre('save', async function (next) {
  if (!this.cardVerificationToken) {
    this.cardVerificationToken = crypto.randomBytes(16).toString('hex');
  }
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
