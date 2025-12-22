import mongoose, { Schema, Document } from 'mongoose';

export interface IEventCalendar extends Document {
  userId: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  invitedUsers: string[];
  createdAt: Date;
  updatedAt: Date;
}

const EventCalendarSchema = new Schema<IEventCalendar>({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date },
  location: { type: String },
  invitedUsers: [{ type: String, index: true }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Índices
EventCalendarSchema.index({ userId: 1, startDate: 1 });
EventCalendarSchema.index({ invitedUsers: 1, startDate: 1 });
EventCalendarSchema.index({ startDate: 1 });

export const EventCalendar = mongoose.model<IEventCalendar>('EventCalendar', EventCalendarSchema);
