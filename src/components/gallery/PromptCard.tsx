import { memo, useState } from 'react'
import { Plus, Edit2, Trash2, Copy, Check, X, ZoomIn } from 'lucide-react'
import { useStore } from '@/store'
import { deleteItem, duplicateItem } from '@/lib/db'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import type { PromptItem } from '@/lib/db.types'

// ─── Card Preview Modal (for guests) ─────────────────────────────────────────
function CardPreview({ item, onClose }: { item: PromptItem; onClose: () => void }) {
  const { addChip } = useStore()
  const [copied, setCopied] = useState(false)
  const [added, setAdded]   = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(item.prompt)
    setCopied(true)
    toast.success('تم نسخ المطالبة')
    setTimeout(() => setCopied(false), 2000)
  }

  function handleAdd() {
    const result = addChip(item)
    if (result === 'added') {
      setAdded(true)
      toast.success(`أُضيف: ${item.title}`)
      setTimeout(() => { setAdded(false); onClose() }, 800)
    } else {
      toast('موجود بالفعل في البانيل', { icon: '⚠️' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl animate-slide-up max-w-lg w-full"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--bg-border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full"
          style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
          <X className="w-4 h-4" />
        </button>

        {/* Image */}
        {item.imageUrl && (
          <div className="w-full max-h-72 overflow-hidden" style={{ background: 'var(--bg)' }}>
            <img
              src={item.imageUrl}
              alt={item.title}
              className={clsx('w-full max-h-72', item.displayMode === 'cover' ? 'object-cover' : 'object-contain p-4')}
            />
          </div>
        )}

        {/* Info */}
        <div className="p-5">
          <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>

          {item.categoryPath?.length > 0 && (
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              {item.categoryPath.join(' › ')}
            </p>
          )}

          {/* Prompt box */}
          <div className="rounded-xl p-3 mb-4 font-mono text-sm leading-relaxed"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>
            {item.prompt}
          </div>

          {/* Tags */}
          {item.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {item.tags.map(t => (
                <span key={t} className="text-xs px-2 py-1 rounded-lg"
                  style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'تم النسخ!' : 'نسخ المطالبة'}
            </button>
            <button onClick={handleAdd}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all text-white"
              style={{ background: added ? '#22c55e' : 'var(--accent)' }}>
              {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {added ? 'أُضيف!' : 'إضافة للبانيل'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface Props {
  item: PromptItem
  imgHeight: number
  onRefresh: () => void
  selected?: boolean
  onCardClick?: (e: React.MouseEvent) => void
  onRightClick?: (e: React.MouseEvent) => void
}

export const PromptCard = memo(function PromptCard({
  item, imgHeight, onRefresh, selected, onCardClick, onRightClick
}: Props) {
  const { user, addChip, openModal } = useStore()
  const [imgLoaded, setImgLoaded]   = useState(false)
  const [justAdded, setJustAdded]   = useState(false)
  const [preview, setPreview]       = useState(false)

  const isSmall = imgHeight < 120

  // + button → add to builder
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

  // Card click:
  // - Guest → open preview modal
  // - Admin with selection → toggle select
  // - Admin without selection → open preview
  function handleClick(e: React.MouseEvent) {
    // If ctrl/shift → pass to parent for selection
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      onCardClick?.(e)
      return
    }
    // If admin has active selection → toggle
    if (onCardClick && selected !== undefined) {
      onCardClick(e)
      return
    }
    // Default: open preview
    setPreview(true)
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

  return (
    <>
      <div
        className={clsx(
          'group relative rounded-xl overflow-hidden transition-all select-none cursor-pointer',
          'hover:shadow-lg hover:-translate-y-0.5',
          selected ? 'ring-2 ring-offset-1' : '',
          'animate-fade-in'
        )}
        style={{
          background: 'var(--bg-card)',
          border: selected ? '2px solid var(--accent)' : '2px solid var(--bg-border)',
          ...(selected ? { '--tw-ring-color': 'var(--accent)' } as any : {}),
        }}
        onClick={handleClick}
        onContextMenu={onRightClick}
      >
        {/* Selection checkbox */}
        {selected && (
          <div className="absolute top-2 left-2 z-10 w-5 h-5 rounded-md flex items-center justify-center shadow-sm pointer-events-none"
            style={{ background: 'var(--accent)' }}>
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        )}

        {/* Image */}
        <div className="relative overflow-hidden" style={{ height: imgHeight, background: 'var(--bg)' }}>
          {!imgLoaded && item.imageUrl && (
            <div className="absolute inset-0 animate-skeleton" style={{ background: 'var(--bg-border)' }} />
          )}
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} loading="lazy"
              onLoad={() => setImgLoaded(true)}
              className={clsx('w-full h-full transition-opacity duration-300',
                item.displayMode === 'cover' ? 'object-cover' : 'object-contain p-2',
                imgLoaded ? 'opacity-100' : 'opacity-0'
              )} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl" style={{ color: 'var(--text-muted)' }}>🖼</div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

          {/* ── ADD BUTTON (+ icon) ── */}
          <button
            onClick={handleAddToBuilder}
            className={clsx(
              'absolute z-10 rounded-full flex items-center justify-center transition-all shadow-xl',
              'opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100',
              isSmall
                ? 'w-7 h-7 bottom-1.5 right-1.5'
                : 'w-10 h-10 bottom-3 right-3'
            )}
            style={{ background: justAdded ? '#22c55e' : 'var(--accent)' }}
            title="إضافة للبانيل"
          >
            {justAdded
              ? <Check className={isSmall ? 'w-3 h-3 text-white' : 'w-4 h-4 text-white'} />
              : <Plus  className={isSmall ? 'w-3 h-3 text-white' : 'w-4 h-4 text-white'} />
            }
          </button>

          {/* Zoom hint for guest */}
          {!user && !isSmall && (
            <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-white"
                style={{ background: 'rgba(0,0,0,0.6)' }}>
                <ZoomIn className="w-3 h-3" /> معاينة
              </div>
            </div>
          )}

          {/* Admin actions */}
          {user?.isAdmin && !isSmall && (
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button onClick={e => { e.stopPropagation(); openModal('item', { edit: item }) }}
                className="p-1.5 rounded-lg shadow-sm backdrop-blur"
                style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--text-secondary)' }}>
                <Edit2 className="w-3 h-3" />
              </button>
              <button onClick={handleDuplicate}
                className="p-1.5 rounded-lg shadow-sm backdrop-blur"
                style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--text-secondary)' }}>
                <Copy className="w-3 h-3" />
              </button>
              <button onClick={handleDelete}
                className="p-1.5 rounded-lg shadow-sm backdrop-blur"
                style={{ background: 'rgba(255,255,255,0.9)', color: '#ef4444' }}>
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Title */}
        {!isSmall && (
          <div className="p-2">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
          </div>
        )}
      </div>

      {/* Preview modal */}
      {preview && <CardPreview item={item} onClose={() => setPreview(false)} />}
    </>
  )
})
