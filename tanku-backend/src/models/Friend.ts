import mongoose, { Schema, Document } from 'mongoose';

export interface IFriend extends Document {
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
}

export interface IFriendRequest extends Document {
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface IFriendshipGroup extends Document {
  userId: string;
  name: string;
  friendIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const FriendSchema = new Schema<IFriend>({
  userId: { type: String, required: true, index: true },
  friendId: { type: String, required: true, index: true },
  status: { type: String, enum: ['pending', 'accepted', 'blocked'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Índice único para evitar duplicados
FriendSchema.index({ userId: 1, friendId: 1 }, { unique: true });

const FriendRequestSchema = new Schema<IFriendRequest>({
  fromUserId: { type: String, required: true, index: true },
  toUserId: { type: String, required: true, index: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

FriendRequestSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });
FriendRequestSchema.index({ toUserId: 1, status: 1 });

const FriendshipGroupSchema = new Schema<IFriendshipGroup>({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  friendIds: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Friend = mongoose.model<IFriend>('Friend', FriendSchema);
export const FriendRequest = mongoose.model<IFriendRequest>('FriendRequest', FriendRequestSchema);
export const FriendshipGroup = mongoose.model<IFriendshipGroup>('FriendshipGroup', FriendshipGroupSchema);
