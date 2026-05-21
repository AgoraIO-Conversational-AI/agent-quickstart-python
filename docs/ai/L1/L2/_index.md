# Deep Dives Index

| Document                                              | Summary                                                                          | Load When                                                          |
| ----------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [managed_agent_config.md](managed_agent_config.md)    | Full `server/src/agent.py` chain: vendors, VAD, async session options             | Changing prompt / VAD / model / voice or wiring a BYOK vendor      |
| [session_lifecycle.md](session_lifecycle.md)          | Browser orchestration of `getConfig` + `startAgent`, RTC + RTM, token renewal     | Touching client-side join, renewal, or mid-call control            |
| [verification_scripts.md](verification_scripts.md)    | What each `web/scripts/*.ts` harness asserts and how to extend it                 | Adding a route, changing the proxy boundary, or debugging `verify` |
