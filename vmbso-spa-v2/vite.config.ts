import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  envPrefix: 'REACT_APP_',
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  server: {
    proxy: {
      '/_api': {
        target: 'https://site-alfw4.powerappsportals.com',
        changeOrigin: true,
        secure: false,
      },
      '/_services': {
        target: 'https://site-alfw4.powerappsportals.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        entryFileNames: 'static/js/main.[hash].js',
        chunkFileNames: 'static/js/[name].[hash].chunk.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.some((n) => n.endsWith('.css'))) {
            return 'static/css/main.[hash][extname]'
          }
          return 'static/media/[name].[hash][extname]'
        },
      },
    },
  },
}))
