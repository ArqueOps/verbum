import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  define: {
    "process.env.NODE_ENV": '"development"',
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    conditions: ["development"],
  },
});
