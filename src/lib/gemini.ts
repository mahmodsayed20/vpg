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
          temperature: 0.1, // Very low = less creativity = more faithful
        }),
      })
      if (!res.ok) { console.warn(`${model} failed ${res.status}`); continue }
      const data = await res.json()
      const text = data.choices?.[0]?.message?.content
      if (!text) continue
      console.log(`✅ Model: ${model}`)
      return text.trim()
    } catch (e) {
      console.warn(`${model} error:`, e)
    }
  }
  throw new Error('All models failed')
}

export async function enhancePrompt(
  chips: Array<{ title: string; prompt: string; categoryPath: string[] }>
): Promise<{ json: string; aiPrompt: string }> {

  // Step 1: Build clean JSON — deduplicate values
  const structured: Record<string, string[]> = {}
  for (const chip of chips) {
    const key = (chip.categoryPath[0] ?? 'general').toLowerCase().replace(/\s+/g, '_')
    if (!structured[key]) structured[key] = []
    // Avoid duplicate prompts in same category
    if (!structured[key].includes(chip.prompt)) {
      structured[key].push(chip.prompt)
    }
  }

  // Convert arrays to strings
  const cleanJson: Record<string, string> = {}
  for (const [k, v] of Object.entries(structured)) {
    cleanJson[k] = v.join(', ')
  }

  const rawJson = JSON.stringify(cleanJson, null, 2)

  // Step 2: Gemini improves ONLY what exists — strict rules
  const system = `You are an AI image prompt specialist. Your ONLY job is to professionally rephrase and improve existing values.

ABSOLUTE RULES — breaking any rule is failure:
1. Return ONLY a valid JSON object. No markdown, no explanation, no text outside JSON.
2. Keep ALL original keys exactly as written.
3. NEVER add elements not present in the input (no lens types, no rendering styles, no camera settings unless already in input).
4. ONLY rephrase/improve existing values with precise professional terminology.
5. Remove duplicate words within the same value.
6. If a value is already professional, keep it as-is.
7. You MAY add ONE "quality" key at the end with appropriate render quality terms.`

  const user = `Improve ONLY the existing values. Do NOT add new concepts. Return ONLY JSON:

${rawJson}`

  let aiJson = rawJson
  try {
    const raw = await ask(system, user)
    const cleaned = raw
      .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      .replace(/^[^{]*({[\s\S]*})[^}]*$/, '$1')
    JSON.parse(cleaned)
    aiJson = cleaned
  } catch (e) {
    console.error('Parse failed, using raw JSON', e)
    aiJson = rawJson
  }

  // Step 3: Build flat prompt in logical order
  const ORDER = ['style', 'subject', 'camera', 'lighting', 'environment', 'materials', 'people', 'mood', 'quality', 'render_style']
  const parsed: Record<string, string> = JSON.parse(aiJson)
  const ordered = [
    ...ORDER.filter(k => parsed[k]).map(k => parsed[k]),
    ...Object.entries(parsed).filter(([k]) => !ORDER.includes(k)).map(([, v]) => v),
  ]

  return {
    json:     JSON.stringify(parsed, null, 2),
    aiPrompt: ordered.filter(Boolean).join(', '),
  }
}

export async function translatePrompt(text: string): Promise<string> {
  if (!/[\u0600-\u06FF]/.test(text)) return text
  return ask(
    'Translate Arabic to professional English for AI image generation. Return ONLY the English translation.',
    text
  )
}
