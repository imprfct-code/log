export type Comment = {
  user: string;
  text: string;
  time: string;
};

export type DevlogEntry = {
  type: "commit" | "post";
  text: string;
  body?: string;
  image?: string;
  time: string;
  hash?: string;
  comments: number;
  commentData?: Comment[];
};

export type Commitment = {
  id: number;
  user: string;
  avatar: string;
  text: string;
  repo: string;
  day: number;
  comments: number;
  devlog: DevlogEntry[];
  respects: number;
  status: "building" | "shipped";
  shipUrl?: string;
  shippedIn?: string;
  daysAgo: number;
  commentData: Comment[];
  activity: number[];
};

export const commitments: Commitment[] = [
  {
    id: 1,
    user: "maksim",
    avatar: "M",
    text: "a ship-only devlog platform",
    repo: "imprfct-code/log",
    day: 12,
    comments: 3,
    devlog: [
      {
        type: "commit",
        text: "feat: add commitment creation flow",
        time: "2h ago",
        hash: "a3f1c2d",
        comments: 1,
        commentData: [
          {
            user: "kai",
            text: "Nice progress! How are you handling the realtime updates?",
            time: "1h ago",
          },
        ],
      },
      {
        type: "post",
        text: "Day 12: feed is alive. Ship flow next.",
        body: "Got the feed rendering with real mock data. Each commitment shows as a timeline with commits auto-pulled from GitHub. Tomorrow I'm tackling the ship flow \u2014 the moment you mark something as done and it becomes a permanent record. The whole point of this thing is that shipping is the only metric that matters.",
        image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=300&fit=crop",
        time: "5h ago",
        comments: 2,
        commentData: [
          {
            user: "maksim",
            text: "Convex handles it \u2014 subscriptions out of the box.",
            time: "4h ago",
          },
          {
            user: "danielle",
            text: "Love the timeline idea. Following this closely.",
            time: "3h ago",
          },
        ],
      },
      {
        type: "commit",
        text: "fix: clerk auth redirect loop",
        time: "1d ago",
        hash: "e7b4a1f",
        comments: 0,
      },
      {
        type: "commit",
        text: "refactor: extract DevlogEntry component",
        time: "1d ago",
        hash: "2c9f0e3",
        comments: 0,
      },
      {
        type: "commit",
        text: "init: project scaffolding with Vite",
        time: "2d ago",
        hash: "f0a1b2c",
        comments: 0,
      },
      {
        type: "post",
        text: "Day 1: starting from scratch",
        body: "Setting up the monorepo, picking the stack. Going with Convex for the backend because I want real-time out of the box. React + Tailwind for the frontend. Let's see how far I get.",
        time: "2d ago",
        comments: 1,
        commentData: [
          {
            user: "kai",
            text: "What made you pick Convex over Supabase?",
            time: "2d ago",
          },
        ],
      },
    ],
    respects: 0,
    status: "building",
    daysAgo: 0,
    commentData: [
      {
        user: "kai",
        text: "Nice progress! How are you handling the realtime updates?",
        time: "3h ago",
      },
      {
        user: "maksim",
        text: "Convex handles it \u2014 subscriptions out of the box.",
        time: "2h ago",
      },
      {
        user: "danielle",
        text: "Love the timeline idea. Following this closely.",
        time: "1h ago",
      },
    ],
    activity: [0, 1, 2, 0, 3, 1, 2],
  },
  {
    id: 8,
    user: "mira",
    avatar: "Mi",
    text: "a podcast transcriber with speaker diarization",
    repo: "mira-ai/podscript",
    day: 15,
    comments: 4,
    devlog: [
      {
        type: "commit",
        text: "feat: whisper integration with chunked processing",
        time: "1h ago",
        hash: "c3d4e5f",
        comments: 0,
      },
      {
        type: "post",
        text: "Day 15: speaker detection finally works",
        body: "After a week of fighting with pyannote, I finally got speaker diarization working reliably. The trick was preprocessing audio to 16kHz mono before passing it through. Accuracy jumped from ~60% to ~92%.",
        image: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&h=300&fit=crop",
        time: "4h ago",
        comments: 2,
      },
      {
        type: "commit",
        text: "fix: memory leak in audio chunking pipeline",
        time: "8h ago",
        hash: "a1b2c3d",
        comments: 1,
      },
      {
        type: "commit",
        text: "add export to SRT and VTT formats",
        time: "1d ago",
        hash: "e5f6a7b",
        comments: 1,
      },
    ],
    respects: 0,
    status: "building",
    daysAgo: 0,
    commentData: [
      {
        user: "alex",
        text: "Have you tried faster-whisper? Massive speedup on CPU.",
        time: "3h ago",
      },
      {
        user: "mira",
        text: "Not yet \u2014 will try this weekend. Thanks for the tip!",
        time: "2h ago",
      },
      {
        user: "priya",
        text: "Would love to use this for my conference talk recordings.",
        time: "1h ago",
      },
      { user: "kai", text: "Following \u2014 this is exactly what I need.", time: "30m ago" },
    ],
    activity: [2, 1, 3, 2, 1, 4, 1],
  },
  {
    id: 2,
    user: "danielle",
    avatar: "D",
    text: "an AI recipe generator",
    repo: "dani/recipe-ai",
    day: 7,
    comments: 1,
    devlog: [
      {
        type: "commit",
        text: "add OpenAI integration for recipe parsing",
        time: "3h ago",
        hash: "f1a2b3c",
        comments: 0,
      },
      {
        type: "post",
        text: "Day 7: stuck on deploy. Vercel keeps timing out.",
        body: "Spent 4 hours debugging why my serverless function times out at 10s. Turns out the OpenAI call takes ~12s for complex recipes. Going to try streaming the response instead of waiting for the full completion. If anyone has dealt with this before \u2014 would love tips.",
        time: "8h ago",
        comments: 1,
      },
    ],
    respects: 0,
    status: "building",
    daysAgo: 0,
    commentData: [
      {
        user: "priya",
        text: "Try streaming with the AI SDK \u2014 it handles the timeout issue elegantly.",
        time: "6h ago",
      },
    ],
    activity: [1, 0, 0, 2, 1, 0, 1],
  },
  {
    id: 5,
    user: "alex",
    avatar: "A",
    text: "a real-time multiplayer chess engine",
    repo: "alexc/chess-ws",
    day: 4,
    comments: 2,
    devlog: [
      {
        type: "commit",
        text: "feat: websocket game room logic",
        time: "1h ago",
        hash: "9a8b7c6",
        comments: 1,
      },
      {
        type: "post",
        text: "Day 4: got basic move validation working. Castling is pain.",
        body: "En passant was surprisingly simple, but castling has so many edge cases \u2014 can't castle through check, can't castle if the king has moved, can't castle if the rook has moved. Writing tests for all of this. Might open source the validation engine as a separate package.",
        time: "6h ago",
        comments: 1,
      },
      {
        type: "commit",
        text: "add board state serialization",
        time: "1d ago",
        hash: "d5e6f7a",
        comments: 0,
      },
    ],
    respects: 0,
    status: "building",
    daysAgo: 0,
    commentData: [
      {
        user: "kai",
        text: "chess.js handles all the validation if you don't want to reinvent it",
        time: "5h ago",
      },
      {
        user: "alex",
        text: "I know, but writing it myself is the whole point :)",
        time: "4h ago",
      },
    ],
    activity: [0, 0, 1, 1, 2, 0, 1],
  },
  {
    id: 4,
    user: "priya",
    avatar: "P",
    text: "a markdown-to-slides CLI",
    repo: "priya-sh/slideck",
    day: 31,
    comments: 8,
    devlog: [
      {
        type: "post",
        text: "Launched on HN, 45 upvotes!",
        body: "Posted slideck on Show HN this morning. Got some great feedback \u2014 someone suggested adding speaker notes support which I hadn't thought of. Also got a PR from a stranger adding Mermaid diagram support. The open source thing is real.",
        time: "1d ago",
        comments: 4,
      },
      {
        type: "commit",
        text: "v2.0 with theme support",
        time: "1d ago",
        hash: "b4c5d6e",
        comments: 2,
      },
    ],
    respects: 27,
    status: "shipped",
    shipUrl: "slideck.dev",
    shippedIn: "31 days",
    daysAgo: 1,
    commentData: [
      { user: "maksim", text: "Congrats on the HN launch! Well deserved.", time: "1d ago" },
      {
        user: "danielle",
        text: "Just tried it \u2014 the theme support is beautiful.",
        time: "22h ago",
      },
      {
        user: "alex",
        text: "Any plans for PDF export?",
        time: "20h ago",
      },
      { user: "priya", text: "PDF export is on the roadmap for v2.1!", time: "18h ago" },
    ],
    activity: [1, 2, 1, 3, 2, 1, 2],
  },
  {
    id: 6,
    user: "rena",
    avatar: "R",
    text: "a design token generator from Figma",
    repo: "rena-ui/tokenflow",
    day: 8,
    comments: 2,
    devlog: [
      {
        type: "commit",
        text: "feat: parse Figma variables API response",
        time: "1d ago",
        hash: "b2c3d4e",
        comments: 1,
      },
      {
        type: "post",
        text: "Day 8: Figma API is... something.",
        body: "The variables API returns nested structures 4 levels deep. Spent today writing a recursive parser that flattens everything into a clean token tree. Next step: output to CSS custom properties and Tailwind config.",
        time: "1d ago",
        comments: 1,
      },
      {
        type: "commit",
        text: "add CSS custom property output format",
        time: "2d ago",
        hash: "f5a6b7c",
        comments: 0,
      },
    ],
    respects: 0,
    status: "building",
    daysAgo: 1,
    commentData: [
      {
        user: "priya",
        text: "This would be so useful for our design system at work.",
        time: "1d ago",
      },
      {
        user: "rena",
        text: "That's exactly the use case! Will share when it's ready.",
        time: "23h ago",
      },
    ],
    activity: [1, 0, 2, 1, 0, 1, 1],
  },
  {
    id: 3,
    user: "kai",
    avatar: "K",
    text: "a minimal habit tracker CLI",
    repo: "kai-dev/habits",
    day: 19,
    comments: 5,
    devlog: [
      {
        type: "post",
        text: "Shipped! 19 days from idea to v1.0",
        body: "Started this as a weekend project and it turned into almost 3 weeks of work. The final push was adding streak tracking with a nice ASCII chart in the terminal. 14 people have starred it on GitHub so far. Feels good to actually finish something for once.",
        image: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=600&h=300&fit=crop",
        time: "2d ago",
        comments: 3,
      },
      {
        type: "commit",
        text: "v1.0.0 release",
        time: "2d ago",
        hash: "0f1e2d3",
        comments: 0,
      },
    ],
    respects: 14,
    status: "shipped",
    shipUrl: "habits.kai.dev",
    shippedIn: "19 days",
    daysAgo: 2,
    commentData: [
      { user: "maksim", text: "Love the ASCII charts. Clean work.", time: "2d ago" },
      {
        user: "danielle",
        text: "Using this already. Streak feature is addictive.",
        time: "2d ago",
      },
      {
        user: "alex",
        text: "Would you accept a PR for weekly summaries?",
        time: "1d ago",
      },
      {
        user: "kai",
        text: "Absolutely \u2014 open an issue and let's discuss the format.",
        time: "1d ago",
      },
      { user: "rena", text: "Starred! The README is really well written too.", time: "22h ago" },
    ],
    activity: [2, 1, 3, 1, 2, 4, 0],
  },
  {
    id: 7,
    user: "josh",
    avatar: "J",
    text: "a CLI bookmark manager with fuzzy search",
    repo: "joshm/bkmk",
    day: 14,
    comments: 3,
    devlog: [
      {
        type: "post",
        text: "v1.0 is out. 14 days, 800 lines of Rust.",
        body: "Kept the scope tight: add, search, open, delete. Fuzzy search uses skim under the hood. The whole binary is 2MB. Sometimes the best tool is the simplest one.",
        time: "3d ago",
        comments: 2,
      },
      {
        type: "commit",
        text: "v1.0.0 \u2014 initial stable release",
        time: "3d ago",
        hash: "c8d9e0f",
        comments: 1,
      },
      {
        type: "commit",
        text: "add fuzzy search with skim",
        time: "4d ago",
        hash: "a2b3c4d",
        comments: 0,
      },
    ],
    respects: 9,
    status: "shipped",
    shipUrl: "github.com/joshm/bkmk",
    shippedIn: "14 days",
    daysAgo: 3,
    commentData: [
      { user: "kai", text: "800 lines of Rust for a full CLI tool? Respect.", time: "3d ago" },
      { user: "alex", text: "Any plans for browser extension sync?", time: "2d ago" },
      {
        user: "josh",
        text: "Maybe v2. For now it reads a plain text file \u2014 easy to sync with git.",
        time: "2d ago",
      },
    ],
    activity: [3, 2, 1, 2, 1, 0, 0],
  },
  {
    id: 9,
    user: "tyler",
    avatar: "T",
    text: "a git-based CMS for static sites",
    repo: "tyler-dev/gitcms",
    day: 22,
    comments: 6,
    devlog: [
      {
        type: "commit",
        text: "feat: markdown frontmatter schema validation",
        time: "5d ago",
        hash: "d4e5f6a",
        comments: 1,
      },
      {
        type: "post",
        text: "Day 22: rethinking the whole content model",
        body: "Originally I was storing content as flat markdown files. But nested content (like a blog post with embedded galleries) needs a tree structure. Switching to a folder-per-page model where each page is a directory with an index.md and assets. Big refactor but it feels right.",
        time: "5d ago",
        comments: 3,
      },
      {
        type: "commit",
        text: "refactor: folder-per-page content model",
        time: "6d ago",
        hash: "b7c8d9e",
        comments: 2,
      },
    ],
    respects: 0,
    status: "building",
    daysAgo: 5,
    commentData: [
      {
        user: "priya",
        text: "The folder-per-page approach is solid. Astro does something similar.",
        time: "5d ago",
      },
      {
        user: "maksim",
        text: "Have you looked at content collections in Astro? Similar concept.",
        time: "4d ago",
      },
      { user: "tyler", text: "Yeah, heavily inspired by that. Great minds.", time: "4d ago" },
    ],
    activity: [1, 2, 0, 1, 0, 0, 0],
  },
  {
    id: 10,
    user: "sam",
    avatar: "S",
    text: "a screenshot-to-code tool",
    repo: "samdev/pix2code",
    day: 25,
    comments: 12,
    devlog: [
      {
        type: "post",
        text: "Shipped! 25 days. GPT-4o vision is wild.",
        body: "Drop a screenshot, get Tailwind code. It's not perfect but it gets you 80% there in seconds. The trick was chaining two calls \u2014 first one describes the layout, second one generates the code. Single-shot was too unreliable.",
        image: "https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=600&h=300&fit=crop",
        time: "1w ago",
        comments: 8,
      },
      {
        type: "commit",
        text: "v1.0 release with Tailwind output",
        time: "1w ago",
        hash: "f1e2d3c",
        comments: 4,
      },
    ],
    respects: 42,
    status: "shipped",
    shipUrl: "pix2code.dev",
    shippedIn: "25 days",
    daysAgo: 7,
    commentData: [
      {
        user: "danielle",
        text: "This is incredible. Just converted 3 Figma screens in 10 minutes.",
        time: "6d ago",
      },
      { user: "rena", text: "The two-step chain approach is clever.", time: "6d ago" },
      {
        user: "kai",
        text: "42 respects \u2014 well earned. This is genuinely useful.",
        time: "5d ago",
      },
    ],
    activity: [4, 3, 2, 1, 0, 0, 0],
  },
];
