import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { ReactionButtons } from "../components/ReactionButtons";
import { useAuth } from "../context/AuthContext";
interface CommentType {
  _id: string;
  body: string;
  authorId: { _id: string; name: string };
  createdAt: string;
  replies: CommentType[];
  likes: number;
  dislikes: number;
  userReaction?: "like" | "dislike" | null;
}
interface PostDetailType {
  _id: string;
  title: string;
  body: string;
  authorId: { _id: string; name: string };
  createdAt: string;
  likes: number;
  dislikes: number;
  commentCount: number;
  userReaction?: "like" | "dislike" | null;
}
const Comment = ({
  comment,
  postId,
  onCommentAdded,
  depth = 0,
}: {
  comment: CommentType;
  postId: string;
  onCommentAdded: () => void;
  depth?: number;
}) => {
  const [showReply, setShowReply] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const { user } = useAuth();
  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    try {
      await apiClient.post(`/posts/${postId}/comments`, {
        body: replyBody,
        parentCommentId: comment._id,
      });
      setReplyBody("");
      setShowReply(false);
      onCommentAdded();
    } catch (err) {
      console.error("Failed to reply", err);
    }
  };
  return (
    <div
      className={`${depth > 0 ? "ml-3 sm:ml-6 border-l-2 border-gray-800 pl-3 sm:pl-4" : ""} mt-4`}
    >
      {" "}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        {" "}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          {" "}
          <span className="font-medium text-gray-400">
            {" "}
            {comment.authorId?.name}{" "}
          </span>{" "}
          <span>&middot;</span>{" "}
          <span>{new Date(comment.createdAt).toLocaleDateString()}</span>{" "}
        </div>{" "}
        <p className="text-gray-200 text-sm whitespace-pre-wrap mb-3">
          {" "}
          {comment.body}{" "}
        </p>{" "}
        <div className="flex items-center gap-3">
          {" "}
          <ReactionButtons
            targetId={comment._id}
            targetType="comment"
            initialLikes={comment.likes}
            initialDislikes={comment.dislikes}
            initialUserReaction={comment.userReaction}
          />{" "}
          {user && (
            <button
              onClick={() => setShowReply(!showReply)}
              className="text-xs text-gray-500 hover:text-indigo-400 transition-colors"
            >
              {" "}
              Reply{" "}
            </button>
          )}{" "}
        </div>{" "}
        {showReply && (
          <form onSubmit={handleReplySubmit} className="mt-3 space-y-2">
            {" "}
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              required
              rows={2}
              placeholder="Write a reply..."
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />{" "}
            <div className="flex gap-2">
              {" "}
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1 rounded-md transition-colors"
              >
                {" "}
                Submit{" "}
              </button>{" "}
              <button
                type="button"
                onClick={() => setShowReply(false)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                {" "}
                Cancel{" "}
              </button>{" "}
            </div>{" "}
          </form>
        )}{" "}
      </div>{" "}
      {comment.replies?.map((reply) => (
        <Comment
          key={reply._id}
          comment={reply}
          postId={postId}
          onCommentAdded={onCommentAdded}
          depth={depth + 1}
        />
      ))}{" "}
    </div>
  );
};
export const PostDetail = () => {
  const { id } = useParams();
  const [post, setPost] = useState<PostDetailType | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newCommentBody, setNewCommentBody] = useState("");
  const [postLoading, setPostLoading] = useState(true);
  const [postError, setPostError] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState("");
  const { user } = useAuth();
  const fetchPostAndComments = async () => {
    setPostLoading(true);
    setPostError("");
    setCommentsLoading(true);
    setCommentsError("");
    const postRequest = apiClient.get(`/posts/${id}`);
    const commentsRequest = apiClient.get(`/posts/${id}/comments`);
    const [postResult, commentsResult] = await Promise.allSettled([
      postRequest,
      commentsRequest,
    ]);
    if (postResult.status === "fulfilled") {
      setPost(postResult.value.data);
    } else {
      const err: any = postResult.reason;
      setPostError(err?.message || "Failed to load post");
    }
    if (commentsResult.status === "fulfilled") {
      setComments(commentsResult.value.data.comments);
    } else {
      const err: any = commentsResult.reason;
      setCommentsError(err?.message || "Failed to load comments");
    }
    setPostLoading(false);
    setCommentsLoading(false);
  };
  useEffect(() => {
    fetchPostAndComments();
  }, [id]);

  // Scroll to comment box if the URL has #comment-box and post is loaded
  useEffect(() => {
    if (!postLoading && window.location.hash === "#comment-box") {
      document.getElementById("comment-box")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [postLoading]);

  // Refreshes only the comments list without touching postLoading,
  // so the DOM stays mounted and scroll position is preserved.
  const fetchCommentsOnly = async () => {
    setCommentsLoading(true);
    setCommentsError("");
    try {
      const res: any = await apiClient.get(`/posts/${id}/comments`);
      setComments(res.data.comments);
    } catch (err: any) {
      setCommentsError(err?.message || "Failed to load comments");
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleNewCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentBody.trim()) return;
    try {
      await apiClient.post(`/posts/${id}/comments`, { body: newCommentBody });
      setNewCommentBody("");
      fetchCommentsOnly();
    } catch (err) {
      console.error("Failed to post comment", err);
    }
  };
  if (postLoading) {
    return (
      <div className="text-gray-400 text-center py-12"> Loading post... </div>
    );
  }
  if (postError) {
    return (
      <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-md">
        {" "}
        {postError}{" "}
      </div>
    );
  }
  if (!post) {
    return <div className="text-gray-400">Post not found.</div>;
  }
  return (
    <div>
      {" "}
      <h2 className="text-2xl font-bold text-gray-100 mb-2">
        {" "}
        {post.title}{" "}
      </h2>{" "}
      <p className="text-xs text-gray-500 mb-6">
        {" "}
        by <span className="text-gray-400">
          {post.authorId?.name}
        </span> &middot; {new Date(post.createdAt).toLocaleDateString()}{" "}
      </p>{" "}
      <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap mb-6 leading-relaxed">
        {" "}
        {post.body}{" "}
      </div>{" "}
      <div className="border-t border-gray-800 pt-4 pb-6">
        {" "}
        <ReactionButtons
          targetId={post._id}
          targetType="post"
          initialLikes={post.likes}
          initialDislikes={post.dislikes}
          initialUserReaction={post.userReaction}
        />{" "}
      </div>{" "}
      <div id="comments">
        {" "}
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          {" "}
          Comments ({post.commentCount}){" "}
        </h3>{" "}
        {user ? (
          <form onSubmit={handleNewCommentSubmit} className="mb-6 space-y-2">
            {" "}
            <textarea
              id="comment-box"
              value={newCommentBody}
              onChange={(e) => setNewCommentBody(e.target.value)}
              required
              rows={3}
              placeholder="Add a comment..."
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />{" "}
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-1.5 rounded-md transition-colors"
            >
              {" "}
              Post Comment{" "}
            </button>{" "}
          </form>
        ) : (
          <p className="text-sm text-gray-500 mb-4">
            {" "}
            Please log in to leave a comment.{" "}
          </p>
        )}{" "}
        {commentsLoading ? (
          <p className="text-gray-400 text-sm">Loading comments...</p>
        ) : commentsError ? (
          <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-md">
            {" "}
            {commentsError}{" "}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-gray-500 text-sm">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <Comment
              key={comment._id}
              comment={comment}
              postId={post._id}
              onCommentAdded={fetchCommentsOnly}
            />
          ))
        )}{" "}
      </div>{" "}
    </div>
  );
};
