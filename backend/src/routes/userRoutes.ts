import { Router } from "express";
import mongoose from "mongoose";
import { authMiddleware } from "../middleware/authMiddleware.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { sendError, sendSuccess } from "../utils/response.js";

const router = Router();

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user's public profile and recent posts
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the user
 *     responses:
 *       200:
 *         description: User profile and recent posts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid user ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Get public profile
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid user ID");
    }

    const user = await User.findById(id).select("-passwordHash -email");

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    // Optionally fetch their recent posts
    const recentPosts = await Post.find({ authorId: id })
      .sort({ createdAt: -1 })
      .limit(5);

    sendSuccess(res, { user, recentPosts });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /users/me:
 *   patch:
 *     summary: Update the authenticated user's own profile
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Jane Doe"
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["TypeScript", "Node.js"]
 *               experiences:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     company:
 *                       type: string
 *                     from:
 *                       type: string
 *                     to:
 *                       type: string
 *                     description:
 *                       type: string
 *     responses:
 *       200:
 *         description: Updated user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Update own profile
router.patch("/me", authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as any).user._id;
    const { skills, experiences, name } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, "User not found");
    }

    if (name !== undefined) user.name = name;
    if (skills !== undefined) user.skills = skills;
    if (experiences !== undefined) user.experiences = experiences;

    await user.save();

    // Return the updated user without the passwordHash
    const updatedUser = await User.findById(userId).select("-passwordHash");

    sendSuccess(res, updatedUser);
  } catch (err) {
    next(err);
  }
});

export default router;
