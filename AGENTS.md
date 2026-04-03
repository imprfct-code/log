# AGENTS.md

## About Log

Log — ship-only devlog platform by imprfct. People publicly commit to building something, document the journey through auto-pulled git commits, and ship the result. Core loop: Commit → Devlog → Ship. For indie hackers and builders who struggle with the gap between "I have an idea" and "I shipped it".

## Tech Stack

- React 19 + TypeScript (strict) — SPA, not Next.js. No server components.
- Convex — backend, database, realtime, crons
- Clerk — auth (GitHub OAuth)
- Vite+ — toolchain (`vp` CLI, never `pnpm` for dev commands)
- Vercel — frontend deploy
- pnpm workspaces — monorepo

## Commands

- `vp run dev` — start dev server (at monorepo root, not `vp dev`)
- `vp run -r build` — build all packages
- `vp lint` — lint
- `vp fmt` — format
- `vp fmt --check` — check formatting
- `vp run -r typecheck` — type check
- `vp check` — lint + fmt + typecheck
- `pnpm ready` — full pre-push check (fmt + lint + test + build)

## Project Structure

```
convex/              # Backend — schema, queries, mutations, crons
apps/web/            # React SPA
  src/app/           # App shell, routing
  src/components/    # UI components
  src/lib/           # Utilities, providers
packages/utils/      # Shared utilities
```

## Formatting

oxfmt: double quotes, 2-space indent, 100 char width, trailing commas.

## Philosophy

- Minimal code. Don't over-engineer.
- Ship fast, iterate. No premature abstractions.
- Three similar lines > a shared helper used once.
- If it works and is readable, it's done.

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

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->
