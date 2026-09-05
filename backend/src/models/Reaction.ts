import mongoose, { Document, Schema } from "mongoose";

export interface IReaction extends Document {
  userId: mongoose.Types.ObjectId;
  targetType: "post" | "comment";
  targetId: mongoose.Types.ObjectId;
  type: "like" | "dislike";
}

const reactionSchema = new Schema<IReaction>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  targetType: { type: String, enum: ["post", "comment"], required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  type: { type: String, enum: ["like", "dislike"], required: true },
});

reactionSchema.index(
  { userId: 1, targetType: 1, targetId: 1 },
  { unique: true },
);

export default mongoose.model<IReaction>("Reaction", reactionSchema);
