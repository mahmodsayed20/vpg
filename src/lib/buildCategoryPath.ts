import type { Category } from './db.types'

/**
 * Given a categoryId and flat list of categories,
 * returns the full path of names from root to leaf.
 * e.g. ["Person", "Male", "Skin"]
 */
export function buildCategoryPath(categoryId: string, categories: Category[]): string[] {
  const map = new Map(categories.map(c => [c.id, c]))
  const path: string[] = []

  let current = map.get(categoryId)
  while (current) {
    path.unshift(current.name)
    current = current.parentId ? map.get(current.parentId) : undefined
  }

  return path
}
