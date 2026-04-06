export interface Comment {
  user: string;
  text: string;
  time: string;
}

export interface DevlogEntry {
  type: "commit" | "post";
  text: string;
  body?: string;
  image?: string;
  time: string;
  hash?: string;
  comments: number;
  commentData?: Comment[];
}

export interface Commitment {
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
}
