import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    },
    hmr: {
      port: 5173
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  // Add support for HTML5 history mode
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  // Handle SPA routing
  appType: 'spa'
}); 