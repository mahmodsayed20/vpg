import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
  query, orderBy, serverTimestamp, writeBatch, where, getDoc,
  limit, startAfter, type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Category, PromptItem, PromptItemFormData } from './db.types'

// ─── Helpers ──────────────────────────────────────────────────────────────────
// All data is stored in a single shared collection (admin-only writes via security rules)
const catCol  = () => collection(db, 'categories')
const itemCol = () => collection(db, 'promptItems')

// ─── Categories ───────────────────────────────────────────────────────────────
export async function fetchCategories(): Promise<Category[]> {
  const snap = await getDocs(query(catCol(), orderBy('sortOrder', 'asc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Category))
}

export async function createCategory(data: { name: string; parentId: string | null }): Promise<string> {
  const all  = await getDocs(catCol())
  const maxS = all.docs.reduce((m, d) => Math.max(m, d.data().sortOrder ?? 0), 0)
  const ref  = await addDoc(catCol(), {
    name: data.name.trim(),
    parentId: data.parentId ?? null,
    sortOrder: maxS + 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateCategory(id: string, data: { name?: string; parentId?: string | null }): Promise<void> {
  await updateDoc(doc(db, 'categories', id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteCategory(id: string): Promise<void> {
  // Move children to root level
  const childQ = query(catCol(), where('parentId', '==', id))
  const children = await getDocs(childQ)
  const batch = writeBatch(db)
  children.docs.forEach(c => batch.update(c.ref, { parentId: null, updatedAt: serverTimestamp() }))
  batch.delete(doc(db, 'categories', id))
  await batch.commit()
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const batch = writeBatch(db)
  orderedIds.forEach((id, i) =>
    batch.update(doc(db, 'categories', id), { sortOrder: i, updatedAt: serverTimestamp() })
  )
  await batch.commit()
}

// ─── Prompt Items ─────────────────────────────────────────────────────────────
export async function fetchItems(opts: {
  categoryIds?: string[]
  cursor?: DocumentSnapshot | null
  pageSize?: number
}): Promise<{ items: PromptItem[]; lastDoc: DocumentSnapshot | null }> {
  const { categoryIds, cursor, pageSize = 36 } = opts

  let q = query(itemCol(), orderBy('sortOrder', 'asc'), limit(pageSize))

  if (categoryIds && categoryIds.length === 1) {
    q = query(itemCol(), where('categoryId', '==', categoryIds[0]), orderBy('sortOrder', 'asc'), limit(pageSize))
  }

  if (cursor) q = query(q, startAfter(cursor))

  const snap = await getDocs(q)
  return {
    items:   snap.docs.map(d => ({ id: d.id, ...d.data() } as PromptItem)),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
  }
}

export async function fetchItemsByCategories(categoryIds: string[]): Promise<PromptItem[]> {
  if (categoryIds.length === 0) return []
  const all: PromptItem[] = []
  // Firestore 'in' supports max 30 items — chunk if needed
  for (let i = 0; i < categoryIds.length; i += 30) {
    const chunk = categoryIds.slice(i, i + 30)
    const snap = await getDocs(query(itemCol(), where('categoryId', 'in', chunk), orderBy('sortOrder', 'asc')))
    all.push(...snap.docs.map(d => ({ id: d.id, ...d.data() } as PromptItem)))
  }
  return all
}

export async function fetchAllItems(): Promise<PromptItem[]> {
  const snap = await getDocs(query(itemCol(), orderBy('sortOrder', 'asc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as PromptItem))
}

export async function createItem(data: PromptItemFormData): Promise<string> {
  const all  = await getDocs(itemCol())
  const maxS = all.docs.reduce((m, d) => Math.max(m, d.data().sortOrder ?? 0), 0)
  const ref  = await addDoc(itemCol(), {
    title:        data.title.trim(),
    prompt:       data.prompt.trim(),
    imageUrl:     data.imageUrl ?? '',
    imagePath:    data.imagePath ?? '',
    categoryId:   data.categoryId,
    categoryPath: data.categoryPath ?? [],
    tags:         data.tags ?? [],
    notes:        data.notes?.trim() ?? '',
    displayMode:  data.displayMode ?? 'cover',
    sortOrder:    maxS + 1,
    createdAt:    serverTimestamp(),
    updatedAt:    serverTimestamp(),
  })
  return ref.id
}

export async function updateItem(id: string, data: Partial<PromptItemFormData>): Promise<void> {
  const clean = { ...data }
  delete (clean as any).imageFile
  await updateDoc(doc(db, 'promptItems', id), { ...clean, updatedAt: serverTimestamp() })
}

export async function deleteItem(id: string): Promise<void> {
  await deleteDoc(doc(db, 'promptItems', id))
}

export async function duplicateItem(item: PromptItem): Promise<string> {
  const all  = await getDocs(itemCol())
  const maxS = all.docs.reduce((m, d) => Math.max(m, d.data().sortOrder ?? 0), 0)
  const ref  = await addDoc(itemCol(), {
    ...item,
    id:        undefined,
    title:     item.title + ' (copy)',
    sortOrder: maxS + 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}
