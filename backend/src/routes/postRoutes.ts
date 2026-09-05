import { Router } from "express";
import mongoose from "mongoose";
import {
  authMiddleware,
  optionalAuthMiddleware,
} from "../middleware/authMiddleware.js";
import Post from "../models/Post.js";
import Reaction from "../models/Reaction.js";
import { sendError, sendSuccess } from "../utils/response.js";

const router = Router();

// Create post
/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a new post (protected)
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - body
 *             properties:
 *               title:
 *                 type: string
 *                 example: "My first post"
 *               body:
 *                 type: string
 *                 example: "Hello world!"
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Bad request
 */
router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const { title, body } = req.body;
    const authorId = (req as any).user._id;

    if (!title || !body) {
      return sendError(res, 400, "Title and body are required");
    }

    const post = new Post({ authorId, title, body });
    await post.save();

    sendSuccess(res, post, 201);
  } catch (err) {
    next(err);
  }
});

// List posts with ranking and counts
/**
 * @swagger
 * /posts:
 *   get:
 *     summary: List posts with pagination and ranking
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Paginated list of posts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Bad request
 */
router.get("/", optionalAuthMiddleware, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.aggregate([
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "postId",
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "reactions",
          let: { postId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$targetId", "$$postId"] },
                    { $eq: ["$targetType", "post"] },
                  ],
                },
              },
            },
          ],
          as: "reactions",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "authorId",
          foreignField: "_id",
          as: "author",
        },
      },
      { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          commentCount: { $size: "$comments" },
          likes: {
            $size: {
              $filter: {
                input: "$reactions",
                as: "r",
                cond: { $eq: ["$$r.type", "like"] },
              },
            },
          },
          dislikes: {
            $size: {
              $filter: {
                input: "$reactions",
                as: "r",
                cond: { $eq: ["$$r.type", "dislike"] },
              },
            },
          },
        },
      },
      {
        $addFields: {
          score: {
            $add: [
              { $subtract: ["$likes", "$dislikes"] },
              { $multiply: ["$commentCount", 2] },
            ],
          },
          authorId: {
            _id: "$author._id",
            name: "$author.name",
          },
        },
      },
      { $project: { comments: 0, reactions: 0, author: 0 } },
      { $sort: { score: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Stamp each post with the current user's reaction (one batched query)
    const userId = (req as any).user?._id?.toString();
    if (userId && posts.length > 0) {
      const postIds = posts.map((p: any) => p._id);
      const userReactions = await Reaction.find({
        userId,
        targetType: "post",
        targetId: { $in: postIds },
      }).lean();

      const reactionMap: Record<string, string> = {};
      userReactions.forEach((r: any) => {
        reactionMap[r.targetId.toString()] = r.type;
      });

      posts.forEach((p: any) => {
        p.userReaction = reactionMap[p._id.toString()] || null;
      });
    } else {
      posts.forEach((p: any) => {
        p.userReaction = null;
      });
    }

    const hasMore = posts.length === limit;
    sendSuccess(res, { posts, page, limit, hasMore });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /posts/{id}:
 *   get:
 *     summary: Get a single post by ID with reaction counts
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the post
 *     responses:
 *       200:
 *         description: Post data including likes, dislikes, and comment count
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid post ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Post not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Get single post
router.get("/:id", optionalAuthMiddleware, async (req, res, next) => {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid post ID");
    }

    const posts = await Post.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "postId",
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "reactions",
          let: { postId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$targetId", "$$postId"] },
                    { $eq: ["$targetType", "post"] },
                  ],
                },
              },
            },
          ],
          as: "reactions",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "authorId",
          foreignField: "_id",
          as: "author",
        },
      },
      { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          commentCount: { $size: "$comments" },
          likes: {
            $size: {
              $filter: {
                input: "$reactions",
                as: "r",
                cond: { $eq: ["$$r.type", "like"] },
              },
            },
          },
          dislikes: {
            $size: {
              $filter: {
                input: "$reactions",
                as: "r",
                cond: { $eq: ["$$r.type", "dislike"] },
              },
            },
          },
          authorId: {
            _id: "$author._id",
            name: "$author.name",
          },
        },
      },
      { $project: { comments: 0, reactions: 0, author: 0 } },
    ]);

    if (!posts || posts.length === 0) {
      return sendError(res, 404, "Post not found");
    }

    const post = posts[0];

    // Attach the current user's reaction if authenticated
    const userId = (req as any).user?._id;
    if (userId) {
      const userReactionDoc = await Reaction.findOne({
        userId,
        targetType: "post",
        targetId: new mongoose.Types.ObjectId(id),
      });
      post.userReaction = userReactionDoc ? userReactionDoc.type : null;
    } else {
      post.userReaction = null;
    }

    sendSuccess(res, post);
  } catch (err) {
    next(err);
  }
});

import Comment from "../models/Comment.js";

/**
 * @swagger
 * /posts/{id}/comments:
 *   post:
 *     summary: Add a comment to a post
 *     tags:
 *       - Posts
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
 *               - body
 *             properties:
 *               body:
 *                 type: string
 *                 example: "Great post!"
 *               parentCommentId:
 *                 type: string
 *                 description: ObjectId of the parent comment (for replies)
 *                 example: null
 *     responses:
 *       201:
 *         description: Comment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid post ID or parent comment
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
 *       404:
 *         description: Post not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Create comment
router.post("/:id/comments", authMiddleware, async (req, res, next) => {
  try {
    const postId = req.params.id as string;
    const { body, parentCommentId } = req.body;
    const authorId = (req as any).user._id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return sendError(res, 400, "Invalid post ID");
    }

    const post = await Post.findById(postId);
    if (!post) {
      return sendError(res, 404, "Post not found");
    }

    if (parentCommentId) {
      const parent = await Comment.findById(parentCommentId);
      if (!parent || parent.postId.toString() !== postId) {
        return sendError(res, 400, "Invalid parent comment");
      }
    }

    const comment = new Comment({
      postId,
      authorId,
      body,
      parentCommentId: parentCommentId || null,
    });
    await comment.save();

    sendSuccess(res, comment, 201);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /posts/{id}/comments:
 *   get:
 *     summary: Get all comments for a post as a nested tree
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the post
 *     responses:
 *       200:
 *         description: Nested comment tree with per-comment reaction counts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid post ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Get comments for a post
router.get("/:id/comments", optionalAuthMiddleware, async (req, res, next) => {
  try {
    const postId = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return sendError(res, 400, "Invalid post ID");
    }

    const comments = await Comment.aggregate([
      { $match: { postId: new mongoose.Types.ObjectId(postId) } },
      {
        $lookup: {
          from: "reactions",
          let: { commentId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$targetId", "$$commentId"] },
                    { $eq: ["$targetType", "comment"] },
                  ],
                },
              },
            },
          ],
          as: "reactions",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "authorId",
          foreignField: "_id",
          as: "author",
        },
      },
      { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          likes: {
            $size: {
              $filter: {
                input: "$reactions",
                as: "r",
                cond: { $eq: ["$$r.type", "like"] },
              },
            },
          },
          dislikes: {
            $size: {
              $filter: {
                input: "$reactions",
                as: "r",
                cond: { $eq: ["$$r.type", "dislike"] },
              },
            },
          },
          authorId: {
            _id: "$author._id",
            name: "$author.name",
          },
        },
      },
      { $project: { reactions: 0, author: 0 } },
      { $sort: { createdAt: -1 } },
    ]);

    // Stamp each comment with the current user's reaction
    const userId = (req as any).user?._id?.toString();
    if (userId) {
      const commentIds = comments.map((c: any) => c._id);
      const userReactions = await Reaction.find({
        userId,
        targetType: "comment",
        targetId: { $in: commentIds },
      }).lean();

      const reactionMap: Record<string, string> = {};
      userReactions.forEach((r) => {
        reactionMap[r.targetId.toString()] = r.type;
      });

      comments.forEach((c: any) => {
        c.userReaction = reactionMap[c._id.toString()] || null;
      });
    } else {
      comments.forEach((c: any) => {
        c.userReaction = null;
      });
    }

    const buildTree = (list: any[], parentId: string | null = null): any[] => {
      return list
        .filter(
          (c) =>
            (c.parentCommentId ? c.parentCommentId.toString() : null) ===
            parentId,
        )
        .map((c) => ({
          ...c,
          replies: buildTree(list, c._id.toString()),
        }));
    };

    const commentTree = buildTree(comments, null);

    sendSuccess(res, { comments: commentTree });
  } catch (err) {
    next(err);
  }
});

export default router;
