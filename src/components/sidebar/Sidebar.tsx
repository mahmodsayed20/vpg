import { useState, useCallback } from 'react'
import { Plus, Search, X, FolderOpen, Folder, ChevronRight, Edit2, Trash2, FolderPlus } from 'lucide-react'
import { useStore } from '@/store'
import { useCategoryTree } from '@/hooks/useCategoryTree'
import { deleteCategory, fetchCategories } from '@/lib/db'
import type { CategoryNode } from '@/types'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, activeCategoryId, setActiveCategoryId, openModal, setCategories, items } = useStore()
  const tree = useCategoryTree()
  const [search, setSearch]     = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`حذف "${name}"؟ العناصر الداخلية لن تُحذف.`)) return
    try {
      await deleteCategory(id)
      setCategories(await fetchCategories())
      toast.success('تم حذف القسم')
    } catch { toast.error('فشل الحذف') }
  }

  function renderNode(node: CategoryNode, depth = 0) {
    const hasChildren = node.children.length > 0
    const isExpanded  = expanded.has(node.id)
    const isActive    = activeCategoryId === node.id

    // Count items in this node + all descendants
    const countInNode = items.filter(i => i.categoryId === node.id).length

    return (
      <div key={node.id}>
        <div
          className={clsx(
            'group flex items-center gap-1 py-1.5 rounded-lg cursor-pointer transition-all text-sm select-none',
            isActive ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:bg-bg-card hover:text-text-primary'
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px`, paddingRight: '6px' }}
          onClick={() => { setActiveCategoryId(isActive ? null : node.id); onClose?.() }}
        >
          {/* Expand arrow */}
          <button
            className="w-5 h-5 flex items-center justify-center flex-shrink-0"
            onClick={e => { e.stopPropagation(); hasChildren && toggle(node.id) }}
          >
            {hasChildren
              ? <ChevronRight className={clsx('w-3.5 h-3.5 transition-transform', isExpanded && 'rotate-90')} />
              : isActive ? <FolderOpen className="w-3.5 h-3.5" /> : <Folder className="w-3.5 h-3.5 opacity-50" />
            }
          </button>

          <span className="flex-1 truncate font-medium">{node.name}</span>

          {/* Item count badge */}
          {countInNode > 0 && (
            <span className={clsx('text-xs px-1.5 py-0.5 rounded font-mono flex-shrink-0',
              isActive ? 'bg-accent/20 text-accent' : 'bg-bg-border text-text-muted'
            )}>
              {countInNode}
            </span>
          )}

          {/* Admin actions — show on hover */}
          {user?.isAdmin && (
            <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0 ml-0.5">
              <button
                title="إضافة قسم فرعي"
                onClick={e => { e.stopPropagation(); openModal('category', { parentId: node.id }) }}
                className="p-1 rounded hover:bg-bg-border text-text-muted hover:text-text-primary transition-colors"
              >
                <FolderPlus className="w-3 h-3" />
              </button>
              <button
                title="تعديل"
                onClick={e => { e.stopPropagation(); openModal('category', { edit: node }) }}
                className="p-1 rounded hover:bg-bg-border text-text-muted hover:text-text-primary transition-colors"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                title="حذف"
                onClick={e => { e.stopPropagation(); handleDelete(node.id, node.name) }}
                className="p-1 rounded hover:bg-red-950/40 text-text-muted hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(c => renderNode(c, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // Flat search
  const { categories } = useStore()
  const flat = search
    ? categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : []

  return (
    <div className="flex flex-col h-full bg-bg-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-bg-border flex-shrink-0">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-widest">الأقسام</span>
        <div className="flex items-center gap-1">
          {user?.isAdmin && (
            <button
              onClick={() => openModal('category', { parentId: null })}
              className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted hover:text-accent transition-colors"
              title="قسم جديد"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted lg:hidden">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-bg-border flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث..."
            className="w-full pl-7 pr-3 py-1.5 bg-bg-card border border-bg-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* All items */}
      <div className="px-3 pt-2 flex-shrink-0">
        <button
          onClick={() => { setActiveCategoryId(null); onClose?.() }}
          className={clsx(
            'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium transition-all',
            !activeCategoryId ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:bg-bg-card hover:text-text-primary'
          )}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">كل العناصر</span>
          <span className="text-xs font-mono bg-bg-border text-text-muted px-1.5 py-0.5 rounded">
            {items.length}
          </span>
        </button>
      </div>

      {/* Tree / search results */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {search
          ? flat.map(c => (
              <div
                key={c.id}
                onClick={() => { setActiveCategoryId(c.id); setSearch(''); onClose?.() }}
                className={clsx(
                  'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-all',
                  activeCategoryId === c.id ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:bg-bg-card'
                )}
              >
                <Folder className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{c.name}</span>
              </div>
            ))
          : tree.map(n => renderNode(n))
        }

        {categories.length === 0 && (
          <div className="text-center py-10 text-text-muted text-xs">
            <Folder className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p>لا توجد أقسام بعد</p>
            {user?.isAdmin && (
              <button onClick={() => openModal('category', { parentId: null })} className="mt-2 text-accent hover:underline">
                إنشاء قسم
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
