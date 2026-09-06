import { Router } from "express";
import mongoose from "mongoose";
import { authMiddleware } from "../middleware/authMiddleware.js";
import Comment from "../models/Comment.js";
import Post from "../models/Post.js";
import Reaction from "../models/Reaction.js";
import { sendError, sendSuccess } from "../utils/response.js";

const router = Router();

const toggleReaction = async (
  userId: string,
  targetType: "post" | "comment",
  targetId: string,
  type: "like" | "dislike",
) => {
  const existing = await Reaction.findOne({ userId, targetType, targetId });

  if (!existing) {
    await Reaction.create({ userId, targetType, targetId, type });
  } else if (existing.type === type) {
    await Reaction.deleteOne({ _id: existing._id });
  } else {
    existing.type = type;
    await existing.save();
  }

  // Compute counts
  const counts = await Reaction.aggregate([
    { $match: { targetType, targetId: new mongoose.Types.ObjectId(targetId) } },
    { $group: { _id: "$type", count: { $sum: 1 } } },
  ]);

  const result = { likes: 0, dislikes: 0 };
  counts.forEach((c: any) => {
    if (c._id === "like") result.likes = c.count;
    if (c._id === "dislike") result.dislikes = c.count;
  });

  // determine the user's current reaction after toggle
  const currentReaction = await Reaction.findOne({
    userId,
    targetType,
    targetId,
  });

  return {
    counts: result,
    userReaction: currentReaction ? currentReaction.type : null,
  };
};

/**
 * @swagger
 * /posts/{id}/reactions:
 *   post:
 *     summary: Like or dislike a post (toggles if already reacted)
 *     tags:
 *       - Reactions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the post
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [like, dislike]
 *                 example: like
 *     responses:
 *       200:
 *         description: Updated reaction counts and the user's current reaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid post ID or reaction type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Post reaction
router.post("/posts/:id/reactions", authMiddleware, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const { type } = req.body;
    const userId = (req as any).user._id;

    if (!mongoose.Types.ObjectId.isValid(id))
      return sendError(res, 400, "Invalid ID");
    const post = await Post.findById(id);
    if (!post) return sendError(res, 404, "Post not found");

    if (!["like", "dislike"].includes(type))
      return sendError(res, 400, "Invalid reaction type");

    const result = await toggleReaction(userId, "post", id, type);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /comments/{id}/reactions:
 *   post:
 *     summary: Like or dislike a comment (toggles if already reacted)
 *     tags:
 *       - Reactions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the comment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [like, dislike]
 *                 example: dislike
 *     responses:
 *       200:
 *         description: Updated reaction counts and the user's current reaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid comment ID or reaction type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Comment reaction
router.post(
  "/comments/:id/reactions",

  authMiddleware,
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const { type } = req.body;
      const userId = (req as any).user._id;

      if (!mongoose.Types.ObjectId.isValid(id))
        return sendError(res, 400, "Invalid ID");

      const comment = await Comment.findById(id);
      if (!comment) return sendError(res, 404, "Comment not found");
      if (!["like", "dislike"].includes(type))
        return sendError(res, 400, "Invalid reaction type");

      const result = await toggleReaction(userId, "comment", id, type);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
