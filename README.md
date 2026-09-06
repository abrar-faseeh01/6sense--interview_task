# DevSocial

A full-stack developer community platform where users can register, publish posts, comment with nested replies, and react (like/dislike) to content. Posts are ranked by an engagement-based score computed dynamically via MongoDB aggregation pipelines. Built as an internship assignment.

## Tech Stack

| Layer    | Technology                                       |
| -------- | ------------------------------------------------ |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v4    |
| Backend  | Express 5, TypeScript, Mongoose, JSON Web Tokens |
| Database | MongoDB                                          |

---

## Architecture Overview

The project follows a standard client–server SPA architecture:

**Frontend** is a React single-page application served by Vite's dev server on port 5173. It communicates with the backend exclusively via a centralized Axios client (`apiClient`) that handles two concerns automatically: a **request interceptor** attaches the JWT Bearer token from `localStorage` on every outgoing request, and a **response interceptor** unwraps the `{ success, data }` envelope the backend returns, so components receive the payload directly.

**Backend** is a stateless Express REST API on port 5000. Routes are organized by domain — `authRoutes`, `postRoutes`, `reactionRoutes`, `userRoutes` — and protected endpoints use `authMiddleware` to verify the JWT and attach the authenticated user to the request. Public read endpoints (feed, post detail, comments) use `optionalAuthMiddleware`, which decodes the token if present (to personalize reaction state) but never blocks the request.

**Database** is MongoDB, accessed via Mongoose. The schema is normalized: `Post`, `Comment`, and `Reaction` are separate collections linked by ObjectId references. Likes, dislikes, comment counts, and ranking scores are **not stored** on Post documents — they are computed dynamically at query time via aggregation pipelines that `$lookup` across collections. This keeps the schema simple and counts always accurate, at the cost of heavier read queries.

**Authentication flow**: the backend hashes passwords with bcrypt and signs JWTs with a 1-hour expiry. The frontend stores the token in `localStorage`, restores sessions on page load via `GET /auth/me`, and guards protected UI routes with a `ProtectedRoute` component that checks React auth state (while the backend independently enforces access control on every protected endpoint).

---

## Prerequisites

- Node.js >= 18
- A running MongoDB instance (local or Atlas) — the backend will exit on startup without a valid `MONGODB_URI`

### 1. Clone the repository

```bash
git clone <repo-url>
cd DevSocial
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure backend environment

Create `backend/.env` from the example:

```bash
cp .env.example .env   # macOS/Linux
# or
copy .env.example .env  # Windows
```

Edit `backend/.env` and fill in your values (see [Environment Variables](#environment-variables) below).

### 4. Start the backend dev server

```bash
# From the backend/ directory
npm run dev
```

The server starts on port 5000 (or `PORT` from your `.env`) using `tsx watch` for hot-reload. You should see:

```
MongoDB connected successfully.
Server running on port 5000
Swagger docs at http://localhost:5000/api-docs
```

### 5. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 6. Configure frontend environment (optional)

If your backend runs on a different port, create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

If this file is absent, the frontend defaults to `http://localhost:5000`.

### 7. Start the frontend dev server

```bash
# From the frontend/ directory
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable      | Required | Description                                      |
| ------------- | -------- | ------------------------------------------------ |
| `MONGODB_URI` | Yes      | MongoDB connection string (e.g. `mongodb://...`) |
| `JWT_SECRET`  | Yes      | Secret key for signing JWTs                      |
| `PORT`        | No       | Port for the Express server (default: `5000`)    |

> **Never commit actual values.** Use `.env.example` as a template. The server will refuse to start if either `MONGODB_URI` or `JWT_SECRET` is missing.

### Frontend (`frontend/.env`)

| Variable       | Required | Description                                         |
| -------------- | -------- | --------------------------------------------------- |
| `VITE_API_URL` | No       | Backend base URL (default: `http://localhost:5000`) |

---

## API Documentation (Swagger)

All 12 REST endpoints are documented with JSDoc `@swagger` annotations and served via Swagger UI.

**To open the docs locally:**

1. Start the backend (`npm run dev` from `backend/`)
2. Open **http://localhost:5000/api-docs** in your browser

### Documented endpoints

| Method  | Path                       | Auth required | Description                                |
| ------- | -------------------------- | ------------- | ------------------------------------------ |
| `POST`  | `/auth/register`           | No            | Register a new user                        |
| `POST`  | `/auth/login`              | No            | Login and receive a JWT                    |
| `GET`   | `/auth/me`                 | Bearer        | Get the current authenticated user         |
| `POST`  | `/posts`                   | Bearer        | Create a new post                          |
| `GET`   | `/posts`                   | No            | List posts with ranking and pagination     |
| `GET`   | `/posts/{id}`              | No            | Get a single post with reaction counts     |
| `POST`  | `/posts/{id}/comments`     | Bearer        | Add a comment (or reply) to a post         |
| `GET`   | `/posts/{id}/comments`     | No            | Get the nested comment tree for a post     |
| `POST`  | `/posts/{id}/reactions`    | Bearer        | Like or dislike a post (toggleable)        |
| `POST`  | `/comments/{id}/reactions` | Bearer        | Like or dislike a comment (toggleable)     |
| `GET`   | `/users/{id}`              | No            | Get a user's public profile + recent posts |
| `PATCH` | `/users/me`                | Bearer        | Update the authenticated user's profile    |

Endpoints marked "Bearer" require `Authorization: Bearer <token>` in the request header. Public endpoints that accept an optional token use `optionalAuthMiddleware` to personalize the response (e.g. showing the current user's reaction) without blocking unauthenticated access.

---

## Ranking Formula

Posts on the feed are sorted by a computed engagement score:

```
score = (likes - dislikes) + (commentCount × 2)
```

- Computed entirely inside a MongoDB **aggregation pipeline** at query time — not stored on the document.
- Comments are weighted double (×2) to reward discussion over passive reactions.
- **Tie-break:** posts with equal scores are ordered by `createdAt` descending (newest first).

Example:

- Post A — 0 likes, 0 comments → score **0**
- Post B — 1 like, 0 comments → score **1**
- Post C — 0 likes, 1 comment → score **2** (ranks highest)

---

## Bonus Feature: Infinite Scroll Pagination

The feed (`/`) uses **infinite scroll with offset-based pagination** rather than traditional page-number navigation. An `IntersectionObserver` watches a sentinel element at the bottom of the post list. When it enters the viewport (with a 200px lookahead), the next page (`GET /posts?page=N&limit=10`) is fetched automatically and its results are appended to the existing list. The backend signals when there are no more results via `hasMore: boolean` in the response.

---

## Project Structure

```
DevSocial/
├── backend/
│   ├── src/
│   │   ├── middleware/     # authMiddleware, optionalAuthMiddleware, errorHandler
│   │   ├── models/         # Mongoose schemas: User, Post, Comment, Reaction
│   │   ├── routes/         # authRoutes, postRoutes, reactionRoutes, userRoutes
│   │   ├── utils/          # sendSuccess / sendError response helpers
│   │   ├── swagger.ts      # Swagger/OpenAPI config
│   │   └── server.ts       # Express app entry point
│   ├── .env                # Local env (not committed)
│   └── .env.example        # Template — copy to .env
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios client with auth + unwrap interceptors
│   │   ├── components/     # ReactionButtons, ProtectedRoute
│   │   ├── context/        # AuthContext (user state, login/logout/updateUser)
│   │   ├── pages/          # Feed, PostDetail, Login, Register, Profile, CreatePost
│   │   └── App.tsx         # BrowserRouter + route declarations
│   └── .env.example
├── README.md
└── AI_USAGE.md
```

---

## AI Usage

See [AI_USAGE.md](./AI_USAGE.md) for a detailed record of how AI tools were used during development, including which parts were AI-assisted, what was personally reviewed and rewritten, and specific bugs that were caught and fixed.

---

## Assumptions and Known Limitations

- **JWT stored in `localStorage`** — not in an `httpOnly` cookie. This was chosen for simplicity given the project timeline. In a production app, `httpOnly` cookies would be preferred to reduce XSS exposure.

- **CORS allows all origins** — the backend calls `app.use(cors())` with no origin restriction. For a production deployment, CORS would need to be locked down to the specific frontend domain.

- **No global handling for token expiry mid-session** — JWTs expire after 1 hour. If the token expires while a user is active, they are not automatically logged out or redirected. Protected actions will fail with a 401 error until the user manually logs in again. A production app would intercept 401 responses globally and trigger a logout or token-refresh flow.

- **Reaction toggle has a theoretical race condition** — the like/dislike toggle is not handled atomically (no database-level transaction). Under rapid double-clicks, two concurrent requests could both read the same state and produce an unexpected result. In practice this is imperceptible at normal usage speeds, and it fails safely rather than corrupting data.

- **Comment reply nesting has no depth limit** — deeply nested reply threads will render with increasing indentation, which can degrade readability on narrow screens.

- **Offset-based pagination** — the feed uses `skip/limit` pagination. Under high write volume, posts could shift between pages as new content is inserted (causing potential duplicates or skipped items on scroll). Cursor-based pagination would be more robust at scale.

- **No email verification** — users can register with any syntactically valid email string; it is not verified via a confirmation link.

- **Post and comment data load independently** — the post detail page fetches the post and its comments as separate requests, so a comments-fetch failure surfaces its own error state without taking down the whole page. It does not currently retry automatically.

- **Single environment** — there is no staging or production configuration. All instructions above are for local development only.
