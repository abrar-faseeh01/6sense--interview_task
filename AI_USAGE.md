# AI Usage

## AI-Assisted Development Workflow

I built this with AI coding assistance, but I didn't treat whatever it generated as automatically correct. AI did a lot of the typing; I was still responsible for the decisions — what to build, whether the output was actually right, and what shipped in the end.

### Tools I used

- **Antigravity** — my main coding agent. Used it to inspect the codebase, implement features, and help validate changes as I went.
- **Claude** — build my plans using claude. also used it to get a second, independent opinion when debugging the issue.
- **ChatGPT** — more of a sounding board than a coder. I used it to reason through architecture decisions, sanity-check what the agent had actually done against the real code, spot risks before they became bugs, and get ready for the technical walkthrough.

## How I actually worked with the agents

My loop was basically:

**Define a small task → look at the existing code first → make a scoped change → review it → test it manually → accept it, reject it, or send it back for a fix → move on to the next task.**

A few things I made a point of doing:

- Told the agent to actually look at the current code before touching anything, instead of assuming it knew the state of the project from earlier in the conversation.
- Broke big features (posts, feed, ranking) into smaller pieces so I could review each one on its own instead of reviewing one giant diff at the end.
- Scoped requests tightly — "change this file, do this specific thing" — and told it not to touch anything outside that.
- Had it check the documentation against both the assignment spec and what was actually implemented, rather than letting it write generic boilerplate docs.
- Asked for validation after changes — TypeScript checks, a frontend build, manual testing — not just "does it look right."

Basically, I used AI output as something to verify, not something to trust by default. If an agent told me something worked a certain way and it actually mattered, I went and checked the file myself.

## What I reviewed, rejected, or changed myself

I went through the implementation and the repo pretty thoroughly as it came together. Specifically, I:

- Traced the full auth flow by hand — frontend → Axios client → `Authorization` header → backend middleware → JWT verification → DB lookup → protected route — to make sure it actually held together end to end, not just that each piece looked fine in isolation.
- Went through the post/feed logic, including the aggregation pipeline computing reaction counts, comment counts, and ranking, plus the infinite-scroll behavior on the frontend.
- Reviewed the nested comment/reply structure and how parent-child relationships are represented.
- Checked reactions on both posts and comments — the counts and the "did I already react" state.
- Went through the profile flow for viewing and editing skills/experiences.
- Checked the Swagger docs against the real routes to make sure documented auth requirements actually matched the middleware applied.
- Reviewed the response helpers and error handling for consistency across endpoints.
- Left things alone when the existing implementation already did the job — I didn't rewrite things just to feel productive.

I also leaned on `npx tsc --noEmit` and a full frontend production build repeatedly as a baseline sanity check — not proof of correctness, but a cheap way to catch obvious breakage before doing the manual testing.

## Bugs and bad suggestions I caught

### 1. Hardcoded JWT secret fallback

The auth code originally had something like:

```ts
process.env.JWT_SECRET || "supersecret";
```

That's a real problem for anything auth-related — if the env var ever went missing, the app wouldn't fail, it would just quietly start signing tokens with a public, guessable string. Nobody would notice until it mattered.

I made `JWT_SECRET` required, with a startup check that exits the process if it's missing instead of limping along. Then I re-ran the TypeScript check, tested login and `/auth/me` to confirm auth still worked, and deliberately unset the env var once to confirm the server actually refused to start. This is one of the clearer cases where I didn't just accept what got generated.

### 2. Infinite-scroll never triggering page 2

The feed used an `IntersectionObserver` for infinite scroll. First page loaded fine — but scrolling never pulled in more posts.

Turned out the observer was being set up while the feed was still in its loading state, before the sentinel element existed in the DOM, so `sentinelRef.current` was `null` at setup time. And since `loading` wasn't in the effect's dependency array, the observer never got re-attached once loading finished and the sentinel actually appeared.

The fix was small — add `loading` to the dependency array so the observer sets up after the sentinel exists — but the bug itself was the kind that looks completely fine on a read-through and only shows up when you actually click around.

### 3. Swagger claiming everything needed auth

While checking the generated Swagger docs against the real routes, I noticed a global bearer-auth setting that made every single endpoint look like it required authentication — including ones that are intentionally public, like the feed and post detail.

Fixed the Swagger config so it reflects what the middleware actually does per route, not a blanket assumption. Small thing, but it's exactly the kind of mismatch that would confuse anyone actually trying to use the API docs.

### 4. Post detail page jumping around after commenting

While testing comments and replies, I noticed that adding a comment refreshed the _entire_ post detail view, which remounted content and messed with scroll position — annoying if you're mid-thread and just replied.

Changed it so only the comments section refreshes after a new comment/reply, not the whole page. Tested it manually to confirm it actually felt right, not just that it technically worked.

### 5. Post and comment requests failing together

`PostDetail` fetched the post and its comments using `Promise.all`, so if the comments request failed for any reason, the whole page treated it as a total failure — even though the post itself had loaded fine.

Switched to `Promise.allSettled` so the two requests are handled independently. Now if comments fail, the post still renders normally, and just the comments section shows its own error state instead of taking down the whole page.

### 6. Public endpoints couldn't support optional personalization

Public endpoints (like the feed and post detail) needed to work for both logged-in and anonymous users, but the existing auth middleware just rejected the request outright if no token was present — even though these routes weren't supposed to require login.

Added an `optionalAuthMiddleware` that lets the request continue either way: if a valid token is present, the user gets identified and the response can include personalized data like `userReaction`; if not, the request just continues as anonymous. Protected endpoints were left untouched and still enforce the required auth middleware.

## How I validated things, beyond "it compiles"

Depending on the change, this included:

- Reading the actual source, not just the agent's summary of it.
- `npx tsc --noEmit` and `npm run build` on the frontend.
- Backend startup + MongoDB connection checks.
- Manual auth testing — register, login, session restore, `/auth/me`.
- Manual browser testing of the feed, scrolling, posts, comments/replies, reactions, and profile.
- Cross-checking Swagger against the real route middleware.
- Did a final review pass with Claude to catch anything I might have missed.
- Reviewing `git status` and `git diff --cached --stat` before every commit so I wasn't accidentally shipping unrelated changes.

That last one mattered more than I expected — it's an easy way to catch when an agent quietly touched a file you didn't ask it to.

## What this actually taught me

The main thing: AI can move implementation along fast, but it doesn't replace judgment. It got things wrong in ways that were easy to overlook on a first read (the observer bug especially) and in ways that were obvious once I actually looked at the diff (the JWT fallback).

My working rule ended up being pretty simple:

> AI generates or assists → I read it → I test it → I decide whether it ships as-is, gets fixed, or gets thrown out.

The code, the actual runtime behavior, and the assignment requirements were the source of truth — not whatever explanation the AI gave me for why something worked.
