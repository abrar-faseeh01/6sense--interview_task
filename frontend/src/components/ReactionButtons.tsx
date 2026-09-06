import { faThumbsDown, faThumbsUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";

import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface ReactionButtonsProps {
  targetId: string;
  targetType: "post" | "comment";
  initialLikes: number;
  initialDislikes: number;
  initialUserReaction?: "like" | "dislike" | null;
}

export const ReactionButtons = ({
  targetId,
  targetType,
  initialLikes,
  initialDislikes,
  initialUserReaction = null,
}: ReactionButtonsProps) => {
  const [likes, setLikes] = useState(initialLikes || 0);
  const [dislikes, setDislikes] = useState(initialDislikes || 0);
  const [userReaction, setUserReaction] = useState<"like" | "dislike" | null>(
    initialUserReaction,
  );

  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [reactionError, setReactionError] = useState("");

  const handleReact = async (type: "like" | "dislike") => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setReactionError("");
    try {
      const endpoint =
        targetType === "post"
          ? `/posts/${targetId}/reactions`
          : `/comments/${targetId}/reactions`;

      const res: any = await apiClient.post(endpoint, { type });

      setLikes(res.data.counts.likes);
      setDislikes(res.data.counts.dislikes);
      setUserReaction(res.data.userReaction);
    } catch (err) {
      console.error("Failed to react", err);
      setReactionError("Couldn't update reaction. Please try again.");
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleReact("like")}
          className={`flex items-center gap-1.5 text-sm transition-colors px-2 py-1 rounded-md ${
            userReaction === "like"
              ? "text-green-400 bg-green-900/20"
              : "text-gray-400 hover:text-green-400 hover:bg-green-900/20"
          }`}
        >
          <FontAwesomeIcon icon={faThumbsUp} /> {likes}
        </button>

        <button
          onClick={() => handleReact("dislike")}
          className={`flex items-center gap-1.5 text-sm transition-colors px-2 py-1 rounded-md ${
            userReaction === "dislike"
              ? "text-red-400 bg-red-900/20"
              : "text-gray-400 hover:text-red-400 hover:bg-red-900/20"
          }`}
        >
          <FontAwesomeIcon icon={faThumbsDown} /> {dislikes}
        </button>
      </div>

      {reactionError && (
        <p className="mt-2 text-sm text-red-400">{reactionError}</p>
      )}

      {showLoginModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setShowLoginModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-lg font-semibold text-gray-100">
              Login required
            </h2>

            <p className="mb-6 text-sm text-gray-400">
              Please log in to like or dislike posts and comments.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLoginModal(false)}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>

              <Link
                to="/login"
                onClick={() => setShowLoginModal(false)}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 transition-colors"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
