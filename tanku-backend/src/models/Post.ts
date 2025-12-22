import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  userId: string;
  content?: string;
  images?: string[];
  createdAt: Date;
  updatedAt: Date;
  reactions: IPostReaction[];
  comments: IPostComment[];
}

export interface IPostReaction {
  userId: string;
  type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
  createdAt: Date;
}

export interface IPostComment {
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const PostReactionSchema = new Schema<IPostReaction>({
  userId: { type: String, required: true, index: true },
  type: { type: String, enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry'], default: 'like' },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const PostCommentSchema = new Schema<IPostComment>({
  userId: { type: String, required: true, index: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { _id: true });

const PostSchema = new Schema<IPost>({
  userId: { type: String, required: true, index: true },
  content: { type: String },
  images: [{ type: String }],
  reactions: [PostReactionSchema],
  comments: [PostCommentSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Índices
PostSchema.index({ userId: 1, createdAt: -1 });
PostSchema.index({ createdAt: -1 });

export const Post = mongoose.model<IPost>('Post', PostSchema);
