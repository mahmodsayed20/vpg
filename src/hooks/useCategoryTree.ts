import { useMemo } from 'react'
import { useStore } from '@/store'
import type { Category } from '@/lib/db.types'
import type { CategoryNode } from '@/types'

export function useCategoryTree() {
  const { categories, items } = useStore()

  const countMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) {
      map.set(item.categoryId, (map.get(item.categoryId) ?? 0) + 1)
    }
    return map
  }, [items])

  const tree = useMemo(() => buildTree(categories, countMap), [categories, countMap])

  return tree
}

function buildTree(cats: Category[], countMap: Map<string, number>): CategoryNode[] {
  const nodeMap = new Map<string, CategoryNode>()
  for (const c of cats) {
    nodeMap.set(c.id, { ...c, children: [], itemCount: countMap.get(c.id) ?? 0 })
  }

  const roots: CategoryNode[] = []
  for (const c of cats) {
    const node = nodeMap.get(c.id)!
    if (c.parentId && nodeMap.has(c.parentId)) {
      nodeMap.get(c.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const sort = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder)
    nodes.forEach(n => sort(n.children))
  }
  sort(roots)

  return roots
}

/** Returns all descendant category IDs including the given ID */
export function getDescendantIds(categoryId: string, categories: Category[]): string[] {
  const ids = new Set<string>([categoryId])
  const queue = [categoryId]
  while (queue.length) {
    const pid = queue.shift()!
    categories.filter(c => c.parentId === pid).forEach(c => {
      ids.add(c.id)
      queue.push(c.id)
    })
  }
  return Array.from(ids)
}
