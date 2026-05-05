// Convex runtime provides process.env for environment variables
declare const process: { env: Record<string, string | undefined> };

// Vite's import.meta.glob (used by convex-test setup in test files)
interface ImportMeta {
  glob(pattern: string): Record<string, () => Promise<Record<string, unknown>>>;
}
