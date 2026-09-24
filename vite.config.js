import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // BASE_PATH override lets Cloudflare Pages build for a subdomain root;
  // default keeps the GitHub Pages subpath deploy working unchanged.
  base: process.env.BASE_PATH ?? '/grower-harvesting/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
