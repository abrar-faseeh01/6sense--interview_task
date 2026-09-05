import type { NextFunction, Request, Response } from "express";

import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendError } from "../utils/response.js";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return sendError(res, 401, "No auth token found");
  }

  try {
    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    );
    const user = await User.findById(decoded.userId).select("-passwordHash");

    if (!user) {
      return sendError(res, 401, "User not found");
    }

    // Attach user to request
    (req as any).user = user;
    next();
  } catch (err) {
    return sendError(res, 401, "Invalid token");
  }
};

/**
 * Like authMiddleware but never blocks the request.
 * Attaches req.user if a valid Bearer token is present; otherwise just calls next().
 */
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (token) {
    try {
      const decoded: any = jwt.verify(
        token,
        process.env.JWT_SECRET as string,
      );
      const user = await User.findById(decoded.userId).select("-passwordHash");
      if (user) {
        (req as any).user = user;
      }
    } catch {
      // Invalid token — ignore and continue as unauthenticated
    }
  }
  next();
};
