import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Plus, Grid, LayoutGrid, X } from 'lucide-react'
import { useStore } from '@/store'
import { fetchItemsByCategories, fetchAllItems } from '@/lib/db'
import { getDescendantIds } from '@/hooks/useCategoryTree'
import { useDebounce } from '@/hooks/useDebounce'
import { PromptCard } from './PromptCard'
import { clsx } from 'clsx'

export function Gallery() {
  const {
    user, items, setItems, loading, setLoading,
    activeCategoryId, categories, openModal,
    refreshTick, searchQuery, setSearchQuery,
  } = useStore()

  const [compact, setCompact] = useState(false)
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const debouncedSearch = useDebounce(localSearch, 300)

  useEffect(() => { setSearchQuery(debouncedSearch) }, [debouncedSearch])

  // Load items — depends on activeCategoryId AND categories (to resolve descendants)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      let fetched
      if (!activeCategoryId) {
        fetched = await fetchAllItems()
      } else {
        // Get this category + all its children/grandchildren IDs
        const ids = getDescendantIds(activeCategoryId, categories)
        fetched = await fetchItemsByCategories(ids)
      }
      setItems(fetched)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [activeCategoryId, categories, refreshTick])

  // Re-load whenever category changes, categories list changes, or refresh triggered
  useEffect(() => {
    load()
  }, [load])

  // Client-side search filter
  const displayed = useMemo(() => {
    if (!debouncedSearch.trim()) return items
    const q = debouncedSearch.toLowerCase()
    return items.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.prompt.toLowerCase().includes(q) ||
      i.tags.some(t => t.toLowerCase().includes(q))
    )
  }, [items, debouncedSearch])

  const gridCols = compact
    ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8'
    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'

  const activeCategory = categories.find(c => c.id === activeCategoryId)

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-bg-border bg-bg flex-shrink-0">

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            id="gallery-search"
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            placeholder="بحث في العناصر... (⌘K)"
            className="w-full pl-9 pr-8 py-2 bg-bg-card border border-bg-border rounded-xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
          {localSearch && (
            <button onClick={() => setLocalSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Breadcrumb */}
        {activeCategory && (
          <div className="hidden md:flex items-center gap-1 text-sm text-text-muted">
            <span>/</span>
            <span className="text-text-primary font-medium">{activeCategory.name}</span>
          </div>
        )}

        <div className="flex-1" />

        {/* Results count */}
        {debouncedSearch && (
          <span className="text-xs text-text-muted hidden sm:block">
            {displayed.length} نتيجة
          </span>
        )}

        {/* View toggle */}
        <div className="flex gap-0.5 bg-bg-card border border-bg-border rounded-lg p-0.5">
          <button
            onClick={() => setCompact(false)}
            className={clsx('p-1.5 rounded-md transition-colors', !compact ? 'bg-bg-border text-text-primary' : 'text-text-muted hover:text-text-primary')}
            title="عرض مريح"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCompact(true)}
            className={clsx('p-1.5 rounded-md transition-colors', compact ? 'bg-bg-border text-text-primary' : 'text-text-muted hover:text-text-primary')}
            title="عرض مضغوط"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Add item — admin only */}
        {user?.isAdmin && (
          <button
            onClick={() => openModal('item', { categoryId: activeCategoryId })}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">إضافة</span>
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4" style={{ paddingBottom: '180px' }}>

        {loading && items.length === 0 ? (
          <div className={clsx('grid gap-3', gridCols)}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-bg-card rounded-xl overflow-hidden border border-bg-border">
                <div className={clsx('animate-skeleton bg-bg-border', compact ? 'h-28' : 'h-48')} />
                <div className="p-2.5">
                  <div className="h-3 bg-bg-border animate-skeleton rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-text-muted">
            <div className="text-5xl mb-4">🖼</div>
            <p className="font-medium text-text-primary">
              {debouncedSearch ? 'لا توجد نتائج' : 'لا توجد عناصر'}
            </p>
            <p className="text-sm mt-1">
              {debouncedSearch ? 'جرب كلمة أخرى' : 'أضف أول عنصر لك'}
            </p>
            {!debouncedSearch && user?.isAdmin && (
              <button
                onClick={() => openModal('item', { categoryId: activeCategoryId })}
                className="mt-4 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold transition-colors"
              >
                إضافة عنصر
              </button>
            )}
          </div>
        ) : (
          <div className={clsx('grid gap-3', gridCols)}>
            {displayed.map(item => (
              <PromptCard
                key={item.id}
                item={item}
                compact={compact}
                onRefresh={load}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
