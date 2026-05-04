import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'
import type { IncomingMessage, ServerResponse } from 'http'

// Load ANTHROPIC_API_KEY from root .env (one level above dashboard/)
function loadRootEnv() {
  try {
    const content = readFileSync(path.resolve(__dirname, '../.env'), 'utf-8')
    content.split('\n').forEach((line) => {
      const eq = line.indexOf('=')
      if (eq < 1) return
      const key = line.slice(0, eq).trim()
      const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (key && !process.env[key]) process.env[key] = val
    })
  } catch {
    // No root .env — fine, API calls will return 503
  }
}
loadRootEnv()

// Vite plugin: proxy AI requests server-side so the API key stays in Node.js
function aiMiddlewarePlugin() {
  return {
    name: 'ai-middleware',
    configureServer(server: { middlewares: { use: (path: string, handler: (req: IncomingMessage, res: ServerResponse) => void) => void } }) {
      server.middlewares.use('/api/ai/parse-workout', (req: IncomingMessage, res: ServerResponse) => {
        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) {
          res.writeHead(503, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set in .env' }))
          return
        }

        const chunks: Buffer[] = []
        req.on('data', (chunk: Buffer) => chunks.push(chunk))
        req.on('end', async () => {
          try {
            const { prompt } = JSON.parse(Buffer.concat(chunks).toString())

            const response = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 2048,
                messages: [{ role: 'user', content: prompt }],
              }),
            })

            const data = await response.json()
            res.writeHead(response.ok ? 200 : 502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(data))
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: String(err) }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  // For self-hosting use base '/'. For GitHub Pages: VITE_BASE=/Fitness-tracker/ npm run build
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), aiMiddlewarePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@data': path.resolve(__dirname, '../data'),
      '@schema': path.resolve(__dirname, '../schema'),
    },
  },
})
