import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
  query, orderBy, serverTimestamp, writeBatch, where, getDoc,
  limit, startAfter, type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Category, PromptItem, PromptItemFormData } from './db.types'

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
  const childQ = query(catCol(), where('parentId', '==', id))
  const children = await getDocs(childQ)
  const batch = writeBatch(db)
  children.docs.forEach(c => batch.update(c.ref, { parentId: null, updatedAt: serverTimestamp() }))
  batch.delete(doc(db, 'categories', id))
  await batch.commit()
}

// ─── Prompt Items ─────────────────────────────────────────────────────────────

export async function fetchAllItems(): Promise<PromptItem[]> {
  // Simple query — no composite index needed
  const snap = await getDocs(query(itemCol(), orderBy('sortOrder', 'asc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as PromptItem))
}

export async function fetchItemsByCategories(categoryIds: string[]): Promise<PromptItem[]> {
  if (categoryIds.length === 0) return []
  
  const all: PromptItem[] = []
  
  // Fetch by categoryId WITHOUT orderBy to avoid composite index requirement
  // Then sort client-side
  for (let i = 0; i < categoryIds.length; i += 30) {
    const chunk = categoryIds.slice(i, i + 30)
    const snap = await getDocs(
      query(itemCol(), where('categoryId', 'in', chunk))
    )
    all.push(...snap.docs.map(d => ({ id: d.id, ...d.data() } as PromptItem)))
  }
  
  // Sort client-side by sortOrder
  all.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  
  return all
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
    title:        item.title + ' (copy)',
    prompt:       item.prompt,
    imageUrl:     item.imageUrl,
    imagePath:    item.imagePath,
    categoryId:   item.categoryId,
    categoryPath: item.categoryPath,
    tags:         [...item.tags],
    notes:        item.notes,
    displayMode:  item.displayMode,
    sortOrder:    maxS + 1,
    createdAt:    serverTimestamp(),
    updatedAt:    serverTimestamp(),
  })
  return ref.id
}
