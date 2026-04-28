# Architecture

## 1. Tech Stack & Project Scope

- Project type: Single repo
- Frontend framework: React
- Language: TypeScript
- Build tool: Vite (recommended for React + bun)
- UI/Styling: Tailwind CSS
- State management: Zustand
- Data fetching & caching: React Query
- SSR/Isomorphic: None

## 2. Package Management & Toolchain

- Runtime: Bun (latest stable)
- Package manager: bun
- Lint/Format: Biome
- Testing: Vitest
- CI/CD: GitHub Actions
- Code generation: None

## 3. Runtime & Environment

- Environment variables: `.env` files
- Required variables:
  - `VITE_AGORA_APP_ID` - Agora App ID
  - `VITE_AGORA_TOKEN` - Agora Token (optional for testing)
- Local/Test/Prod differences: Environment-specific `.env` files
- Entry point: `src/main.tsx`
- Default port: 5173 (Vite default)
- Secrets handling: Never commit `.env` files, use `.env.example` as template

## 4. Dependencies & External Services

- Backend services:
  - Agora RTC SDK - Real-time communication
  - Agora Conversational AI - Voice/text conversation
- Private dependencies: None
- Third-party services:
  - Agora (authentication via App ID/Token)

## 5. Module Responsibilities & Directory Structure

```
src/
├── components/     # Reusable UI components
├── hooks/          # Custom React hooks
├── stores/         # Zustand stores
├── services/       # API and Agora service wrappers
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── pages/          # Page components (if using routing)
├── App.tsx         # Root component
└── main.tsx        # Entry point
```

## 6. Data Flow & Routing

- Routing: React Router (if needed) or single-page
- Data flow:
  1. User action triggers hook/component
  2. React Query manages server state
  3. Zustand manages client state
  4. Components re-render on state change
- Error handling: React Query error boundaries + toast notifications
- Loading states: React Query loading states + skeleton components

## 7. Build & Deployment

- Build command: `bun run build`
- Output: `dist/`
- Deployment target: Static hosting (Vercel, Netlify, etc.)
- Version strategy: Semantic versioning
- Rollback: Redeploy previous version

## 8. Constraints & Known Issues

- Known constraints:
  - Agora SDK requires HTTPS in production
  - WebRTC requires user permission for microphone/camera
- Known pitfalls:
  - Token expiration handling
  - Network reconnection logic
- Behaviors that must not break:
  - Real-time audio/video streaming
  - Conversation state persistence

## 9. Update Log

- 2026-01-21: Initial architecture document created
