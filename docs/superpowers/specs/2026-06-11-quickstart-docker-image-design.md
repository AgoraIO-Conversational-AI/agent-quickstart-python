# agent-quickstart-python — Server-Only Docker Image Design

**Date:** 2026-06-11
**Status:** Approved
**Repo:** `agent-quickstart-python`
**Branch:** `ci/docker-image` off `main`
**Relation:** Sub-project 2 of 3 (test suite → **Docker image** → nightly). Ported from the
`recipe-agent-custom-llm` Docker work, but deliberately reduced to a **server-only** image.

## Goal

Add a Docker image for the FastAPI backend plus a GitHub Actions workflow that builds and
smoke-tests it on every push/PR and publishes it to GHCR on `v*` tags. The image contains
**only** the Python `server/` backend — no web frontend, no `llm/` (this repo has none).

## Why server-only (the key decision)

The combined web+server image considered first would have required bundling the Next.js
frontend, which in turn requires Next's `output: 'standalone'` packaging mode and a
production-code change to `web/next.config.ts`. Dropping the web frontend from the image
removes that requirement entirely:

- No bun/Next build stage.
- No `output: 'standalone'`, no `DOCKER_BUILD` type-check seam — `web/next.config.ts` is
  **untouched**.
- No Node in the runtime — the base image is a single `python:3.12-slim-bookworm`.
- One process (the FastAPI server), so no `entrypoint.sh` / `wait -n` juggling — a plain
  `CMD`.

The frontend still runs the normal way (`bun run dev`, or a Next deploy); it is simply not
part of this container image. The image is a deploy-shaped artifact for the backend half.

## Locked decisions (grill 2026-06-11)

1. **Server-only image** — no web frontend, so no `web/next.config.ts` change.
2. **amd64-only** (`platforms: linux/amd64`) — the `load: true` smoke path requires a single
   arch; arm64 users run under emulation. No multi-arch push.
3. **Non-root `USER app`** — strictly better default for a fresh image; a few extra Dockerfile
   lines, no runtime cost.
4. **Keep GHCR tag-push** — build+smoke on every push/PR, publish only on `v*` tags. The image
   is undocumented (CI-only) but still produced on releases.
5. **CI-only, no docs** — no README / `docs/ai/` changes; therefore no L0 `Last Reviewed` bump.

## Layout

```
Dockerfile                    # single-stage python:3.12-slim, server only
.dockerignore                 # exclude venv, caches, env, tests, docs, git, markdown
.github/workflows/docker.yml  # build -> smoke (:8000) -> push to GHCR on v* tags
```

No changes to `web/`, `server/src/`, or any docs (CI-only, per the locked decision).

## Components

### `Dockerfile` (single stage)

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.12-slim-bookworm AS runtime

# Run as a non-root user (created before any COPY so --chown can reference it).
RUN useradd --create-home --uid 10001 app
WORKDIR /app

# Python dependencies for the FastAPI backend (installed as root into the
# system site-packages, which is world-readable for the app user at runtime).
COPY server/requirements.txt /tmp/server-req.txt
RUN pip install --no-cache-dir -r /tmp/server-req.txt

# Backend source, owned by the runtime user.
COPY --chown=app:app server/src /app/server/src

# Drop privileges for the running process.
USER app

# server.py reads $PORT (default 8000) and binds 0.0.0.0.
EXPOSE 8000
CMD ["python", "/app/server/src/server.py"]
```

Notes:
- `server/src/server.py` already ends with `uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT","8000")))`,
  so the `CMD` needs no wrapper. Binding `0.0.0.0` is what makes the mapped port reachable.
- `python:3.12-slim-bookworm` is within the documented floor (≥ 3.10); the app is
  version-agnostic across 3.10–3.13, so a stable slim base is all that matters here.
- **Non-root:** `pip install` runs as root (writes to `/usr/local`, world-readable), then
  `USER app` drops privileges before `CMD`. Ports 8000 (> 1024) need no privilege, so the
  unprivileged user binds fine.

### `.dockerignore`

```
**/venv
**/node_modules
**/__pycache__
*.env.local
**/.env.local
**/tests
docs/
.github/
.git/
*.md
```

(Same generic content as the custom-llm source; `web/.next` is dropped since web is not in
the build context that matters, but keeping a superset is harmless. We keep the list minimal
and backend-relevant.)

### `.github/workflows/docker.yml`

Triggers: `push` (all branches + `v*` tags), `pull_request`, and `workflow_call` (so the
later nightly sub-project can reuse it without edits). Permissions: `contents: read`,
`packages: write`.

One `docker` job on `ubuntu-latest`:
1. `actions/checkout@v4`
2. `docker/setup-buildx-action@v3`
3. `docker/metadata-action@v5` → tags: `type=sha`, `type=ref,event=pr`,
   `type=semver,pattern={{version}}`, `type=semver,pattern={{major}}.{{minor}}`,
   `type=raw,value=latest,enable=${{ startsWith(github.ref,'refs/tags/') }}`,
   images `ghcr.io/${{ github.repository }}`.
4. `docker/build-push-action@v6` with `context: .`, `platforms: linux/amd64`, `load: true`,
   `push: false`, `cache-from/to: type=gha`.
5. **Smoke test** — run the image with fake creds, poll until ready, fail on any miss:
   ```bash
   IMAGE=$(printf '%s\n' "${{ steps.meta.outputs.tags }}" | head -n1)
   docker run -d --name smoke -p 8000:8000 \
     -e AGORA_APP_ID=0123456789abcdef0123456789abcdef \
     -e AGORA_APP_CERTIFICATE=fedcba9876543210fedcba9876543210 \
     "$IMAGE"
   # poll http://localhost:8000/get_config (up to ~40s); print docker logs on failure
   docker rm -f smoke
   ```
   `/get_config` is the right probe: it exercises real Token007 generation from the fake
   32-hex creds (no Agora cloud call), proving the app booted and the route works.
6. **Log in to GHCR** + **Push tags** — both gated on `startsWith(github.ref,'refs/tags/')`,
   using `docker/login-action@v3` with `secrets.GITHUB_TOKEN`.

## Out of scope

- No web frontend in the image; no `web/next.config.ts` change.
- No README / `docs/ai/` changes (CI-only). Because `docs/ai/` is untouched, **no L0
  `Last Reviewed` bump** is needed.
- No `nightly.yml` (sub-project 3). The `workflow_call:` trigger is included now so the
  nightly can call this workflow later with no edit.

## Verification

- **Local:** `docker build -t qs-server .` then run with the two fake AGORA envs and
  `curl -fsS localhost:8000/get_config` returns a JSON envelope with a non-empty token.
- **No regression:** `bun run verify` / `verify:local` unaffected (no app or web changes).
- **CI:** the `docker` job is green on the PR (build + smoke); push steps are skipped on a
  branch (only run on `v*` tags).

## Risks / Notes

- **`server.py` as a script:** the `CMD` runs `python /app/server/src/server.py`, relying on
  the module's `__main__` uvicorn launch. Verified present at `server/src/server.py:200-204`.
- **No `/health` route:** unlike the custom-llm `llm/` service, the backend has no `/health`;
  `/get_config` is the liveness probe and additionally validates token generation.
- **Image size:** slim Python base + one `pip install`, no Node/bun layers — small.
- **Next cycle:** sub-project 3 (nightly) adds `.github/workflows/nightly.yml` calling
  `ci.yml` + `docker.yml` on a daily schedule; this spec's `workflow_call:` trigger is the
  seam it will use.
```
