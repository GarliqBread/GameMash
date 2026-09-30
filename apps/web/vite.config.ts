import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const apiTarget = process.env.API_URL ?? "http://localhost:3000";

const hostOf = (url: string | undefined) => {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

export default defineConfig(({ mode }) => {
  const publicHost = hostOf(loadEnv(mode, import.meta.dirname, "VITE_").VITE_PUBLIC_URL);
  return {
    plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
    resolve: {
      dedupe: ["react", "react-dom", "@tanstack/react-query"],
    },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      allowedHosts: publicHost ? [publicHost] : [],
      proxy: {
        "/api": apiTarget,
        "/socket.io": { target: apiTarget, ws: true },
      },
    },
  };
});
