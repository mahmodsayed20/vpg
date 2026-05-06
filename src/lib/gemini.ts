const KEY = import.meta.env.VITE_GEMINI_API_KEY

async function ask(system: string, user: string): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${KEY}`,
      'HTTP-Referer':  'https://vpg-woad.vercel.app',
      'X-Title':       'Visual Prompt Gallery',
    },
    body: JSON.stringify({
      model:       'google/gemma-3-4b-it',
      messages:    [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens:  800,
      temperature: 0.3,
    }),
  })

  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('Empty response')
  return text.trim()
}

/**
 * Takes chips → builds structured JSON → asks Gemini to ENHANCE the JSON
 * Returns both the raw JSON and the Gemini-enhanced JSON
 */
export async function enhancePrompt(
  chips: Array<{ title: string; prompt: string; categoryPath: string[] }>
): Promise<{ json: string; aiPrompt: string }> {

  // Step 1: Build structured JSON from chips
  const structured: Record<string, string> = {}
  for (const chip of chips) {
    const topKey = (chip.categoryPath[0] ?? 'general').toLowerCase().replace(/\s+/g, '_')
    structured[topKey] = structured[topKey]
      ? structured[topKey] + ', ' + chip.prompt
      : chip.prompt
  }
  const rawJson = JSON.stringify(structured, null, 2)

  // Step 2: Gemini enhances the JSON — keeps same keys, improves values only
  const system = `You are an AI image prompt engineer specializing in structured prompts.
Your job is to enhance the VALUES of a JSON object — keeping the exact same keys.

STRICT RULES:
- Return ONLY valid JSON — no markdown, no explanation, no extra text
- Keep ALL the original keys exactly as they are
- Only enhance/expand the values with professional terminology
- Auto-detect scene type (architectural, portrait, logo, interior, etc.)
- Add relevant quality/style keys if missing (e.g. "quality", "render_style")
- Values must be comma-separated descriptive English phrases
- Do NOT change the meaning — only ADD professional detail`

  const user = `Enhance the values in this JSON for AI image generation.
Return ONLY the enhanced JSON object, nothing else:

${rawJson}`

  let aiJson = rawJson // fallback
  try {
    const raw = await ask(system, user)
    // Clean any markdown fences
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    // Validate it's real JSON
    JSON.parse(cleaned)
    aiJson = cleaned
  } catch (e) {
    console.error('Gemini JSON parse failed, using raw', e)
    aiJson = rawJson
  }

  // Step 3: Build flat AI prompt from enhanced JSON (for copy/use)
  const ORDER = ['style', 'subject', 'camera', 'lighting', 'environment', 'materials', 'people', 'quality', 'render_style']
  const parsed = JSON.parse(aiJson)
  const ordered = [
    ...ORDER.filter(k => parsed[k]).map(k => parsed[k]),
    ...Object.entries(parsed).filter(([k]) => !ORDER.includes(k)).map(([, v]) => v),
  ]
  const aiPrompt = ordered.join(', ')

  return { json: aiJson, aiPrompt }
}

export async function translatePrompt(text: string): Promise<string> {
  if (!/[\u0600-\u06FF]/.test(text)) return text
  return ask(
    'Translate Arabic to professional English for AI image generation. Return ONLY the translation.',
    text
  )
}
