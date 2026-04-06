import { ClerkProvider, useAuth } from "@clerk/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist-mono";
import "./index.css";
import { App } from "./app/App";
import { AuthSync } from "./components/AuthSync";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl || typeof convexUrl !== "string") {
  throw new Error("Missing VITE_CONVEX_URL environment variable");
}

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!clerkKey || typeof clerkKey !== "string") {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
}

const convex = new ConvexReactClient(convexUrl);

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={clerkKey}
      signInForceRedirectUrl="/feed"
      signUpForceRedirectUrl="/feed"
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <AuthSync />
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </StrictMode>,
);
