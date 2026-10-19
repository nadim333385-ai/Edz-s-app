import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const configuredBase = process.env.LENDULET_BASE_PATH || "/";
const baseSegment = configuredBase.replace(/^\/+|\/+$/g, "");
const basePath = baseSegment ? `/${baseSegment}/` : "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      scope: basePath,
      includeAssets: [
        "icon.svg",
        "icon-192.png",
        "icon-512.png",
        "tudomany.html",
      ],
      manifest: {
        name: "Lendület – Edzésnapló",
        short_name: "Lendület",
        lang: "hu",
        description:
          "Kondipark, fejlődés és kiegészítő sportok. A saját tempódban.",
        theme_color: "#173d32",
        background_color: "#f6f7f2",
        display: "standalone",
        start_url: basePath,
        scope: basePath,
        icons: [
          {
            src: `${basePath}icon-192.png`,
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: `${basePath}icon-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,webmanifest}"],
        cleanupOutdatedCaches: true,
        navigateFallback: `${basePath}index.html`,
      },
    }),
  ],
  server: { host: "0.0.0.0", port: 5173, strictPort: true },
  preview: { host: "0.0.0.0", port: 4173, strictPort: true },
  test: { include: ["src/**/*.test.ts"] },
});
