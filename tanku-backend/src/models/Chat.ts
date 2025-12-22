import mongoose, { Schema, Document } from 'mongoose';

export interface IChatConversation extends Document {
  participants: string[]; // Array de user IDs
  lastMessage?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatMessage extends Document {
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  status: 'sent' | 'delivered' | 'read';
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatMessageStatus extends Document {
  messageId: string;
  userId: string;
  status: 'sent' | 'delivered' | 'read';
  readAt?: Date;
  createdAt: Date;
}

const ChatConversationSchema = new Schema<IChatConversation>({
  participants: [{ type: String, required: true, index: true }],
  lastMessage: { type: String },
  lastMessageAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Índice único para conversaciones entre dos usuarios
ChatConversationSchema.index({ participants: 1 }, { unique: true });
ChatConversationSchema.index({ lastMessageAt: -1 });

const ChatMessageSchema = new Schema<IChatMessage>({
  conversationId: { type: String, required: true, index: true },
  senderId: { type: String, required: true, index: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  readAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ChatMessageSchema.index({ conversationId: 1, createdAt: -1 });
ChatMessageSchema.index({ senderId: 1 });

const ChatMessageStatusSchema = new Schema<IChatMessageStatus>({
  messageId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  readAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

ChatMessageStatusSchema.index({ messageId: 1, userId: 1 }, { unique: true });

export const ChatConversation = mongoose.model<IChatConversation>('ChatConversation', ChatConversationSchema);
export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
export const ChatMessageStatus = mongoose.model<IChatMessageStatus>('ChatMessageStatus', ChatMessageStatusSchema);
