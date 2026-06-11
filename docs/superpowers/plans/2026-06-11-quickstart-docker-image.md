# Quickstart Server-Only Docker Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single-stage, non-root Docker image for the FastAPI `server/` backend plus a GitHub Actions workflow that builds + smoke-tests it on every push/PR and publishes to GHCR on `v*` tags.

**Architecture:** One `python:3.12-slim-bookworm` stage installs `server/requirements.txt`, copies `server/src`, drops to a non-root user, and runs `python server.py` (which reads `$PORT`, default 8000, binds `0.0.0.0`). No web frontend, no `llm/`, no `next.config.ts` change. The CI workflow mirrors the custom-llm `docker.yml` but smoke-probes only `:8000/get_config`.

**Tech Stack:** Docker (single-stage), GitHub Actions (`docker/build-push-action`, `docker/metadata-action`), GHCR.

**Spec:** `docs/superpowers/specs/2026-06-11-quickstart-docker-image-design.md`

**Repo & branch:** `agent-quickstart-python` (`/Users/zhangqianze/Documents/agent-quickstart-python`), branch `ci/docker-image` (already created off `main`; the spec + grilled spec are committed there).

---

## Conventions

- Conventional Commits, lowercase after prefix, present tense. **No AI attribution / no `Co-Authored-By`. No `--no-verify`. No git config changes.** If a commit fails on git identity, prefix with `git -c user.email="qianze.zhang@hotmail.com"`.
- This is infrastructure: the "tests" are a local `docker build` + container smoke and dependency-free `grep` validations. A failure is a real finding — surface it, don't weaken the check.
- Requires a working Docker daemon for the local build/smoke steps. If Docker is unavailable in the execution environment, complete the file creation + `grep` validations and report DONE_WITH_CONCERNS noting the local build was deferred to CI (the CI `docker` job is the authoritative gate).

---

## Task 1: Dockerfile + .dockerignore (build + local smoke)

**Files:**
- Create: `Dockerfile`, `.dockerignore`

- [ ] **Step 1: Create `.dockerignore`**

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

- [ ] **Step 2: Create `Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.12-slim-bookworm AS runtime

# Run as a non-root user (created before any COPY so --chown can reference it).
RUN useradd --create-home --uid 10001 app
WORKDIR /app

# Python dependencies for the FastAPI backend (installed as root into the
# system site-packages, world-readable for the app user at runtime).
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

- [ ] **Step 3: Build the image**

Run:
```bash
cd /Users/zhangqianze/Documents/agent-quickstart-python
docker build -t qs-server:test .
```
Expected: build succeeds; final stage installs fastapi/uvicorn/agora-agents and copies `server/src`. (No web/Node layers, so no type-check OOM risk.)

- [ ] **Step 4: Smoke the container locally**

Run:
```bash
docker rm -f qs-smoke 2>/dev/null || true
docker run -d --name qs-smoke -p 8000:8000 \
  -e AGORA_APP_ID=0123456789abcdef0123456789abcdef \
  -e AGORA_APP_CERTIFICATE=fedcba9876543210fedcba9876543210 \
  qs-server:test
# poll up to ~40s
for i in $(seq 1 40); do curl -fsS http://localhost:8000/get_config -o /tmp/qs_cfg.json && break; sleep 1; done
cat /tmp/qs_cfg.json; echo
docker rm -f qs-smoke
```
Expected: `/get_config` returns a JSON envelope `{"code":0,"msg":"success","data":{...}}` with a non-empty `token`. (Token007 is generated offline from the fake 32-hex creds — no Agora cloud call.) If the container exits or `/get_config` never responds, run `docker logs qs-smoke` and report it — a real finding.

- [ ] **Step 5: Confirm the process runs as non-root**

Run:
```bash
docker run --rm --entrypoint sh qs-server:test -c "id -un"
```
Expected: `app` (not `root`).

- [ ] **Step 6: Commit**

```bash
cd /Users/zhangqianze/Documents/agent-quickstart-python
git add Dockerfile .dockerignore
git commit -m "build: add non-root server-only docker image"
```

---

## Task 2: CI workflow (`.github/workflows/docker.yml`)

**Files:**
- Create: `.github/workflows/docker.yml`

- [ ] **Step 1: Create `.github/workflows/docker.yml`**

```yaml
name: docker

on:
  push:
    branches: ["**"]
    tags: ["v*"]
  pull_request:
  workflow_call:

permissions:
  contents: read
  packages: write

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=sha
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=raw,value=latest,enable=${{ startsWith(github.ref, 'refs/tags/') }}

      - name: Build (load locally, no push)
        uses: docker/build-push-action@v6
        with:
          context: .
          platforms: linux/amd64
          load: true
          push: false
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Smoke test
        run: |
          IMAGE=$(printf '%s\n' "${{ steps.meta.outputs.tags }}" | head -n1)
          echo "Smoke-testing $IMAGE"
          docker run -d --name smoke -p 8000:8000 \
            -e AGORA_APP_ID=0123456789abcdef0123456789abcdef \
            -e AGORA_APP_CERTIFICATE=fedcba9876543210fedcba9876543210 \
            "$IMAGE"
          set +e
          fail=0
          for url in http://localhost:8000/get_config; do
            ok=""
            for i in $(seq 1 40); do
              if curl -fsS "$url" -o /dev/null; then ok=1; echo "OK   $url"; break; fi
              sleep 1
            done
            if [ -z "$ok" ]; then echo "FAIL $url"; fail=1; fi
          done
          if [ "$fail" -ne 0 ]; then docker logs smoke; fi
          docker rm -f smoke
          exit $fail

      - name: Log in to GHCR
        if: startsWith(github.ref, 'refs/tags/')
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Push tags
        if: startsWith(github.ref, 'refs/tags/')
        run: |
          printf '%s\n' "${{ steps.meta.outputs.tags }}" | while read -r tag; do
            [ -n "$tag" ] && docker push "$tag"
          done
```

- [ ] **Step 2: Structural validation**

Run:
```bash
cd /Users/zhangqianze/Documents/agent-quickstart-python
grep -nE "name: docker|workflow_call:|platforms: linux/amd64|-p 8000:8000|/get_config|startsWith\(github.ref, 'refs/tags/'\)" .github/workflows/docker.yml
grep -nP "\t" .github/workflows/docker.yml && echo "HAS TABS (bad)" || echo "no tabs"
grep -c ":3000\|8001" .github/workflows/docker.yml
```
Expected: the matched lines print; `no tabs`; the last `grep -c` prints `0` (no web/llm ports leaked in from the custom-llm source).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/docker.yml
git commit -m "ci: build + smoke-test the docker image, push to GHCR on tags"
```

---

## Task 3: No-regression check + push + PR

**Files:** none (git only).

- [ ] **Step 1: Confirm no app/web files changed**

Run:
```bash
cd /Users/zhangqianze/Documents/agent-quickstart-python
git diff --name-only main...ci/docker-image
```
Expected: only `Dockerfile`, `.dockerignore`, `.github/workflows/docker.yml`, and the two `docs/superpowers/...docker...` files. **No** `web/`, `server/src/`, `package.json`, or `next.config.ts` changes.

- [ ] **Step 2: Push**

```bash
git push -u origin ci/docker-image
```

- [ ] **Step 3: Open the PR** (REST — the GraphQL `gh pr create` path 401s under the lapsed SSO session)

```bash
REPO=AgoraIO-Conversational-AI/agent-quickstart-python
gh api -X POST "repos/$REPO/pulls" \
  -f title="ci: add server-only docker image + workflow" \
  -f head="ci/docker-image" -f base="main" \
  -f body="Adds a single-stage, non-root python:3.12-slim Docker image for the FastAPI server/ backend, plus a docker workflow that builds and smoke-tests it (probe :8000/get_config with fake AGORA creds) on every push/PR and publishes to GHCR on v* tags. Server-only: no web frontend, no llm/, no next.config.ts change. amd64-only (the load+smoke path needs single arch). (Sub-project 2 of 3; nightly follows and reuses this via workflow_call.)" \
  --jq '{number, url: .html_url, state}'
```
Expected: JSON with the new PR number + URL.

---

## Self-Review notes (for the implementer)

- **No web in the image** — if a step references `web/`, `next.config.ts`, `bun`, or port `3000`/`8001`, it's wrong; this image is server-only.
- **Smoke probe is `/get_config`**, not `/health` (the backend has no `/health`). It doubles as a token-generation check and needs the two fake `AGORA_*` envs.
- **Non-root** — `pip install` is root, `USER app` precedes `CMD`; the `id -un` check must print `app`.
- **`workflow_call:` is intentionally present** in this *new* `docker.yml` so sub-project 3 (nightly) can reuse it with no edit. (The quickstart `ci.yml` from sub-project 1 does not yet have `workflow_call`; the nightly cycle adds it there.)
- **Docker may be unavailable** in the sandbox — if so, do the file + grep work, report the deferred local build clearly, and let CI be the gate. Do not fake a green smoke.
```
