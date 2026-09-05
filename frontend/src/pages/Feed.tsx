import { faComment, faTrophy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { ReactionButtons } from "../components/ReactionButtons";

interface Post {
  _id: string;
  title: string;
  authorId: { _id: string; name: string };
  createdAt: string;
  likes: number;
  dislikes: number;
  commentCount: number;
  score: number;
  userReaction?: "like" | "dislike" | null;
}

const LIMIT = 10;

export const Feed = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true); // initial load
  const [loadingMore, setLoadingMore] = useState(false); // subsequent pages
  const [error, setError] = useState("");

  // Ref to track in-flight requests so we never double-fetch
  const fetchingRef = useRef(false);

  // Sentinel element at the bottom of the list
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (pageNum: number) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const res: any = await apiClient.get(
        `/posts?page=${pageNum}&limit=${LIMIT}`,
      );
      const newPosts: Post[] = res.data.posts;
      const more: boolean = res.data.hasMore;

      setPosts((prev) => (pageNum === 1 ? newPosts : [...prev, ...newPosts]));
      setHasMore(more);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.message || "Failed to load posts");
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  // IntersectionObserver � triggers when the sentinel scrolls into view
  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !fetchingRef.current && hasMore) {
          setLoadingMore(true);
          fetchPage(page + 1);
        }
      },
      { rootMargin: "200px" },
    );

    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);

    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
  }, [page, hasMore, fetchPage, loading]);

  if (loading)
    return (
      <div className="text-gray-400 text-center py-12">Loading posts...</div>
    );

  if (error)
    return (
      <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-md">
        {error}
      </div>
    );

  if (posts.length === 0)
    return (
      <div className="text-gray-400 text-center py-12">
        No posts yet. Be the first to{" "}
        <Link to="/create-post" className="text-indigo-400 hover:underline">
          create one!
        </Link>
      </div>
    );

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-100 mb-6">Feed</h2>
      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={post._id}
            className="bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-gray-700 transition-colors"
          >
            <h3 className="text-lg font-semibold text-gray-100 mb-1">
              <Link
                to={`/posts/${post._id}`}
                className="hover:text-indigo-400 transition-colors"
              >
                {post.title}
              </Link>
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              by{" "}
              <Link
                to={`/profile/${post.authorId?._id}`}
                className="text-gray-400 hover:text-indigo-400"
              >
                {post.authorId?.name}
              </Link>{" "}
              &middot; {new Date(post.createdAt).toLocaleDateString()}
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <ReactionButtons
                targetId={post._id}
                targetType="post"
                initialLikes={post.likes}
                initialDislikes={post.dislikes}
                initialUserReaction={post.userReaction}
              />
              <Link
                to={`/posts/${post._id}#comment-box`}
                className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors"
              >
                <FontAwesomeIcon icon={faComment} /> {post.commentCount || 0}
              </Link>
              <span className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faTrophy} className="text-yellow-500" />{" "}
                {post.score || 0}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Sentinel � observed by IntersectionObserver */}
      <div ref={sentinelRef} className="py-2" />

      {loadingMore && (
        <div className="text-gray-400 text-center py-4 text-sm">
          Loading more posts...
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="text-gray-600 text-center py-4 text-sm">
          You&apos;ve reached the end.
        </div>
      )}
    </div>
  );
};
