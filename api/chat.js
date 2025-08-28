import { getRagChain } from './_lib/rag.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  try {
    const raw = req.body
    const body = typeof raw === 'string' ? (raw ? JSON.parse(raw) : {}) : (raw ?? {})
    const message = body && typeof body.message === 'string' ? body.message : ''
    if (!message) return res.status(400).json({ error: 'message is required' })
    const chain = await getRagChain()
    const answer = await chain(message)
    res.status(200).json({ answer })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'internal_error'
    res.status(500).json({ error: msg })
  }
}



