const KEY = import.meta.env.VITE_GEMINI_API_KEY

const MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-3-27b-it:free',
  'google/gemma-3-4b-it',
]

async function ask(system: string, user: string): Promise<string> {
  for (const model of MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${KEY}`,
          'HTTP-Referer':  'https://vpg-woad.vercel.app',
          'X-Title':       'Visual Prompt Gallery',
        },
        body: JSON.stringify({
          model,
          messages:    [{ role: 'system', content: system }, { role: 'user', content: user }],
          max_tokens:  600,
          temperature: 0.0, // Zero creativity — pure cleanup only
        }),
      })
      if (!res.ok) { console.warn(`${model} failed ${res.status}`); continue }
      const data = await res.json()
      const text = data.choices?.[0]?.message?.content
      if (!text) continue
      return text.trim()
    } catch (e) {
      console.warn(`${model} error:`, e)
    }
  }
  throw new Error('All models failed')
}

// Logical order for the final prompt
const KEY_ORDER = [
  'style', 'subject', 'camera', 'lighting',
  'environment', 'materials', 'people', 'mood', 'quality',
]

export async function enhancePrompt(
  chips: Array<{ title: string; prompt: string; categoryPath: string[] }>
): Promise<{ json: string; aiPrompt: string }> {

  // Step 1: Build clean JSON — deduplicate values per category
  const grouped: Record<string, Set<string>> = {}
  for (const chip of chips) {
    const key = (chip.categoryPath[0] ?? 'general')
      .toLowerCase()
      .replace(/\s+/g, '_')
    if (!grouped[key]) grouped[key] = new Set()
    grouped[key].add(chip.prompt.trim())
  }

  const cleanJson: Record<string, string> = {}
  for (const [k, v] of Object.entries(grouped)) {
    cleanJson[k] = Array.from(v).join(', ')
  }

  const rawJson = JSON.stringify(cleanJson, null, 2)

  // Step 2: Ask AI to ONLY translate + sort — nothing else
  const system = `You are a JSON translator and organizer. Your ONLY tasks are:
1. Translate any non-English values to professional English
2. Remove duplicate words within the same value
3. Return the JSON with keys in this order when present: ${KEY_ORDER.join(', ')}
4. Keep all original keys and their meaning — do NOT add, remove, or change anything else
5. Return ONLY valid JSON — no markdown, no explanation`

  const user = `Translate non-English to English and sort keys. Return ONLY JSON:

${rawJson}`

  let finalJson = rawJson
  try {
    const raw = await ask(system, user)
    const cleaned = raw
      .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      .replace(/^[^{]*({[\s\S]*})[^}]*$/, '$1')
    JSON.parse(cleaned) // validate
    finalJson = cleaned
  } catch (e) {
    console.error('Parse failed, using raw', e)
    finalJson = rawJson
  }

  // Step 3: Build flat prompt in logical order
  const parsed: Record<string, string> = JSON.parse(finalJson)
  const ordered = [
    ...KEY_ORDER.filter(k => parsed[k]).map(k => parsed[k]),
    ...Object.entries(parsed).filter(([k]) => !KEY_ORDER.includes(k)).map(([, v]) => v),
  ]

  return {
    json:     JSON.stringify(parsed, null, 2),
    aiPrompt: ordered.filter(Boolean).join(', '),
  }
}

export async function translatePrompt(text: string): Promise<string> {
  if (!/[\u0600-\u06FF]/.test(text)) return text
  return ask(
    'Translate Arabic to professional English. Return ONLY the English translation.',
    text
  )
}
