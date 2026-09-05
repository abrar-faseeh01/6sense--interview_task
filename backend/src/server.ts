import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { errorHandler } from "./middleware/errorHandler.js";
import { sendSuccess } from "./utils/response.js";

dotenv.config();

import swaggerUi from "swagger-ui-express";
import authRoutes from "./routes/authRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import reactionRoutes from "./routes/reactionRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { swaggerSpec } from "./swagger.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Swagger Docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/auth", authRoutes);
app.use("/posts", postRoutes);
app.use("/", reactionRoutes);
app.use("/users", userRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  sendSuccess(res, {
    status: "ok",
    db: isDbConnected ? "connected" : "disconnected",
  });
});

// Global Error Handler
app.use(errorHandler);

// Database connection — requires MONGODB_URI in .env
const startServer = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error(
      "ERROR: MONGODB_URI is not set. Please create a .env file with your MongoDB connection string.\n" +
        "See backend/.env.example for reference.",
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully.");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
    });
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

startServer();
