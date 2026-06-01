import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  
  return {
    envDir: "./",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
      dedupe: ["react", "react-dom"],
    },
    server: {
      port: 5173,
      host: "0.0.0.0",
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "http://localhost:5001",
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 5173,
      host: "0.0.0.0",
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
