import mongoose, { Schema, Document, Model } from 'mongoose';

export enum AccountStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
}

export interface IAccount extends Document {
  ownerUserId: mongoose.Types.ObjectId; // References User model
  name: string;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<IAccount>(
  {
    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    status: {
      type: String,
      enum: Object.values(AccountStatus),
      default: AccountStatus.ACTIVE,
      index: true,
    },
  },
  { timestamps: true },
);

export const Account: Model<IAccount> = mongoose.model<IAccount>('Account', accountSchema);
