import type { Timestamp } from 'firebase/firestore'
import type { DisplayMode } from '@/types'

export interface Category {
  id: string
  name: string
  parentId: string | null
  sortOrder: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface PromptItem {
  id: string
  title: string
  prompt: string
  imageUrl: string
  imagePath: string
  categoryId: string
  categoryPath: string[]
  tags: string[]
  notes: string
  displayMode: DisplayMode
  sortOrder: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface PromptItemFormData {
  title: string
  prompt: string
  imageUrl?: string
  imagePath?: string
  imageFile?: File | null
  categoryId: string
  categoryPath: string[]
  tags: string[]
  notes: string
  displayMode: DisplayMode
}
