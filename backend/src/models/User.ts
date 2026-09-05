import mongoose, { Document, Schema } from "mongoose";

export interface IExperience {
  title: string;
  company: string;
  from: string;
  to: string;
  description?: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  skills: string[];
  experiences: IExperience[];
  createdAt: Date;
  updatedAt: Date;
}

const experienceSchema = new Schema<IExperience>({
  title: { type: String, required: true },
  company: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String },
  description: { type: String },
});

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      match: /^\S+@\S+\.\S+$/,
    },
    passwordHash: { type: String, required: true },
    skills: [{ type: String }],
    experiences: [experienceSchema],
  },
  { timestamps: true },
);

export default mongoose.model<IUser>("User", userSchema);
