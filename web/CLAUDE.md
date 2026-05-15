# Claude AI Assistant Guidelines

Use [AGENTS.md](./AGENTS.md) as the source of truth for this module.

The only Claude-specific note here is that `web` keeps `/api/*` as browser-facing URLs, but Next rewrites those requests to FastAPI through `AGENT_BACKEND_URL` in both local development and deployment.

Before describing the request flow or verification steps, check `AGENTS.md` and the repo-root [README.md](../README.md).
