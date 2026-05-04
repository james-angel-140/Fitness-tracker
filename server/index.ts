import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import path from 'path'
import { existsSync, writeFileSync, readFileSync } from 'fs'

const DATA_DIR = path.resolve(__dirname, '../data')

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

// ─── Nutrition: parse free text → macro estimate ─────────────────────────────

app.post('/api/nutrition/parse', async (req: Request, res: Response) => {
  console.log('nutrition/parse body:', JSON.stringify(req.body))
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) { res.status(503).json({ error: 'ANTHROPIC_API_KEY not set' }); return }

  const { text } = req.body ?? {}
  if (!text || typeof text !== 'string') { res.status(400).json({ error: 'Missing text field' }); return }

  const prompt = `Estimate the macros for this food or meal description. If multiple meals are listed, sum them into one combined entry.
Return ONLY a single valid JSON object — no markdown, no array, no explanation:
{"description":"<concise combined description>","calories":<number>,"protein_g":<number>,"carbs_g":<number>,"fat_g":<number>,"approximate":<true|false>}

Rules:
- description: normalise capitalisation and fix typos, keep it concise (max 80 chars)
- If multiple items: combine descriptions with " + " and sum all macros
- approximate: true for restaurant food, homemade meals, or vague descriptions; false only for packaged food with known labels
- calories/protein_g/carbs_g/fat_g: integers, conservative estimates when uncertain

Food: "${text.slice(0, 500)}"`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await response.json()
    const raw: string = data?.content?.[0]?.text ?? ''

    // Extract JSON — could be an object {...} or array [...]
    const match = raw.match(/(\[[\s\S]*\]|\{[\s\S]*\})/)
    if (!match) throw new Error('No JSON found in AI response')
    const parsed = JSON.parse(match[0])

    // If Claude returned an array (multiple meals), combine into one entry
    if (Array.isArray(parsed)) {
      const combined = {
        description: parsed.map((e: any) => e.description).join(' + '),
        calories: parsed.reduce((s: number, e: any) => s + (e.calories ?? 0), 0),
        protein_g: parsed.reduce((s: number, e: any) => s + (e.protein_g ?? 0), 0),
        carbs_g: parsed.reduce((s: number, e: any) => s + (e.carbs_g ?? 0), 0),
        fat_g: parsed.reduce((s: number, e: any) => s + (e.fat_g ?? 0), 0),
        approximate: true,
      }
      res.json(combined)
    } else {
      res.json(parsed)
    }
  } catch (err) {
    console.error('Nutrition parse error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// ─── Nutrition: save entry to daily-log.json ──────────────────────────────────

app.post('/api/nutrition/log', (req: Request, res: Response) => {
  const entry = req.body ?? {}
  if (!entry.description || entry.calories == null || entry.protein_g == null) {
    res.status(400).json({ error: 'Missing required fields: description, calories, protein_g' })
    return
  }

  const logPath = path.join(DATA_DIR, 'nutrition', 'daily-log.json')
  const log: any[] = JSON.parse(readFileSync(logPath, 'utf-8'))

  const now = new Date()
  const newEntry = {
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
    description: entry.description,
    calories: Math.round(entry.calories),
    protein_g: Math.round(entry.protein_g),
    ...(entry.carbs_g != null && { carbs_g: Math.round(entry.carbs_g) }),
    ...(entry.fat_g != null && { fat_g: Math.round(entry.fat_g) }),
    ...(entry.approximate && { approximate: true }),
  }

  // Prepend (file is newest-first)
  log.unshift(newEntry)
  writeFileSync(logPath, JSON.stringify(log, null, 2))
  console.log(`Logged nutrition: ${newEntry.description} — ${newEntry.calories}kcal / ${newEntry.protein_g}g protein`)
  res.json({ ok: true, entry: newEntry })
})

// ─── Save workout ─────────────────────────────────────────────────────────────

app.post('/api/workouts', (req: Request, res: Response) => {
  const workout = req.body?.workout
  if (!workout?.id || !workout?.date || !workout?.type) {
    res.status(400).json({ error: 'Missing required fields: id, date, type' })
    return
  }

  // Sanitise id — only allow safe filename characters
  const safeId = String(workout.id).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80)
  const filePath = path.join(DATA_DIR, 'workouts', `${safeId}.json`)

  writeFileSync(filePath, JSON.stringify(workout, null, 2))
  console.log(`Saved workout: ${safeId}.json`)
  res.json({ ok: true, file: `data/workouts/${safeId}.json` })
})

// ─── Update personal records ──────────────────────────────────────────────────

app.post('/api/prs', (req: Request, res: Response) => {
  const { lift, weight_kg, reps } = req.body ?? {}
  if (!lift || weight_kg == null || reps == null) {
    res.status(400).json({ error: 'Missing required fields: lift, weight_kg, reps' })
    return
  }

  const prsPath = path.join(DATA_DIR, 'personal-records.json')
  const prs: any[] = JSON.parse(readFileSync(prsPath, 'utf-8'))

  const existing = prs.find((p: any) => p.lift.toLowerCase() === String(lift).toLowerCase())
  if (!existing) {
    res.status(404).json({ error: `Lift "${lift}" not found in personal-records.json` })
    return
  }

  existing.current_best_kg = weight_kg
  existing.current_best_reps = reps
  existing.date_achieved = new Date().toISOString().slice(0, 10)

  writeFileSync(prsPath, JSON.stringify(prs, null, 2))
  console.log(`Updated PR: ${lift} → ${weight_kg}kg × ${reps}`)
  res.json({ ok: true })
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
