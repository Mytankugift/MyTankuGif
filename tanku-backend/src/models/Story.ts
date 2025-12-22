import mongoose, { Schema, Document } from 'mongoose';

export interface IStory extends Document {
  userId: string;
  files: IStoryFile[];
  title?: string;
  description?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStoryFile {
  url: string;
  type: 'image' | 'video';
  order: number;
}

const StoryFileSchema = new Schema<IStoryFile>({
  url: { type: String, required: true },
  type: { type: String, enum: ['image', 'video'], required: true },
  order: { type: Number, required: true },
}, { _id: false });

const StorySchema = new Schema<IStory>({
  userId: { type: String, required: true, index: true },
  files: [StoryFileSchema],
  title: { type: String },
  description: { type: String },
  expiresAt: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Índices
StorySchema.index({ userId: 1, createdAt: -1 });
StorySchema.index({ expiresAt: 1 }); // Para limpiar historias expiradas

export const Story = mongoose.model<IStory>('Story', StorySchema);
