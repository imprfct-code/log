import { ConvexProvider, ConvexReactClient } from "convex/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist-mono";
import "./index.css";
import { App } from "./app/App";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl || typeof convexUrl !== "string") {
  throw new Error("Missing VITE_CONVEX_URL environment variable");
}
const convex = new ConvexReactClient(convexUrl);

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>,
);
