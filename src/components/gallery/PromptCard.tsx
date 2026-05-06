import { memo, useState } from 'react'
import { Plus, Edit2, Trash2, Copy, Eye, Check } from 'lucide-react'
import { useStore } from '@/store'
import { deleteItem, duplicateItem } from '@/lib/db'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import type { PromptItem } from '@/lib/db.types'

interface Props {
  item: PromptItem
  imgHeight: number        // dynamic height from slider
  onRefresh: () => void
  selected?: boolean
  onCardClick?: (e: React.MouseEvent) => void
  onRightClick?: (e: React.MouseEvent) => void
}

export const PromptCard = memo(function PromptCard({
  item, imgHeight, onRefresh, selected, onCardClick, onRightClick
}: Props) {
  const { user, addChip, openModal } = useStore()
  const [imgLoaded, setImgLoaded] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  function handleAddToBuilder(e: React.MouseEvent) {
    e.stopPropagation()
    const result = addChip(item)
    if (result === 'added') {
      setJustAdded(true)
      setTimeout(() => setJustAdded(false), 1200)
      toast.success(`أُضيف: ${item.title}`)
    } else {
      toast('موجود بالفعل في البانيل', { icon: '⚠️' })
    }
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

  const isSmall = imgHeight < 120

  return (
    <div
      className={clsx(
        'group relative bg-bg-card border-2 rounded-xl overflow-hidden transition-all select-none',
        'hover:shadow-lg hover:-translate-y-0.5',
        selected
          ? 'border-accent shadow-md shadow-accent/20 ring-2 ring-accent/30'
          : 'border-bg-border hover:border-accent/40',
        'animate-fade-in'
      )}
      // Right click = context menu
      onContextMenu={onRightClick}
      // Left click = selection logic (handled by parent)
      onClick={onCardClick}
      style={{ cursor: 'default' }}
    >
      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-2 left-2 z-10 w-5 h-5 bg-accent rounded-md flex items-center justify-center shadow-sm pointer-events-none">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </div>
      )}

      {/* Image area */}
      <div className="relative overflow-hidden bg-bg-secondary" style={{ height: imgHeight }}>
        {!imgLoaded && item.imageUrl && (
          <div className="absolute inset-0 animate-skeleton bg-bg-border" />
        )}
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            className={clsx(
              'w-full h-full transition-opacity duration-300',
              item.displayMode === 'cover' ? 'object-cover' : 'object-contain p-2',
              imgLoaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-text-muted">🖼</div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* ── ADD BUTTON — only this adds to builder ── */}
        <button
          onClick={handleAddToBuilder}
          className={clsx(
            'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10',
            'rounded-full flex items-center justify-center transition-all shadow-xl',
            'opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100',
            isSmall ? 'w-8 h-8' : 'w-11 h-11',
            justAdded
              ? 'bg-green-500 text-white'
              : 'bg-accent hover:bg-accent-hover text-white'
          )}
          title="إضافة للبانيل"
        >
          {justAdded
            ? <Check className={isSmall ? 'w-3 h-3' : 'w-4 h-4'} />
            : <Plus  className={isSmall ? 'w-3 h-3' : 'w-4 h-4'} />
          }
        </button>

        {/* Admin actions — top right */}
        {user?.isAdmin && !isSmall && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
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

      {/* Info — hide on very small cards */}
      {!isSmall && (
        <div className="p-2">
          <p className="text-text-primary text-xs font-medium truncate">{item.title}</p>
        </div>
      )}
    </div>
  )
})
