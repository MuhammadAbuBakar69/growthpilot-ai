import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: { include: ["lib/**/*.test.{ts,tsx}"], environment: "node", globals: true },
  // globals:true lets @testing-library/react register its own afterEach cleanup; without it every
  // render stacks in the same document and queries match twice.
});
