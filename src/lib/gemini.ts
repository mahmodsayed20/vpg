const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`

async function ask(prompt: string): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
  })
  if (!res.ok) throw new Error('Gemini API error')
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// ─── Enhance prompt for AI image generation ───────────────────────────────────
export async function enhancePrompt(rawPrompt: string): Promise<string> {
  return ask(
    `You are an expert AI image generation prompt engineer.
Enhance the following prompt to be more detailed, vivid, and effective for AI image generation tools like Midjourney, DALL-E, or Stable Diffusion.
Keep the same meaning but add lighting, style, quality modifiers.
Return ONLY the enhanced prompt text, nothing else.

Original prompt:
${rawPrompt}`
  )
}

// ─── Convert prompt tree to structured JSON ───────────────────────────────────
export async function convertToJSON(
  chips: Array<{ title: string; prompt: string; categoryPath: string[] }>
): Promise<string> {
  const input = chips
    .map(c => `Category path: ${c.categoryPath.join(' > ')}\nTitle: ${c.title}\nPrompt: ${c.prompt}`)
    .join('\n\n---\n\n')

  const raw = await ask(
    `Convert the following prompt items into a structured JSON object.
Group them by their category hierarchy (the category path shows the tree structure).
Each leaf node should have the prompt value.
Return ONLY valid JSON, no markdown, no explanation.

Example output:
{
  "person": {
    "gender": {
      "male": {
        "skin": "light skin tone, smooth texture"
      }
    }
  }
}

Items to convert:
${input}`
  )

  // Clean markdown fences if Gemini adds them
  return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
}

// ─── Translate Arabic prompt to English ───────────────────────────────────────
export async function translatePrompt(text: string): Promise<string> {
  // Only translate if contains Arabic characters
  if (!/[\u0600-\u06FF]/.test(text)) return text

  return ask(
    `Translate the following Arabic text to professional English suitable for AI image generation.
Return ONLY the English translation, nothing else.

Arabic text:
${text}`
  )
}
