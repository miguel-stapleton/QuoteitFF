import mongoose, { Schema, Document } from 'mongoose';

export interface QuoteDoc extends Document {
  title: string;
  appState: any;
  version?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuoteSchema = new Schema<QuoteDoc>({
  title: { type: String, required: true, unique: true, trim: true },
  appState: { type: Schema.Types.Mixed, required: true },
  version: { type: String }
}, { timestamps: true });

export const Quote = mongoose.model<QuoteDoc>('Quote', QuoteSchema);
