import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: '/Fitness-tracker/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@data': path.resolve(__dirname, '../data'),
      '@schema': path.resolve(__dirname, '../schema'),
    },
  },
})
