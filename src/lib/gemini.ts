const KEY = import.meta.env.VITE_GEMINI_API_KEY

const MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-3-27b-it:free',
  'google/gemma-3-4b-it',
]

// Only used for Arabic translation
async function translateToEnglish(arabicText: string): Promise<string> {
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
          messages: [{
            role: 'user',
            content: `Translate each Arabic phrase to English. Keep the same structure, translate word by word.
Input: "${arabicText}"
Output format: translated text only, comma separated if multiple phrases.
Return ONLY the English translation, nothing else.`
          }],
          max_tokens: 200,
          temperature: 0.0,
        }),
      })
      if (!res.ok) continue
      const data = await res.json()
      const text = data.choices?.[0]?.message?.content?.trim()
      if (text) return text
    } catch (e) {
      console.warn(`${model} error:`, e)
    }
  }
  return arabicText // fallback: return as-is
}

// Check if text contains Arabic
function hasArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text)
}

// Logical key order for output
const KEY_ORDER = [
  'style', 'render_style', 'subject',
  'camera', 'lighting', 'environment',
  'materials', 'people', 'mood', 'quality',
]

export async function enhancePrompt(
  chips: Array<{ title: string; prompt: string; categoryPath: string[] }>
): Promise<{ json: string; aiPrompt: string }> {

  // Step 1: Group by top-level category + deduplicate
  const grouped: Record<string, Set<string>> = {}

  for (const chip of chips) {
    const key = (chip.categoryPath[0] ?? 'general')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')

    if (!grouped[key]) grouped[key] = new Set()

    const value = chip.prompt.trim()
    if (value) grouped[key].add(value)
  }

  // Step 2: Translate Arabic values if needed
  const translated: Record<string, string> = {}

  for (const [key, valSet] of Object.entries(grouped)) {
    const combined = Array.from(valSet).join(', ')

    if (hasArabic(combined)) {
      // Translate Arabic to English
      const eng = await translateToEnglish(combined)
      translated[key] = eng.trim()
    } else {
      translated[key] = combined
    }
  }

  // Step 3: Sort keys in logical order
  const sorted: Record<string, string> = {}

  // First add keys in preferred order
  for (const k of KEY_ORDER) {
    if (translated[k]) sorted[k] = translated[k]
  }

  // Then add remaining keys not in order list
  for (const [k, v] of Object.entries(translated)) {
    if (!KEY_ORDER.includes(k)) sorted[k] = v
  }

  const finalJson = JSON.stringify(sorted, null, 2)

  // Step 4: Build flat prompt
  const aiPrompt = Object.values(sorted).filter(Boolean).join(', ')

  return { json: finalJson, aiPrompt }
}

export async function translatePrompt(text: string): Promise<string> {
  if (!hasArabic(text)) return text
  return translateToEnglish(text)
}
