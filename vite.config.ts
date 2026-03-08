import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import topLevelAwait from "vite-plugin-top-level-await"
import wasm from "vite-plugin-wasm"

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), wasm(), topLevelAwait(), tailwindcss()],

  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
    },
  },

  // 防止 Vite 预构建破坏 @jsquash 的 WASM 加载
  optimizeDeps: {
    exclude: ["@jsquash/jpeg", "@jsquash/png", "@jsquash/oxipng", "@jsquash/webp", "@jsquash/avif", "@jsquash/jxl"],
  },

  worker: {
    format: "es" as const,
  },

  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          heroui: ["@heroui/react"],
          framer: ["framer-motion"],
        },
      },
    },
  },
}))
