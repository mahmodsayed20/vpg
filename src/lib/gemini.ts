const KEY = import.meta.env.VITE_GEMINI_API_KEY

async function ask(prompt: string): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${KEY}`,
      'HTTP-Referer':  'https://vpg-woad.vercel.app',
      'X-Title':       'Visual Prompt Gallery',
    },
    body: JSON.stringify({
      model:    'google/gemini-flash-1.5',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
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

export async function enhancePrompt(rawPrompt: string): Promise<string> {
  return ask(
    `You are an expert AI image generation prompt engineer.
Enhance this prompt for Midjourney or Stable Diffusion.
Add lighting, style, camera settings, and quality modifiers.
Return ONLY the enhanced prompt, nothing else.

Prompt: ${rawPrompt}`
  )
}

export async function convertToJSON(
  chips: Array<{ title: string; prompt: string; categoryPath: string[] }>
): Promise<string> {
  const input = chips
    .map(c => `Category: ${c.categoryPath.join(' > ')}\nPrompt: ${c.prompt}`)
    .join('\n---\n')
  const raw = await ask(
    `Convert these to structured JSON tree grouped by category. Return ONLY valid JSON:
${input}`
  )
  return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
}

export async function translatePrompt(text: string): Promise<string> {
  if (!/[\u0600-\u06FF]/.test(text)) return text
  return ask(`Translate to English for AI image generation. Return ONLY translation: ${text}`)
}
