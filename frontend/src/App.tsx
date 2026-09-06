import { useState } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CreatePost } from "./pages/CreatePost";
import { Feed } from "./pages/Feed";
import { Login } from "./pages/Login";
import { PostDetail } from "./pages/PostDetail";
import { Profile } from "./pages/Profile";
import { Register } from "./pages/Register";

const Navigation = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-0 text-base font-medium">
      <div />

      <div className="flex items-center gap-4 sm:gap-8">
        <Link to="/" className="hover:text-indigo-400 transition-colors">
          Home
        </Link>

        {!user ? (
          <>
            <Link
              to="/login"
              className="hover:text-indigo-400 transition-colors"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="hover:text-indigo-400 transition-colors"
            >
              Register
            </Link>
          </>
        ) : (
          <Link
            to="/create-post"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-md whitespace-nowrap transition-colors"
          >
            + Create Post
          </Link>
        )}
      </div>

      {user ? (
        <div className="relative justify-self-end">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center transition-colors"
            aria-label="Open profile menu"
          >
            {user.name.charAt(0).toUpperCase()}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-gray-900 border border-gray-700 rounded-md shadow-lg py-1 z-50">
              <Link
                to={`/profile/${user._id}`}
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                Edit Profile
              </Link>

              <Link
                to="/create-post"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                Create Post
              </Link>

              <button
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-red-400 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      ) : (
        <div />
      )}
    </nav>
  );
};
const NotFound = () => {
  return (
    <div className="text-center py-16">
      <h1 className="text-2xl font-bold mb-4">Page not found</h1>
      <Link to="/" className="text-indigo-400 hover:text-indigo-300">
        Go back home
      </Link>
    </div>
  );
};

const AppContent = () => {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="bg-gray-900 border-b border-gray-800 px-4 sm:px-6 py-4 flex items-center gap-4">
        <div>
          <Link
            to="/"
            className="text-xl font-bold text-indigo-400 tracking-tight hover:text-indigo-300 transition-colors"
          >
            DevSocial
          </Link>
        </div>
        <Navigation />
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/posts/:id" element={<PostDetail />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/create-post" element={<CreatePost />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
