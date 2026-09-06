import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Experience {
  _id?: string;
  title: string;
  company: string;
  from: string;
  to: string;
  description: string;
}

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  skills: string[];
  experiences: Experience[];
}

const inputCls =
  "w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm";
const btnPrimary =
  "bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-1.5 rounded-md transition-colors";
const btnSecondary =
  "border border-gray-700 hover:border-gray-500 text-gray-300 text-sm px-4 py-1.5 rounded-md transition-colors";
const btnDanger = "text-red-400 hover:text-red-300 text-sm transition-colors";

export const Profile = () => {
  const { id } = useParams();
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSkills, setEditSkills] = useState("");
  const [editExperiences, setEditExperiences] = useState<Experience[]>([]);

  const isOwner = user && user._id === id;

  const fetchProfile = async () => {
    try {
      const res: any = await apiClient.get(`/users/${id}`);
      setProfile(res.data.user);
      setRecentPosts(res.data.recentPosts || []);
      setEditName(res.data.user.name);
      setEditSkills(res.data.user.skills.join(", "));
      setEditExperiences(res.data.user.experiences || []);
    } catch (err: any) {
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const handleSave = async () => {
    try {
      const skillsArray = editSkills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);
      const res: any = await apiClient.patch("/users/me", {
        name: editName,
        skills: skillsArray,
        experiences: editExperiences,
      });
      setProfile(res.data);
      // Sync the global AuthContext so the navbar reflects the updated name immediately
      if (user) {
        updateUser({
          _id: user._id,
          name: res.data.name,
          email: res.data.email,
        });
      }
      setIsEditing(false);
    } catch {
      alert("Failed to save profile");
    }
  };

  const handleAddExperience = () => {
    setEditExperiences([
      ...editExperiences,
      { title: "", company: "", from: "", to: "", description: "" },
    ]);
  };

  const handleExperienceChange = (
    index: number,
    field: string,
    value: string,
  ) => {
    const newExp = [...editExperiences];
    newExp[index] = { ...newExp[index], [field]: value };
    setEditExperiences(newExp);
  };

  const handleRemoveExperience = (index: number) => {
    setEditExperiences(editExperiences.filter((_, i) => i !== index));
  };

  if (loading)
    return (
      <div className="text-gray-400 text-center py-12">Loading profile...</div>
    );
  if (error)
    return (
      <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-md">
        {error}
      </div>
    );
  if (!profile) return <div className="text-gray-400">Profile not found.</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-100">
          {isEditing ? "Edit Profile" : `${profile.name}`}
        </h2>
        {isOwner && !isEditing && (
          <button onClick={() => setIsEditing(true)} className={btnSecondary}>
            Edit Profile
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Skills (comma-separated)
            </label>
            <input
              type="text"
              value={editSkills}
              onChange={(e) => setEditSkills(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Experiences
            </h3>
            {editExperiences.map((exp, idx) => (
              <div
                key={idx}
                className="border border-dashed border-gray-700 rounded-lg p-4 mb-3 space-y-2"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    placeholder="Title"
                    value={exp.title}
                    onChange={(e) =>
                      handleExperienceChange(idx, "title", e.target.value)
                    }
                    className={inputCls}
                    required
                  />
                  <input
                    placeholder="Company"
                    value={exp.company}
                    onChange={(e) =>
                      handleExperienceChange(idx, "company", e.target.value)
                    }
                    className={inputCls}
                    required
                  />
                  <input
                    placeholder="From (e.g. 2020)"
                    value={exp.from}
                    onChange={(e) =>
                      handleExperienceChange(idx, "from", e.target.value)
                    }
                    className={inputCls}
                    required
                  />
                  <input
                    placeholder="To (e.g. 2023 or Present)"
                    value={exp.to}
                    onChange={(e) =>
                      handleExperienceChange(idx, "to", e.target.value)
                    }
                    className={inputCls}
                  />
                </div>
                <textarea
                  placeholder="Description"
                  value={exp.description}
                  onChange={(e) =>
                    handleExperienceChange(idx, "description", e.target.value)
                  }
                  rows={2}
                  className={inputCls + " resize-none"}
                />
                <button
                  onClick={() => handleRemoveExperience(idx)}
                  className={btnDanger}
                >
                  Remove
                </button>
              </div>
            ))}
            <button onClick={handleAddExperience} className={btnSecondary}>
              + Add Experience
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} className={btnPrimary}>
              Save Changes
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className={btnSecondary}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Skills
            </h3>
            {profile.skills?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="bg-gray-800 text-gray-300 text-sm px-3 py-1 rounded-full border border-gray-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No skills added yet.</p>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Experience
            </h3>
            {profile.experiences?.length > 0 ? (
              <div className="space-y-4">
                {profile.experiences.map((exp, idx) => (
                  <div key={idx} className="border-l-2 border-indigo-600 pl-4">
                    <p className="font-semibold text-gray-200">
                      {exp.title}{" "}
                      <span className="font-normal text-gray-400">
                        at {exp.company}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {exp.from} &ndash; {exp.to || "Present"}
                    </p>
                    {exp.description && (
                      <p className="text-sm text-gray-400 mt-1">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No experience added yet.</p>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Recent Posts
            </h3>
            {recentPosts?.length > 0 ? (
              <ul className="space-y-2">
                {recentPosts.map((post) => (
                  <li key={post._id} className="text-sm">
                    <Link
                      to={`/posts/${post._id}`}
                      className="text-indigo-400 hover:underline"
                    >
                      {post.title}
                    </Link>
                    <span className="text-gray-600 ml-2">
                      &middot; {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No posts yet.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
