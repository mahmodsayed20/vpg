const KEY = import.meta.env.VITE_GEMINI_API_KEY

// Try models in order until one works
const MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',   // Best free model
  'google/gemma-3-27b-it:free',                 // Good Google model  
  'google/gemma-3-4b-it',                       // Fallback
]

async function ask(system: string, user: string): Promise<string> {
  let lastError = ''

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
          max_tokens:  800,
          temperature: 0.3,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        console.warn(`Model ${model} failed:`, err)
        lastError = err
        continue // try next model
      }

      const data = await res.json()
      const text = data.choices?.[0]?.message?.content
      if (!text) continue

      console.log(`✅ Used model: ${model}`)
      return text.trim()

    } catch (e) {
      console.warn(`Model ${model} error:`, e)
      lastError = String(e)
      continue
    }
  }

  throw new Error(`All models failed. Last error: ${lastError}`)
}

/**
 * Takes chips → builds JSON → Gemini enhances JSON values
 * Returns: raw JSON + enhanced JSON + flat AI prompt
 */
export async function enhancePrompt(
  chips: Array<{ title: string; prompt: string; categoryPath: string[] }>
): Promise<{ json: string; aiPrompt: string }> {

  // Step 1: Build structured JSON from chips
  const structured: Record<string, string> = {}
  for (const chip of chips) {
    const topKey = (chip.categoryPath[0] ?? 'general')
      .toLowerCase()
      .replace(/\s+/g, '_')
    structured[topKey] = structured[topKey]
      ? structured[topKey] + ', ' + chip.prompt
      : chip.prompt
  }
  const rawJson = JSON.stringify(structured, null, 2)

  // Step 2: Gemini/LLaMA enhances JSON — same keys, better values
  const system = `You are an expert AI image prompt engineer.
Enhance a JSON object for AI image generation (Midjourney, DALL-E, Stable Diffusion).

STRICT RULES:
1. Return ONLY a valid JSON object — no markdown fences, no explanation
2. Keep ALL original keys exactly as-is
3. Enhance values with professional photography/rendering terminology
4. Auto-detect scene type and add appropriate "quality" and "render_style" keys
5. Logical order of detail: be specific and descriptive
6. Never change the meaning — only ADD professional detail
7. Values = comma-separated English phrases`

  const user = `Scene type: auto-detect from context.
Enhance values only, keep same keys, return ONLY JSON:

${rawJson}`

  let aiJson = rawJson

  try {
    const raw = await ask(system, user)
    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
      // Sometimes models add text before/after JSON
      .replace(/^[^{]*({[\s\S]*})[^}]*$/, '$1')

    JSON.parse(cleaned) // validate
    aiJson = cleaned
  } catch (e) {
    console.error('JSON parse failed, using raw JSON', e)
    aiJson = rawJson
  }

  // Step 3: Build flat prompt from enhanced JSON in logical order
  const ORDER = [
    'style', 'render_style', 'subject',
    'camera', 'lighting', 'environment',
    'materials', 'people', 'mood',
    'quality',
  ]

  const parsed: Record<string, string> = JSON.parse(aiJson)

  const ordered = [
    ...ORDER.filter(k => parsed[k]).map(k => parsed[k]),
    ...Object.entries(parsed)
      .filter(([k]) => !ORDER.includes(k))
      .map(([, v]) => v),
  ]

  const aiPrompt = ordered.filter(Boolean).join(', ')

  return { json: JSON.stringify(parsed, null, 2), aiPrompt }
}

export async function translatePrompt(text: string): Promise<string> {
  if (!/[\u0600-\u06FF]/.test(text)) return text
  return ask(
    'Translate Arabic to professional English for AI image generation. Return ONLY the English translation.',
    text
  )
}
