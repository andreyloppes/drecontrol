/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      // Only register SW in production builds; dev SW disabled to avoid caching issues while developing.
      devOptions: {
        enabled: false,
      },
      includeAssets: [
        "favicon.ico",
        "favicon.png",
        "robots.txt",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "og-image.png",
      ],
      manifest: {
        name: "DRE Control",
        short_name: "DREControl",
        description: "Next-gen financial OS em pt-BR",
        theme_color: "#0c0a1e",
        background_color: "#0c0a1e",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        lang: "pt-BR",
        categories: ["finance", "productivity", "business"],
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // SPA client-side routing fallback
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /\/rest\/v1\//],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Precache typical Vite outputs
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2}"],
        // Raise precache limit to accommodate charts/pdf assets
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          // Supabase REST API — NetworkFirst with short TTL so users get fresh data when online
          // but still see last response when offline.
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith(".supabase.co") &&
              url.pathname.startsWith("/rest/v1/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Google Fonts stylesheets
          {
            urlPattern: ({ url }) =>
              url.origin === "https://fonts.googleapis.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts webfont files
          {
            urlPattern: ({ url }) =>
              url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Generic CDN images/assets
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": [
            "class-variance-authority",
            "clsx",
            "tailwind-merge",
          ],
          "vendor-charts": ["recharts"],
          "vendor-supabase": ["@supabase/supabase-js"],
        },
      },
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./src/test-setup.ts"],
    reporters: process.env.CI ? ["default"] : ["dot"],
  },
}));
