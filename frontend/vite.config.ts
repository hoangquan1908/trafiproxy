import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), // hỗ trợ JSX/TSX React
    tailwindcss(), // biên dịch class Tailwind (bg-, flex-, ...)
  ],
  server: {
    port: 5173, // 
    proxy: {
      // proxy /api → backend Express 
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
      // các route điều khiển proxy vẫn gọi backend
      "/proxy": { target: "http://127.0.0.1:3000", changeOrigin: true },
      "/download-ca": { target: "http://127.0.0.1:3000", changeOrigin: true },
      "/traffic": { target: "http://127.0.0.1:3000", changeOrigin: true },
    },
  },
});
