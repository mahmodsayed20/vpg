const KEY = import.meta.env.VITE_GEMINI_API_KEY

async function ask(systemPrompt: string, userContent: string): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${KEY}`,
      'HTTP-Referer':  'https://vpg-woad.vercel.app',
      'X-Title':       'Visual Prompt Gallery',
    },
    body: JSON.stringify({
      model:    'google/gemma-3-4b-it',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent },
      ],
      max_tokens: 1000,
      temperature: 0.4,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('OpenRouter error:', res.status, err)
    throw new Error(`API error ${res.status}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('Empty response')
  return text.trim()
}

// ─── Main function: takes chips and builds perfect AI prompt ─────────────────
export async function enhancePrompt(
  chips: Array<{ title: string; prompt: string; categoryPath: string[] }>
): Promise<{ json: string; aiPrompt: string }> {

  // Step 1: Build structured JSON from chips
  const structured: Record<string, string> = {}
  for (const chip of chips) {
    // Use top-level category as the key (Camera, Lighting, etc.)
    const topCategory = chip.categoryPath[0] ?? 'general'
    const key = topCategory.toLowerCase().replace(/\s+/g, '_')
    // If multiple chips in same category, append
    if (structured[key]) {
      structured[key] += ', ' + (chip.prompt)
    } else {
      structured[key] = chip.prompt
    }
  }

  const jsonOutput = JSON.stringify(structured, null, 2)

  // Step 2: Ask Gemini to convert JSON to perfect AI prompt
  const systemPrompt = `You are an expert AI image generation prompt engineer.
Your job is to convert a structured JSON of scene elements into a perfect, professional prompt.

Rules:
- Detect the scene type automatically (architectural, portrait, logo, social media, interior, exterior, etc.)
- Order elements logically: subject first, then camera, lighting, environment, style, quality
- Use professional photography/rendering terminology
- Keep the original values — do NOT invent new elements
- Make it flow naturally as a single coherent prompt
- End with quality modifiers appropriate for the scene type
- Return ONLY the final prompt text, nothing else`

  const userContent = `Convert this scene JSON to a perfect AI image generation prompt:

${jsonOutput}

Return ONLY the prompt text.`

  const aiPrompt = await ask(systemPrompt, userContent)

  return { json: jsonOutput, aiPrompt }
}

// ─── Translate Arabic to English ──────────────────────────────────────────────
export async function translatePrompt(text: string): Promise<string> {
  if (!/[\u0600-\u06FF]/.test(text)) return text
  return (await ask(
    'You are a translator. Translate Arabic to professional English for AI image generation.',
    `Translate this to English. Return ONLY the translation: ${text}`
  ))
}
