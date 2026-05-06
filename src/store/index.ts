import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Category } from '@/lib/db.types'
import type { PromptItem } from '@/lib/db.types'
import type { BuilderChip, Separator, AppUser } from '@/types'

interface Store {
  // Auth
  user: AppUser | null
  authReady: boolean
  setUser: (u: AppUser | null) => void
  setAuthReady: (v: boolean) => void

  // Theme
  theme: 'light' | 'dark'
  toggleTheme: () => void

  // Categories
  categories: Category[]
  setCategories: (c: Category[]) => void
  activeCategoryId: string | null
  setActiveCategoryId: (id: string | null) => void

  // Gallery
  items: PromptItem[]
  setItems: (i: PromptItem[]) => void
  appendItems: (i: PromptItem[]) => void
  refreshTick: number
  refresh: () => void
  loading: boolean
  setLoading: (v: boolean) => void
  hasMore: boolean
  setHasMore: (v: boolean) => void
  searchQuery: string
  setSearchQuery: (q: string) => void

  // Modal
  modal: { type: string | null; data?: unknown }
  openModal: (type: string, data?: unknown) => void
  closeModal: () => void

  // Builder (persisted)
  chips: BuilderChip[]
  addChip: (item: PromptItem) => 'added' | 'duplicate'
  removeChip: (id: string) => void
  clearChips: () => void
  reorderChips: (chips: BuilderChip[]) => void
  updateChipPrompt: (id: string, text: string) => void
  separator: Separator
  setSeparator: (s: Separator) => void
  builderOpen: boolean
  setBuilderOpen: (v: boolean) => void
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      authReady: false,
      setUser: user => set({ user }),
      setAuthReady: authReady => set({ authReady }),

      // Theme — default light
      theme: 'light',
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        set({ theme: next })
        document.documentElement.classList.toggle('dark', next === 'dark')
      },

      // Categories
      categories: [],
      setCategories: categories => set({ categories }),
      activeCategoryId: null,
      setActiveCategoryId: activeCategoryId => set({
        activeCategoryId, items: [], hasMore: true,
        refreshTick: get().refreshTick + 1,
      }),

      // Gallery
      items: [],
      setItems: items => set({ items }),
      appendItems: more => set(s => ({ items: [...s.items, ...more] })),
      refreshTick: 0,
      refresh: () => set(s => ({ refreshTick: s.refreshTick + 1, items: [], hasMore: true })),
      loading: false,
      setLoading: loading => set({ loading }),
      hasMore: true,
      setHasMore: hasMore => set({ hasMore }),
      searchQuery: '',
      setSearchQuery: searchQuery => set({ searchQuery }),

      // Modal
      modal: { type: null },
      openModal: (type, data) => set({ modal: { type, data } }),
      closeModal: () => set({ modal: { type: null } }),

      // Builder
      chips: [],
      addChip: (item) => {
        if (get().chips.some(c => c.id === item.id)) return 'duplicate'
        set(s => ({
          chips: [...s.chips, { id: item.id, title: item.title, prompt: item.prompt, categoryPath: item.categoryPath }],
          builderOpen: true,
        }))
        return 'added'
      },
      removeChip: id => set(s => ({ chips: s.chips.filter(c => c.id !== id) })),
      clearChips: () => set({ chips: [] }),
      reorderChips: chips => set({ chips }),
      updateChipPrompt: (id, text) => set(s => ({
        chips: s.chips.map(c => c.id === id ? { ...c, editedPrompt: text } : c),
      })),
      separator: 'comma',
      setSeparator: separator => set({ separator }),
      builderOpen: true,
      setBuilderOpen: builderOpen => set({ builderOpen }),
    }),
    {
      name: 'athar-store',
      partialize: s => ({ chips: s.chips, separator: s.separator, builderOpen: s.builderOpen, theme: s.theme }),
    }
  )
)
