// =============================================================
//  client/vite.config.js
//
//  Vite is our build tool and dev server for the frontend.
//  It replaces Create React App and is much faster.
//
//  Key settings here:
//  - The React plugin enables JSX transformation
//  - The proxy setting is IMPORTANT:
//    Any request from React to /api/... gets forwarded to our
//    Express server at localhost:5000.
//    This avoids CORS issues during development because from
//    the browser's perspective, both frontend and API are on
//    the same origin (localhost:5173).
// =============================================================

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Tailwind v4 uses a Vite plugin instead of a PostCSS config
  ],
  server: {
    port: 5173,
    proxy: {
      // Any request starting with /api will be forwarded to our backend
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
