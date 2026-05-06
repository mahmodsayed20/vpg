import { memo, useState } from 'react'
import { Plus, Edit2, Trash2, Copy, Eye, Check } from 'lucide-react'
import { useStore } from '@/store'
import { deleteItem, duplicateItem } from '@/lib/db'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import type { PromptItem } from '@/lib/db.types'

interface Props {
  item: PromptItem
  compact: boolean
  onRefresh: () => void
  selected?: boolean
  onCardClick?: (e: React.MouseEvent) => void
  onRightClick?: (e: React.MouseEvent) => void
}

export const PromptCard = memo(function PromptCard({
  item, compact, onRefresh, selected, onCardClick, onRightClick
}: Props) {
  const { user, openModal } = useStore()
  const [imgLoaded, setImgLoaded] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  function handleAddClick(e: React.MouseEvent) {
    e.stopPropagation()
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1200)
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`حذف "${item.title}"؟`)) return
    await deleteItem(item.id)
    onRefresh()
    toast.success('تم الحذف')
  }

  async function handleDuplicate(e: React.MouseEvent) {
    e.stopPropagation()
    await duplicateItem(item)
    onRefresh()
    toast.success('تم النسخ')
  }

  const imgH = compact ? 'h-32' : 'h-52'

  return (
    <div
      className={clsx(
        'group relative bg-bg-card border-2 rounded-xl overflow-hidden transition-all cursor-pointer select-none',
        'hover:shadow-lg hover:-translate-y-0.5',
        selected
          ? 'border-accent shadow-md shadow-accent/20 ring-2 ring-accent/30'
          : 'border-bg-border hover:border-accent/40',
        'animate-fade-in'
      )}
      onClick={onCardClick}
      onContextMenu={onRightClick}
    >
      {/* Selection checkbox */}
      {selected && (
        <div className="absolute top-2 left-2 z-10 w-5 h-5 bg-accent rounded-md flex items-center justify-center shadow-sm">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </div>
      )}

      {/* Image area */}
      <div className={clsx('relative overflow-hidden bg-bg-secondary', imgH)}>
        {!imgLoaded && item.imageUrl && (
          <div className="absolute inset-0 animate-skeleton bg-bg-border" />
        )}
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} loading="lazy"
            onLoad={() => setImgLoaded(true)}
            className={clsx('w-full h-full transition-opacity duration-300',
              item.displayMode === 'cover' ? 'object-cover' : 'object-contain p-2',
              imgLoaded ? 'opacity-100' : 'opacity-0'
            )} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-text-muted">🖼</div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Add button — center */}
        <button
          onClick={e => { e.stopPropagation(); onCardClick?.(e); handleAddClick(e) }}
          className={clsx(
            'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-xl',
            'opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100',
            justAdded ? 'bg-green-500 text-white' : 'bg-accent hover:bg-accent-hover text-white'
          )}
          title="إضافة للبانيل"
        >
          {justAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>

        {/* Admin actions — top right */}
        {user?.isAdmin && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={e => { e.stopPropagation(); openModal('preview', item) }}
              className="p-1.5 bg-white/90 backdrop-blur rounded-lg text-text-secondary hover:text-text-primary shadow-sm">
              <Eye className="w-3 h-3" />
            </button>
            <button onClick={e => { e.stopPropagation(); openModal('item', { edit: item }) }}
              className="p-1.5 bg-white/90 backdrop-blur rounded-lg text-text-secondary hover:text-text-primary shadow-sm">
              <Edit2 className="w-3 h-3" />
            </button>
            <button onClick={handleDuplicate}
              className="p-1.5 bg-white/90 backdrop-blur rounded-lg text-text-secondary hover:text-text-primary shadow-sm">
              <Copy className="w-3 h-3" />
            </button>
            <button onClick={handleDelete}
              className="p-1.5 bg-white/90 backdrop-blur rounded-lg text-text-secondary hover:text-red-500 shadow-sm">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-text-primary text-xs font-medium truncate">{item.title}</p>
        {!compact && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.tags.slice(0, 3).map(t => (
              <span key={t} className="text-xs px-1.5 py-0.5 bg-bg-secondary text-text-muted rounded">{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})
