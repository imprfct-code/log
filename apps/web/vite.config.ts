import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  envDir: "../../",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@convex": path.resolve(__dirname, "../../convex"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/@clerk")) return "clerk";
          if (id.includes("node_modules/convex")) return "convex";
          if (id.includes("node_modules/react-markdown") || id.includes("node_modules/remark-gfm"))
            return "markdown";
          if (
            id.includes("node_modules/react-syntax-highlighter") ||
            id.includes("node_modules/refractor")
          )
            return "syntax";
          if (id.includes("node_modules/plyr")) return "plyr";
          if (id.includes("node_modules/@base-ui")) return "ui";
          if (id.includes("node_modules/react-router")) return "router";
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
