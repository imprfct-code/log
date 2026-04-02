# AGENTS.md

## Architecture Principles

- No god files. One component = one file. One Convex function = one domain file.
- Colocation over separation: keep related code together (component + its styles + its tests).
- No premature abstractions. Three similar lines > a shared helper used once.
- Flat over nested. Avoid deep directory hierarchies — prefer `components/CommitCard.tsx` over `components/cards/commit/CommitCard/index.tsx`.

## Component Design

- Small, focused components. If a component does more than one thing — split it.
- Props over context for local data. Context/providers only for truly global state (auth, theme).
- No barrel files (`index.ts` re-exports). Import directly from the source file.
- Name files by what they export: `CommitCard.tsx`, `useCommitments.ts`, `formatDate.ts`.

## Convex Patterns

- One file per domain in `convex/`: `commitments.ts`, `devlog.ts`, `ships.ts`.
- Keep queries and mutations lean — business logic in helper functions, not inline.
- Always validate arguments with Convex validators. Never trust client data.
- Scheduled functions for external API calls (GitHub polling). No external services.

## Code Quality

- TypeScript strict. No `any`, no `@ts-ignore`, no `as` casts unless truly unavoidable.
- Explicit over implicit. Name things clearly, avoid abbreviations.
- Delete dead code. Don't comment it out, don't leave TODOs for "later".
- Error handling only at boundaries (user input, API responses). Don't defensively code internal logic.

## Boundaries

**Ask first:**

- Adding new dependencies
- Changing Convex schema
- Modifying auth flow

**Never:**

- God files or mega-components (>300 lines is a smell)
- `convex/_generated/` — auto-generated, hands off
- Secrets or `.env.local` in commits
