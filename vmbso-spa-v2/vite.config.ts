import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const portalUrl =
    env.VITE_PORTAL_URL || "https://site-alfw4.powerappsportals.com";

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/_api": {
          target: portalUrl,
          changeOrigin: true,
          secure: false,
        },
        "/_services": {
          target: portalUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
