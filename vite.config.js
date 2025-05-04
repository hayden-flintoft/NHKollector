// filepath: /home/hflin/nhktool/vite.config.js
const path = require('path');
const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

// https://vitejs.dev/config/
module.exports = defineConfig({
  plugins: [react()],
  root: path.join(__dirname, 'client'),
  publicDir: path.join(__dirname, 'client/public'),
  build: {
    outDir: path.join(__dirname, 'client/dist'),
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  optimizeDeps: {
    exclude: []
  }
});