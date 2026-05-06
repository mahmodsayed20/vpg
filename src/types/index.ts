import { Timestamp } from 'firebase/firestore'

export interface AppUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  isAdmin: boolean
}

// ─── Category ─────────────────────────────────────────────────────────────────
export interface Category {
  id: string
  name: string
  parentId: string | null
  sortOrder: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CategoryNode extends Category {
  children: CategoryNode[]
  itemCount: number
}

// ─── Prompt Item ──────────────────────────────────────────────────────────────
export type DisplayMode = 'cover' | 'contain'

export interface PromptItem {
  id: string
  title: string
  prompt: string           // English prompt text
  imageUrl: string
  imagePath: string        // Cloudinary public_id
  categoryId: string
  categoryPath: string[]   // [grandparent, parent, self] names for JSON context
  tags: string[]
  notes: string
  displayMode: DisplayMode
  sortOrder: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Builder ─────────────────────────────────────────────────────────────────
export interface BuilderChip {
  id: string            // PromptItem.id
  title: string
  prompt: string
  editedPrompt?: string
  categoryPath: string[]
}

export type Separator = 'comma' | 'newline' | 'paragraph'

// ─── Output formats ───────────────────────────────────────────────────────────
export interface PromptOutput {
  plain: string           // "light skin tone, male, ..."
  structured: string      // JSON tree string
  geminiEnhanced?: string // Gemini-improved version
}
