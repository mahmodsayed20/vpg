import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Search, Plus, X, Trash2, CheckSquare, SlidersHorizontal, FolderInput, ChevronRight } from 'lucide-react'
import { useStore } from '@/store'
import { fetchItemsByCategories, fetchAllItems, deleteItem, updateItem } from '@/lib/db'
import { getDescendantIds } from '@/hooks/useCategoryTree'
import { buildCategoryPath } from '@/lib/buildCategoryPath'
import { useDebounce } from '@/hooks/useDebounce'
import { PromptCard } from './PromptCard'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import type { PromptItem } from '@/lib/db.types'

const SIZE_CONFIG = [
  { height: 80,  cols: 'grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12' },
  { height: 120, cols: 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10' },
  { height: 180, cols: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'  },
  { height: 240, cols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'                  },
  { height: 340, cols: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'                  },
]

export function Gallery() {
  const {
    user, items, setItems, loading, setLoading,
    activeCategoryId, categories, openModal,
    refreshTick, searchQuery, setSearchQuery, addChip,
  } = useStore()

  const [localSearch, setLocalSearch] = useState(searchQuery)
  const debouncedSearch               = useDebounce(localSearch, 300)
  const [sizeIdx, setSizeIdx]         = useState(2)

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const lastSelectedIdx               = useRef<number>(-1)

  // Context menu
  const [ctxMenu, setCtxMenu]           = useState<{ x: number; y: number } | null>(null)
  const [showMoveMenu, setShowMoveMenu] = useState(false)

  useEffect(() => { setSearchQuery(debouncedSearch) }, [debouncedSearch])

  const load = useCallback(async () => {
    setLoading(true)
    setSelectedIds(new Set())
    try {
      let fetched
      if (!activeCategoryId) {
        fetched = await fetchAllItems()
      } else {
        const ids = getDescendantIds(activeCategoryId, categories)
        fetched = await fetchItemsByCategories(ids)
      }
      // ── Sort alphabetically by title ──
      fetched.sort((a, b) => a.title.localeCompare(b.title, 'ar'))
      setItems(fetched)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [activeCategoryId, categories, refreshTick])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectedIds(new Set()); setCtxMenu(null); setShowMoveMenu(false) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  useEffect(() => {
    if (!ctxMenu) return
    const h = () => { setCtxMenu(null); setShowMoveMenu(false) }
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctxMenu])

  const displayed = useMemo(() => {
    if (!debouncedSearch.trim()) return items
    const q = debouncedSearch.toLowerCase()
    return items.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.prompt.toLowerCase().includes(q) ||
      i.tags.some(t => t.toLowerCase().includes(q))
    )
  }, [items, debouncedSearch])

  // ── Selection ──────────────────────────────────────────────────────────────
  function handleCardClick(item: PromptItem, idx: number, e: React.MouseEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      setSelectedIds(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n })
      lastSelectedIdx.current = idx
      return
    }
    if (e.shiftKey && lastSelectedIdx.current >= 0) {
      e.preventDefault()
      const s = Math.min(lastSelectedIdx.current, idx)
      const en = Math.max(lastSelectedIdx.current, idx)
      setSelectedIds(prev => { const n = new Set(prev); displayed.slice(s, en + 1).forEach(i => n.add(i.id)); return n })
      return
    }
    if (selectedIds.size > 0) {
      setSelectedIds(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n })
      lastSelectedIdx.current = idx
    }
  }

  function handleRightClick(e: React.MouseEvent, item: PromptItem, idx: number) {
    e.preventDefault()
    if (!selectedIds.has(item.id)) { setSelectedIds(new Set([item.id])); lastSelectedIdx.current = idx }
    setCtxMenu({ x: e.clientX, y: e.clientY })
    setShowMoveMenu(false)
  }

  const selectedItems = displayed.filter(i => selectedIds.has(i.id))

  // ── Bulk actions ───────────────────────────────────────────────────────────
  async function handleBulkDelete() {
    if (!user?.isAdmin || !confirm(`حذف ${selectedIds.size} عنصر؟`)) return
    await Promise.all(selectedItems.map(i => deleteItem(i.id)))
    toast.success(`تم حذف ${selectedIds.size} عنصر`)
    setSelectedIds(new Set()); load(); setCtxMenu(null)
  }

  function handleBulkAdd() {
    let added = 0
    selectedItems.forEach(item => { if (addChip(item) === 'added') added++ })
    toast.success(`أُضيف ${added} عنصر للبانيل`)
    setCtxMenu(null)
  }

  async function handleMoveTo(targetCategoryId: string) {
    if (!user?.isAdmin) return
    const categoryPath = buildCategoryPath(targetCategoryId, categories)
    try {
      await Promise.all(
        selectedItems.map(item =>
          updateItem(item.id, {
            ...item,
            categoryId:   targetCategoryId,
            categoryPath,
          })
        )
      )
      const targetName = categories.find(c => c.id === targetCategoryId)?.name ?? ''
      toast.success(`تم نقل ${selectedIds.size} عنصر إلى "${targetName}"`)
      setSelectedIds(new Set())
      setCtxMenu(null)
      setShowMoveMenu(false)
      load()
    } catch {
      toast.error('حدث خطأ في النقل')
    }
  }

  const { height: imgHeight, cols: gridCols } = SIZE_CONFIG[sizeIdx]
  const activeCategory = categories.find(c => c.id === activeCategoryId)

  // Sorted categories for move menu
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name, 'ar'))

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-bg-border bg-bg flex-shrink-0 flex-wrap gap-y-2">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input id="gallery-search" value={localSearch} onChange={e => setLocalSearch(e.target.value)}
            placeholder="بحث... (⌘K)"
            className="w-full pl-9 pr-8 py-2 bg-bg-card border border-bg-border rounded-xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50" />
          {localSearch && (
            <button onClick={() => setLocalSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {activeCategory && (
          <span className="hidden md:block text-sm text-text-muted">
            / <span className="text-text-primary font-medium">{activeCategory.name}</span>
          </span>
        )}

        <div className="flex-1" />

        {/* Selection bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/30 rounded-xl">
            <span className="text-xs font-semibold text-accent">{selectedIds.size} محدد</span>
            <button onClick={handleBulkAdd}
              className="text-xs px-2 py-1 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover">
              + بانيل
            </button>
            {user?.isAdmin && (
              <button onClick={handleBulkDelete}
                className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600">
                حذف
              </button>
            )}
            <button onClick={() => setSelectedIds(new Set())} className="text-text-muted hover:text-text-primary">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Size slider */}
        <div className="flex items-center gap-2 px-2 py-1 bg-bg-card border border-bg-border rounded-xl">
          <SlidersHorizontal className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
          <input type="range" min={0} max={4} step={1} value={sizeIdx}
            onChange={e => setSizeIdx(Number(e.target.value))}
            className="w-20 h-1.5 accent-accent cursor-pointer" title="حجم الكروت" />
          <span className="text-xs text-text-muted font-mono w-4 text-center">{sizeIdx + 1}</span>
        </div>

        {user?.isAdmin && (
          <button onClick={() => openModal('item', { categoryId: activeCategoryId })}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">إضافة</span>
          </button>
        )}
      </div>

      {/* Hint */}
      {selectedIds.size === 0 && displayed.length > 0 && !loading && (
        <div className="px-4 py-1.5 bg-bg-card border-b border-bg-border flex-shrink-0">
          <p className="text-xs text-text-muted">
            💡 اضغط <span className="font-semibold text-accent">+</span> للإضافة ·
            <kbd className="mx-1 px-1 py-0.5 bg-bg-border rounded text-xs">Ctrl+Click</kbd> تحديد ·
            <kbd className="mx-1 px-1 py-0.5 bg-bg-border rounded text-xs">Shift+Click</kbd> نطاق ·
            كليك يمين للخيارات
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4" style={{ paddingBottom: '180px' }}>
        {loading && items.length === 0 ? (
          <div className={clsx('grid gap-2', gridCols)}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-bg-card rounded-xl overflow-hidden border border-bg-border">
                <div className="animate-skeleton bg-bg-border" style={{ height: imgHeight }} />
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-text-muted">
            <div className="text-5xl mb-4">🖼</div>
            <p className="font-medium text-text-primary">{debouncedSearch ? 'لا توجد نتائج' : 'لا توجد عناصر'}</p>
            {!debouncedSearch && user?.isAdmin && (
              <button onClick={() => openModal('item', { categoryId: activeCategoryId })}
                className="mt-4 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold">
                إضافة عنصر
              </button>
            )}
          </div>
        ) : (
          <div className={clsx('grid gap-2', gridCols)}>
            {displayed.map((item, idx) => (
              <PromptCard
                key={item.id}
                item={item}
                imgHeight={imgHeight}
                onRefresh={load}
                selected={selectedIds.has(item.id)}
                onCardClick={(e) => handleCardClick(item, idx, e)}
                onRightClick={(e) => handleRightClick(e, item, idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Context Menu ── */}
      {ctxMenu && (
        <div
          className="fixed z-50 bg-white border border-bg-border rounded-xl shadow-2xl py-1.5 min-w-[200px] animate-fade-in"
          style={{
            left: Math.min(ctxMenu.x, window.innerWidth - 220),
            top:  Math.min(ctxMenu.y, window.innerHeight - 280),
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-3 py-1.5 border-b border-bg-border mb-1">
            <span className="text-xs font-semibold text-text-muted">{selectedIds.size} عنصر محدد</span>
          </div>

          {/* Add to builder */}
          <button onClick={handleBulkAdd}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-card transition-colors">
            <Plus className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            إضافة للبانيل
          </button>

          {/* Move to category — admin only */}
          {user?.isAdmin && (
            <div className="relative">
              <button
                onClick={e => { e.stopPropagation(); setShowMoveMenu(v => !v) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-card transition-colors"
              >
                <FolderInput className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                <span className="flex-1 text-right">نقل إلى قسم</span>
                <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
              </button>

              {/* Submenu */}
              {showMoveMenu && (
                <div
                  className="absolute left-full top-0 ml-1 bg-white border border-bg-border rounded-xl shadow-2xl py-1.5 min-w-[180px] max-h-64 overflow-y-auto animate-fade-in"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="px-3 py-1.5 border-b border-bg-border mb-1">
                    <span className="text-xs font-semibold text-text-muted">اختر القسم</span>
                  </div>
                  {sortedCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => handleMoveTo(cat.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-accent/10 hover:text-accent transition-colors text-right"
                    >
                      <span className="text-text-muted text-xs">📁</span>
                      <span className="truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Select all / deselect */}
          <button onClick={() => { setSelectedIds(new Set(displayed.map(i => i.id))); setCtxMenu(null) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-card transition-colors">
            <CheckSquare className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
            تحديد الكل
          </button>

          <button onClick={() => { setSelectedIds(new Set()); setCtxMenu(null) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-card transition-colors">
            <X className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
            إلغاء التحديد
          </button>

          {/* Delete — admin only */}
          {user?.isAdmin && (
            <>
              <div className="border-t border-bg-border my-1" />
              <button onClick={handleBulkDelete}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                حذف ({selectedIds.size})
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
