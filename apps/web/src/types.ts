import type { Id } from "@convex/_generated/dataModel";

export interface Comment {
  user: string;
  text: string;
  time: string;
}

export interface Attachment {
  url: string;
  key: string;
  type: "image" | "video";
  filename: string;
  hasMarkdownRef?: boolean;
  cover?: boolean;
  duration?: number;
}

export interface DevlogEntry {
  id: Id<"devlogEntries">;
  type: "commit" | "post" | "git_commit" | "ship";
  text: string;
  body?: string;
  image?: string;
  attachments?: Attachment[];
  time: string;
  hash?: string;
  gitAuthor?: string;
  gitUrl?: string;
  gitBranch?: string;
  shipNote?: string;
  isMilestone?: boolean;
  comments: number;
  commentData?: Comment[];
  isOwn?: boolean;
}

export interface Commitment {
  id: Id<"commitments">;
  user: string;
  avatar: string;
  text: string;
  repo: string;
  isPrivate?: boolean;
  showMessages: boolean;
  showHashes: boolean;
  showBranches: boolean;
  day: number;
  comments: number;
  devlog: DevlogEntry[];
  respects: number;
  status: "building" | "shipped";
  shipUrl?: string;
  shipNote?: string;
  shippedAt?: number;
  shippedIn?: string;
  activity: number[];
  hasMore?: boolean;
}
