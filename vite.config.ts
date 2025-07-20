// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // Muat semua env var
  return {
    plugins: [react()],
    define: {
      'import.meta.env': env, // Agar Vercel bisa membaca env saat build
    },
  }
})
