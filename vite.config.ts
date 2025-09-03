import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// Если репозиторий называется recipepad, оставь '/recipepad/'.
// Если репозиторий <username>.github.io — поставь '/'.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') }
  },
  base: '/recipepad/',
  server: { host: true, port: 5173 }
})
