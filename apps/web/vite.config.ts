import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    // Split third-party bundles so the initial payload stays small.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@abstract-foundation") || id.includes("abstract-global-wallet")) {
            return "vendor-agw";
          }
          if (id.includes("wagmi") || id.includes("@wagmi")) return "vendor-wagmi";
          if (id.includes("viem")) return "vendor-viem";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("socket.io-client") || id.includes("engine.io-client")) {
            return "vendor-socket";
          }
          if (id.includes("react-dom") || id.includes("scheduler")) return "vendor-react-dom";
          if (id.includes("/react/") || id.endsWith("/react")) return "vendor-react";
          return "vendor";
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
});
