<p align="center">
  <h1 align="center">imprfct Log</h1>
</p>

<p align="center">
  Ship-only devlog platform. Commit publicly. Build in the open. Ship.
</p>

<p align="center">
  <a href="https://log.imprfct.dev">Website</a>
  ·
  <a href="https://github.com/imprfct-code/log/issues">Issues</a>
</p>

<p align="center">
  <a href="https://github.com/imprfct-code/log/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License"></a>
  <a href="https://github.com/imprfct-code/log"><img src="https://img.shields.io/github/stars/imprfct-code/log?style=social" alt="GitHub Stars"></a>
</p>

## About

People have all the tools to build — AI, frameworks, tutorials — but the gap between "I have an idea" and "I shipped it" kills 90% of projects. The inner critic says "not worth it" before the first line of code.

**Log** is a platform where you publicly commit to building something, document the journey through auto-pulled git commits, and ship the result.

## How It Works

**Commit** — Write one sentence: "I'm building \_\_\_". It's public. The timer starts. Connect a GitHub repo.

**Devlog** — Git commits automatically appear as your devlog. Optionally add short posts: a sentence, a screenshot, a thought. Zero friction, infinite ceiling.

**Ship** — Attach a live URL or demo. Timer stops: "Shipped in 12 days". People give Respect.

## Core Mechanics

- **Respect** — the only social action. One per ship.
- **Profile** — auto-generated from activity. Ships + open commitments + devlog.
- **Feed** — active commitments, devlog updates, ships.
- **Timer** — counts days from commit to ship.

## Tech Stack

- [React 19](https://react.dev/) — UI
- [TypeScript](https://www.typescriptlang.org/) — strict mode
- [Convex](https://convex.dev/) — backend, database, realtime, crons
- [Clerk](https://clerk.com/) — auth (GitHub OAuth)
- [Vite+](https://viteplus.dev/) — toolchain (`vp` CLI)
- [Vercel](https://vercel.com/) — frontend deploy
- pnpm workspaces — monorepo

## Getting Started

```bash
# Clone the repo
git clone https://github.com/imprfct-code/log.git
cd log

# Install dependencies
vp install

# Start the dev server
vp run dev
```

## Project Structure

```
convex/              # Backend — schema, queries, mutations, crons
apps/web/            # React web app
  src/app/           # App shell, routing
  src/components/    # UI components
  src/lib/           # Utilities, providers
packages/utils/      # Shared utilities
```

## Contributing

Contributions are welcome. Check out the [open issues](https://github.com/imprfct-code/log/issues) for a good starting point.

## License

[GPL-3.0](LICENSE)

---

<p align="center">
  <i>it matters before it's perfect.</i>
</p>
