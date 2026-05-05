import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("poll github repos", { minutes: 15 }, internal.githubPolling.dispatchPolling, {});

export default crons;
