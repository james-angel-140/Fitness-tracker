import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import path from 'path'
import { existsSync } from 'fs'

const app = express()
const PORT = parseInt(process.env.PORT ?? '3001')
const DIST_DIR = path.resolve(__dirname, '../dashboard/dist')
const AUTH_USER = process.env.AUTH_USER ?? 'james'
const AUTH_PASS = process.env.AUTH_PASS

// ─── Basic Auth ───────────────────────────────────────────────────────────────
// Skipped if AUTH_PASS is not set (local dev convenience)
if (AUTH_PASS) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const auth = req.headers.authorization
    if (auth?.startsWith('Basic ')) {
      const decoded = Buffer.from(auth.slice(6), 'base64').toString()
      const colon = decoded.indexOf(':')
      const user = decoded.slice(0, colon)
      const pass = decoded.slice(colon + 1)
      if (user === AUTH_USER && pass === AUTH_PASS) return next()
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="Fitness Tracker"')
    res.status(401).send('Unauthorized')
  })
} else {
  console.warn('⚠  AUTH_PASS not set — running without authentication. Set it in .env before exposing publicly.')
}

// ─── AI proxy endpoint ────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))

app.post('/api/ai/parse-workout', async (req: Request, res: Response) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(503).json({ error: 'ANTHROPIC_API_KEY not set in .env' })
    return
  }

  const { prompt } = req.body
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing prompt field' })
    return
  }

  try {
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
    res.status(response.ok ? 200 : 502).json(data)
  } catch (err) {
    console.error('AI proxy error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// ─── Serve built dashboard ────────────────────────────────────────────────────
if (!existsSync(DIST_DIR)) {
  console.error(`❌  dashboard/dist/ not found. Run: npm run dashboard:build`)
  process.exit(1)
}

app.use(express.static(DIST_DIR))

// SPA fallback — all unknown routes return index.html
app.use((_req: Request, res: Response) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'))
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`✓  Fitness tracker server running at http://localhost:${PORT}`)
  console.log(`   Auth: ${AUTH_PASS ? 'enabled' : 'DISABLED — set AUTH_PASS in .env'}`)
})
