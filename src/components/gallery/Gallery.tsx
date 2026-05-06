import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Search, Plus, Grid, LayoutGrid, X, Trash2, FolderInput, CheckSquare } from 'lucide-react'
import { useStore } from '@/store'
import { fetchItemsByCategories, fetchAllItems, deleteItem } from '@/lib/db'
import { getDescendantIds } from '@/hooks/useCategoryTree'
import { useDebounce } from '@/hooks/useDebounce'
import { PromptCard } from './PromptCard'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import type { PromptItem } from '@/lib/db.types'

export function Gallery() {
  const {
    user, items, setItems, loading, setLoading,
    activeCategoryId, categories, openModal,
    refreshTick, searchQuery, setSearchQuery, addChip,
  } = useStore()

  const [compact, setCompact]             = useState(false)
  const [localSearch, setLocalSearch]     = useState(searchQuery)
  const debouncedSearch                   = useDebounce(localSearch, 300)

  // ── Multi-select state ────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set())
  const lastSelectedIdx                   = useRef<number>(-1)

  // ── Context menu for bulk selection ──────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => { setSearchQuery(debouncedSearch) }, [debouncedSearch])

  const load = useCallback(async () => {
    setLoading(true)
    setSelectedIds(new Set()) // clear selection on reload
    try {
      let fetched
      if (!activeCategoryId) {
        fetched = await fetchAllItems()
      } else {
        const ids = getDescendantIds(activeCategoryId, categories)
        fetched = await fetchItemsByCategories(ids)
      }
      setItems(fetched)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [activeCategoryId, categories, refreshTick])

  useEffect(() => { load() }, [load])

  // Escape clears selection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedIds(new Set())
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Close context menu on click outside
  useEffect(() => {
    if (!ctxMenu) return
    const handler = () => setCtxMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
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

  // ── Selection handlers ────────────────────────────────────────────────────
  function handleCardClick(item: PromptItem, idx: number, e: React.MouseEvent) {
    // Ctrl/Cmd + Click = toggle single item
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.has(item.id) ? next.delete(item.id) : next.add(item.id)
        return next
      })
      lastSelectedIdx.current = idx
      return
    }

    // Shift + Click = select range
    if (e.shiftKey && lastSelectedIdx.current >= 0) {
      e.preventDefault()
      const start = Math.min(lastSelectedIdx.current, idx)
      const end   = Math.max(lastSelectedIdx.current, idx)
      const rangeIds = displayed.slice(start, end + 1).map(i => i.id)
      setSelectedIds(prev => {
        const next = new Set(prev)
        rangeIds.forEach(id => next.add(id))
        return next
      })
      return
    }

    // Normal click with no selection active = add to builder
    if (selectedIds.size === 0) {
      const result = addChip(item)
      if (result === 'duplicate') toast('موجود بالفعل في البانيل', { icon: '⚠️' })
      else toast.success(`أُضيف: ${item.title}`)
      return
    }

    // Normal click with selection active = toggle
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(item.id) ? next.delete(item.id) : next.add(item.id)
      return next
    })
    lastSelectedIdx.current = idx
  }

  function handleRightClick(e: React.MouseEvent, item: PromptItem, idx: number) {
    e.preventDefault()
    // If right-clicked item not in selection, select it
    if (!selectedIds.has(item.id)) {
      setSelectedIds(new Set([item.id]))
      lastSelectedIdx.current = idx
    }
    setCtxMenu({ x: e.clientX, y: e.clientY })
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────
  const selectedItems = displayed.filter(i => selectedIds.has(i.id))

  async function handleBulkDelete() {
    if (!user?.isAdmin) return
    if (!confirm(`حذف ${selectedIds.size} عنصر؟`)) return
    try {
      await Promise.all(selectedItems.map(i => deleteItem(i.id)))
      toast.success(`تم حذف ${selectedIds.size} عنصر`)
      setSelectedIds(new Set())
      load()
    } catch { toast.error('حدث خطأ في الحذف') }
    setCtxMenu(null)
  }

  function handleBulkAddToBuilder() {
    let added = 0
    selectedItems.forEach(item => {
      if (addChip(item) === 'added') added++
    })
    toast.success(`أُضيف ${added} عنصر للبانيل`)
    setCtxMenu(null)
  }

  function selectAll() {
    setSelectedIds(new Set(displayed.map(i => i.id)))
    setCtxMenu(null)
  }

  const gridCols = compact
    ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8'
    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'

  const activeCategory = categories.find(c => c.id === activeCategoryId)

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-bg-border bg-bg flex-shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input id="gallery-search" value={localSearch} onChange={e => setLocalSearch(e.target.value)}
            placeholder="بحث في العناصر... (⌘K)"
            className="w-full pl-9 pr-8 py-2 bg-bg-card border border-bg-border rounded-xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 transition-colors" />
          {localSearch && (
            <button onClick={() => setLocalSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {activeCategory && (
          <div className="hidden md:flex items-center gap-1 text-sm text-text-muted">
            <span>/</span>
            <span className="text-text-primary font-medium">{activeCategory.name}</span>
          </div>
        )}

        <div className="flex-1" />

        {/* Selection info bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/30 rounded-xl">
            <span className="text-xs font-semibold text-accent">{selectedIds.size} محدد</span>
            <button onClick={handleBulkAddToBuilder}
              className="text-xs px-2 py-1 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors">
              + إضافة للبانيل
            </button>
            {user?.isAdmin && (
              <button onClick={handleBulkDelete}
                className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors">
                حذف
              </button>
            )}
            <button onClick={() => setSelectedIds(new Set())}
              className="text-text-muted hover:text-text-primary transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex gap-0.5 bg-bg-card border border-bg-border rounded-lg p-0.5">
          <button onClick={() => setCompact(false)}
            className={clsx('p-1.5 rounded-md transition-colors', !compact ? 'bg-bg-border text-text-primary' : 'text-text-muted hover:text-text-primary')}>
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setCompact(true)}
            className={clsx('p-1.5 rounded-md transition-colors', compact ? 'bg-bg-border text-text-primary' : 'text-text-muted hover:text-text-primary')}>
            <Grid className="w-3.5 h-3.5" />
          </button>
        </div>

        {user?.isAdmin && (
          <button onClick={() => openModal('item', { categoryId: activeCategoryId })}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">إضافة</span>
          </button>
        )}
      </div>

      {/* Hint when nothing selected */}
      {selectedIds.size === 0 && displayed.length > 0 && !loading && (
        <div className="px-4 py-1.5 bg-bg-card border-b border-bg-border flex-shrink-0">
          <p className="text-xs text-text-muted">
            💡 اضغط للإضافة للبانيل · <kbd className="px-1 py-0.5 bg-bg-border rounded text-xs">Ctrl+Click</kbd> للتحديد ·
            <kbd className="px-1 py-0.5 bg-bg-border rounded text-xs mx-1">Shift+Click</kbd> لتحديد نطاق ·
            كليك يمين للخيارات
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4" style={{ paddingBottom: '180px' }}>
        {loading && items.length === 0 ? (
          <div className={clsx('grid gap-3', gridCols)}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-bg-card rounded-xl overflow-hidden border border-bg-border">
                <div className={clsx('animate-skeleton bg-bg-border', compact ? 'h-28' : 'h-48')} />
                <div className="p-2.5"><div className="h-3 bg-bg-border animate-skeleton rounded w-3/4" /></div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-text-muted">
            <div className="text-5xl mb-4">🖼</div>
            <p className="font-medium text-text-primary">{debouncedSearch ? 'لا توجد نتائج' : 'لا توجد عناصر'}</p>
            {!debouncedSearch && user?.isAdmin && (
              <button onClick={() => openModal('item', { categoryId: activeCategoryId })}
                className="mt-4 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold transition-colors">
                إضافة عنصر
              </button>
            )}
          </div>
        ) : (
          <div className={clsx('grid gap-3', gridCols)}>
            {displayed.map((item, idx) => (
              <PromptCard
                key={item.id}
                item={item}
                compact={compact}
                onRefresh={load}
                selected={selectedIds.has(item.id)}
                onCardClick={(e) => handleCardClick(item, idx, e)}
                onRightClick={(e) => handleRightClick(e, item, idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {ctxMenu && (
        <div
          className="fixed z-50 bg-white border border-bg-border rounded-xl shadow-2xl py-1.5 min-w-[180px] animate-fade-in"
          style={{ left: Math.min(ctxMenu.x, window.innerWidth - 200), top: Math.min(ctxMenu.y, window.innerHeight - 200) }}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b border-bg-border mb-1">
            <span className="text-xs font-semibold text-text-muted">{selectedIds.size} عنصر محدد</span>
          </div>

          <button onClick={handleBulkAddToBuilder}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-card transition-colors text-right">
            <Plus className="w-3.5 h-3.5 text-accent" />
            إضافة للبانيل
          </button>

          <button onClick={selectAll}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-card transition-colors text-right">
            <CheckSquare className="w-3.5 h-3.5 text-text-muted" />
            تحديد الكل
          </button>

          <button onClick={() => { setSelectedIds(new Set()); setCtxMenu(null) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-card transition-colors text-right">
            <X className="w-3.5 h-3.5 text-text-muted" />
            إلغاء التحديد
          </button>

          {user?.isAdmin && (
            <>
              <div className="border-t border-bg-border my-1" />
              <button onClick={handleBulkDelete}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors text-right">
                <Trash2 className="w-3.5 h-3.5" />
                حذف المحدد ({selectedIds.size})
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
