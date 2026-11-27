import { fileURLToPath } from "node:url"
import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: "hero-app",
  base: "/hero/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": root,
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "../hero",
    emptyOutDir: true,
  },
})
