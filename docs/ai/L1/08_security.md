# 08 Security

> Trust boundaries, secret handling, and security-relevant invariants for the two-process Python quickstart.

## Trust Model

- The browser is untrusted. It may only see Agora tokens issued by the FastAPI server.
- The FastAPI server is the only process that holds `AGORA_APP_CERTIFICATE` and any future BYOK keys.
- The Next.js process sees `AGENT_BACKEND_URL` (a server-side build env var) but does not see any Agora secret.
- The FastAPI server has no per-user authentication today; the threat model assumes the backend URL is gated upstream.

## Environment Variable Boundaries

| Boundary       | Variables                                                              |
| -------------- | ---------------------------------------------------------------------- |
| Browser        | `NEXT_PUBLIC_AGENT_UID` (optional)                                     |
| Next build/run | `AGENT_BACKEND_URL`                                                    |
| FastAPI        | `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`, `AGENT_GREETING`, `PORT`      |

Mark `AGORA_APP_CERTIFICATE` as a sensitive secret in whichever host runs the Python service. The certificate value never appears in `web/`.

## Token Issuance

- `server.py` `get_config` calls `generate_convo_ai_token(GenerateConvoAITokenOptions(..., token_expire=3600))`.
- The same token grants RTC and RTM privileges; missing, zero, and negative UIDs are replaced with a generated UID before minting so RTM can log in with the token subject.
- Sessions also carry `expires_in=3600` in `create_async_session`, so an idle session aligns with token expiry.

## Token Renewal

- The client listens for `token-privilege-will-expire` on the RTC engine.
- It calls `getConfig()` twice (RTC UID + stored UID) and renews each client.
- If renewal fails, the next failure surfaces through `MESSAGE_ERROR` on RTM or RTC disconnect events.

## CORS

`server/src/server.py` uses:

- `allow_origins=["*"]`
- `allow_credentials=True`
- `allow_methods=["*"]`
- `allow_headers=["*"]`

This is suitable for a local-only quickstart. For a public deploy:

1. Restrict `allow_origins` to your deployed client origin(s).
2. Consider whether `allow_credentials: True` is needed; if not, drop it.
3. Front the FastAPI service with a reverse proxy that enforces its own CORS policy if you need defense in depth.

## Authentication

- No bearer-token or API-key middleware on FastAPI routes.
- No auth in the Next.js rewrites; the browser hits the rewrite directly.
- Anyone with the deployed web URL can start an agent session.

If you need real auth, add a FastAPI dependency that validates a header on each route. Update `web/src/services/api.ts` and `verify-api-contracts.ts` to send and assert the header.

## Input Validation

- pydantic `StartAgentRequest` / `StopAgentRequest` validate body shape automatically.
- Cross-field validation lives in `Agent.start` / `Agent.stop` — they raise `ValueError` on bad input, which `_to_http_error` maps to `400`.
- `RuntimeError` is mapped to `500`.

## Secret Handling Rules

- `server/.env.local` is the developer's secret store; do not commit it.
- `server/.env.example` documents shape only — never put real values there.
- `load_dotenv` reads `server/.env.local` then `server/.env` using a path derived from `server/src/server.py`; missing credentials fail startup initialization and leave routes returning `500`.
- Do not log full env. `logger.error("failed: %s", err)` is fine; `logger.error(os.environ)` is not.

## CSP / Security Headers

- No CSP or HSTS headers are set on FastAPI responses today.
- No security headers are configured in `web/next.config.ts`.
- Add them at the reverse-proxy layer if you put one in front of FastAPI.

## Known Limitations

- No rate limiting on `/get_config`, `/startAgent`, `/stopAgent`. A determined client can rapidly issue tokens — bound this upstream if exposed publicly.
- `server/scripts/run_fake_server.py` accepts the same routes with no validation. Do not deploy it.
- The web client does not encrypt or sign the browser → Next → FastAPI path beyond TLS at the host level.

## Related Deep Dives

- [Managed Agent Config](L2/managed_agent_config.md) — Where to plug BYOK vendor keys.
