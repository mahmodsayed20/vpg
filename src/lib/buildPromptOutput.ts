import type { BuilderChip, Separator } from '@/types'

/**
 * Build plain prompt string: "light skin tone, male, front view"
 */
export function buildPlainPrompt(chips: BuilderChip[], separator: Separator): string {
  const sep = separator === 'comma' ? ', ' : separator === 'newline' ? '\n' : '\n\n'
  return chips.map(c => c.editedPrompt ?? c.prompt).join(sep)
}

/**
 * Build structured prompt with category context:
 * "Person > Male > Skin: light skin tone, Camera > Angle: front view"
 */
export function buildContextPrompt(chips: BuilderChip[]): string {
  return chips
    .map(c => {
      const path = c.categoryPath.join(' > ')
      const text = c.editedPrompt ?? c.prompt
      return path ? `${path}: ${text}` : text
    })
    .join(', ')
}

/**
 * Build JSON tree from chips using their category paths.
 * e.g. chip with path ["Person","Male","Skin"] and prompt "light skin"
 * becomes: { "Person": { "Male": { "Skin": "light skin" } } }
 */
export function buildJSONTree(chips: BuilderChip[]): string {
  const tree: Record<string, unknown> = {}

  for (const chip of chips) {
    const path  = chip.categoryPath
    const value = chip.editedPrompt ?? chip.prompt

    if (path.length === 0) {
      // No category — put at root level
      tree[chip.title] = value
      continue
    }

    // Navigate/create nested structure
    let node = tree
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i]
      if (!node[key] || typeof node[key] !== 'object') {
        node[key] = {}
      }
      node = node[key] as Record<string, unknown>
    }

    const lastKey = path[path.length - 1]
    // If key already exists (multiple items in same leaf), merge as array
    if (lastKey in node) {
      const existing = node[lastKey]
      node[lastKey] = Array.isArray(existing)
        ? [...existing, value]
        : [existing, value]
    } else {
      node[lastKey] = value
    }
  }

  return JSON.stringify(tree, null, 2)
}
