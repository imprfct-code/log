export interface Comment {
  user: string;
  text: string;
  time: string;
}

export interface DevlogEntry {
  type: "commit" | "post" | "git_commit";
  text: string;
  body?: string;
  image?: string;
  time: string;
  hash?: string;
  gitAuthor?: string;
  gitUrl?: string;
  comments: number;
  commentData?: Comment[];
}

export interface Commitment {
  id: string;
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
  activity: number[];
}
