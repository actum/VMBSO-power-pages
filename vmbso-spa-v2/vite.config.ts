import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/_api": {
        target: "https://site-alfw4.powerappsportals.com",
        changeOrigin: true,
        secure: false,
      },
      "/_services": {
        target: "https://site-alfw4.powerappsportals.com",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
