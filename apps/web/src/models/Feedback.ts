import mongoose, { Schema, type Document } from "mongoose";

export interface IFeedback extends Document {
  sessionId: string;
  agentId: string;
  agentName: string;
  customerName: string;
  ratings: {
    handling: number;
    courteousness: number;
    promptness: number;
  };
  overall: number;
  comment: string;
  createdAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    sessionId: { type: String, required: true, index: true },
    agentId: { type: String, required: true, index: true },
    agentName: { type: String, required: true },
    customerName: { type: String, default: "" },
    ratings: {
      handling: { type: Number, min: 1, max: 5, required: true },
      courteousness: { type: Number, min: 1, max: 5, required: true },
      promptness: { type: Number, min: 1, max: 5, required: true },
    },
    overall: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

if (process.env.NODE_ENV !== "production" && mongoose.models.Feedback) {
  mongoose.deleteModel("Feedback");
}

export const FeedbackModel = mongoose.model<IFeedback>("Feedback", feedbackSchema);
