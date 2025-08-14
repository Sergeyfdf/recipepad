import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// Если репозиторий называется recipepad, оставь '/recipepad/'.
// Если репозиторий <username>.github.io — поставь '/'.
export default defineConfig({
  plugins: [react()],
  base: '/recipepad/',
  server: { host: true, port: 5173 }
})
