# Claude AI Assistant Guidelines

Use [AGENTS.md](./AGENTS.md) as the source of truth for this module.

The only Claude-specific note here is that `web` supports two valid runtime shapes:

- local development, where Next `/api/*` handlers proxy to FastAPI through `AGENT_BACKEND_URL`
- deployment, where those same route handlers run in-process

Before describing the request flow or verification steps, check `AGENTS.md` and the repo-root [README.md](../README.md).
