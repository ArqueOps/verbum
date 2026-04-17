import { defineConfig } from "vitest/config";
import path from "path";

(process.env as Record<string, string>).NODE_ENV = "test";

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("test"),
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    conditions: ["development", "browser"],
    alias: {
      "@": path.resolve(__dirname, "src"),
      "firebase-admin/app": path.resolve(
        __dirname,
        "scripts/migrate-firebase-auth/src/__mocks__/firebase-admin-app.ts",
      ),
      "firebase-admin/auth": path.resolve(
        __dirname,
        "scripts/migrate-firebase-auth/src/__mocks__/firebase-admin-auth.ts",
      ),
    },
  },
});
