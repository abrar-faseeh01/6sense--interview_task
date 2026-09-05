import type { NextFunction, Request, Response } from "express";

import { sendError } from "../utils/response.js";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error(err);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e: any) => e.message);
    return sendError(res, 400, "Validation Error", errors);
  }

  // Mongoose cast error (e.g. invalid ObjectId)
  if (err.name === "CastError") {
    return sendError(res, 400, "Invalid ID format");
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return sendError(res, 400, "Duplicate value entered");
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || "Server Error";
  sendError(res, statusCode, message);
};
